import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";

// Constants
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.MODE === "production"
    ? window.location.origin
    : "http://localhost:5001");
const ALLOWED_PROFILE_FIELDS = ["fullname", "profilePic", "phone", "bio"];

/**
 * Authentication Store - Manages user authentication and socket connection
 */
export const useAuthStore = create((set, get) => ({
  // State
  user: null,
  isSignedIn: false,
  isLoggingIn: false,
  isSigningUp: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  /**
   * Check authentication status - verify session with backend
   * Restores session from localStorage if available
   */
  checkAuth: async () => {
    set({ isCheckingAuth: true });

    try {
      const res = await axiosInstance.get("/auth/checkAuth");

      const userData = res.data.user || res.data;
      if (!userData || !userData._id) {
        throw new Error("Invalid user data from server");
      }

      set({
        user: userData,
        isSignedIn: true,
      });

      // Persist user to localStorage
      localStorage.setItem("user", JSON.stringify(userData));
      get().connectSocket();
    } catch (err) {
      console.error("checkAuth error:", err.message);
      set({
        user: null,
        isSignedIn: false,
      });
      localStorage.removeItem("user");
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  /**
   * Restore session from localStorage (synchronously)
   * Used for quick UI restoration before server verification
   */
  restoreSession: () => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        if (userData && userData._id) {
          set({
            user: userData,
            isSignedIn: true,
          });
          return true;
        }
      }
    } catch (err) {
      console.error("Failed to restore session:", err);
      localStorage.removeItem("user");
    }
    return false;
  },

  /**
   * Sign up new user
   */
  signUp: async (data) => {
    set({ isSigningUp: true });

    try {
      // Validate input
      if (!data.email || !data.password) {
        throw new Error("Email and password are required");
      }

      const payload = {
        fullname: data.fullName || data.fullname || "",
        email: data.email.trim(),
        password: data.password,
      };

      const res = await axiosInstance.post("/auth/signup", payload);

      const userData = res.data.user || res.data;
      if (!userData || !userData._id) {
        throw new Error("Invalid response from server");
      }

      set({
        user: userData,
        isSignedIn: true,
      });

      localStorage.setItem("user", JSON.stringify(userData));
      get().connectSocket();

      toast.success(res.data?.message || "Account created successfully!");
      return true;
    } catch (error) {
      console.error("signUp error:", error);
      const message =
        error.response?.data?.message || error.message || "Signup failed";
      toast.error(message);
      return false;
    } finally {
      set({ isSigningUp: false });
    }
  },

  /**
   * Login user
   */
  login: async (data) => {
    set({ isLoggingIn: true });

    try {
      // Validate input
      if (!data.email || !data.password) {
        throw new Error("Email and password are required");
      }

      const payload = {
        email: data.email.trim(),
        password: data.password,
      };

      const res = await axiosInstance.post("/auth/login", payload);

      const userData = res.data.user || res.data;
      if (!userData || !userData._id) {
        throw new Error("Invalid response from server");
      }

      set({
        user: userData,
        isSignedIn: true,
      });

      localStorage.setItem("user", JSON.stringify(userData));
      get().connectSocket();

      toast.success("Signed in successfully");
      return true;
    } catch (error) {
      console.error("login error:", error);
      const message =
        error.response?.data?.message || error.message || "Login failed";
      toast.error(message);
      return false;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  /**
   * Logout user
   */
  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
    } catch (err) {
      console.error("logout error:", err);
    } finally {
      set({
        user: null,
        isSignedIn: false,
      });
      localStorage.removeItem("user");
      get().disconnectSocket();
    }
  },

  /**
   * Update user profile
   * Only allows updating safe fields to prevent XSS/injection
   */
  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });

    try {
      if (!data || Object.keys(data).length === 0) {
        throw new Error("No fields to update");
      }

      // Filter to allowed fields only
      const payload = {};
      ALLOWED_PROFILE_FIELDS.forEach((field) => {
        if (data[field] !== undefined) {
          payload[field] = data[field];
        }
      });

      if (Object.keys(payload).length === 0) {
        throw new Error("No valid fields to update");
      }

      const res = await axiosInstance.put("/auth/update-profile", payload);

      const updatedUser = res.data.user || res.data;
      if (!updatedUser || !updatedUser._id) {
        throw new Error("Invalid response from server");
      }

      set({ user: updatedUser });

      // Update localStorage
      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast.success("Profile updated successfully!");
      return true;
    } catch (err) {
      console.error("updateProfile error:", err);
      const message =
        err.response?.data?.message ||
        err.message ||
        "Failed to update profile";
      toast.error(message);
      return false;
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  /**
   * Delete user account
   */
  deleteAccount: async () => {
    set({ isLoggingIn: true }); // Use isLoggingIn to show global loading state if needed
    try {
      await axiosInstance.delete("/auth/delete-account");
      set({ user: null, isSignedIn: false });
      localStorage.removeItem("user");
      get().disconnectSocket();
      toast.success("Account deleted successfully");
      return true;
    } catch (error) {
      console.error("deleteAccount error:", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to delete account";
      toast.error(message);
      return false;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  /**
   * Establish socket connection to backend
   */
  connectSocket: () => {
    const { user, socket } = get();

    // Don't create new connection if already connected
    if (!user || socket?.connected) {
      console.log("Socket already connected or user not available");
      return;
    }

    try {
      const newSocket = io(SOCKET_URL, {
        query: { userId: user._id },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      newSocket.on("connect", () => {
        console.log("Socket connected:", newSocket.id);
      });

      newSocket.on("getOnlineUsers", (userIds) => {
        console.log("Online users updated:", userIds);
        set({ onlineUsers: Array.isArray(userIds) ? userIds : [] });
      });

      newSocket.on("userTyping", (senderId) => {
        console.log("User typing event received for:", senderId);
      });

      newSocket.on("userStopTyping", (senderId) => {
        console.log("User stop typing event received for:", senderId);
      });

      newSocket.on("disconnect", () => {
        console.log("Socket disconnected");
      });

      newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
      });

      set({ socket: newSocket });
      console.log("Socket connection established");
    } catch (err) {
      console.error("Failed to connect socket:", err);
    }
  },

  /**
   * Disconnect socket connection
   */
  disconnectSocket: () => {
    const { socket } = get();
    if (socket?.connected) {
      socket.disconnect();
    }
  },
}));
