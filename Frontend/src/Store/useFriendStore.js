import { create } from "zustand";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { useChatStore } from "./useChatStore";

export const useFriendStore = create((set) => ({
  pendingRequests: [],
  searchResults: [],
  isSearching: false,
  isRequestsLoading: false,
  actionLoadingId: null,

  /**
   * Fetch all pending friend requests received by the current user
   */
  fetchPendingRequests: async () => {
    set({ isRequestsLoading: true });
    try {
      const res = await axiosInstance.get("/friends/requests/pending");
      set({ pendingRequests: Array.isArray(res.data) ? res.data : [] });
    } catch (error) {
      console.error("Failed to fetch pending friend requests:", error);
    } finally {
      set({ isRequestsLoading: false });
    }
  },

  /**
   * Search users by name or email
   */
  searchUsers: async (query) => {
    if (!query || !query.trim()) {
      set({ searchResults: [], isSearching: false });
      return;
    }

    set({ isSearching: true });
    try {
      const res = await axiosInstance.get(
        `/friends/search?query=${encodeURIComponent(query.trim())}`,
      );
      set({ searchResults: Array.isArray(res.data) ? res.data : [] });
    } catch (error) {
      console.error("Failed to search users:", error);
      toast.error(error.response?.data?.error || "Failed to search users");
      set({ searchResults: [] });
    } finally {
      set({ isSearching: false });
    }
  },

  /**
   * Clear search results
   */
  clearSearch: () => {
    set({ searchResults: [], isSearching: false });
  },

  /**
   * Send a friend request to a user
   */
  sendFriendRequest: async (receiverId) => {
    set({ actionLoadingId: receiverId });
    try {
      await axiosInstance.post(`/friends/request/${receiverId}`);
      toast.success("Friend request sent!");

      // Update local search results state
      set((state) => ({
        searchResults: state.searchResults.map((u) =>
          u._id === receiverId ? { ...u, relationship: "pending_sent" } : u,
        ),
      }));
    } catch (error) {
      console.error("Failed to send friend request:", error);
      const msg =
        error.response?.data?.error || "Failed to send friend request";
      toast.error(msg);
    } finally {
      set({ actionLoadingId: null });
    }
  },

  /**
   * Accept an incoming friend request
   */
  acceptFriendRequest: async (requestId, friendUserId) => {
    set({ actionLoadingId: requestId });
    try {
      await axiosInstance.put(`/friends/accept/${requestId}`);
      toast.success("Friend request accepted!");

      // Remove from pending requests
      set((state) => ({
        pendingRequests: state.pendingRequests.filter(
          (req) => req._id !== requestId,
        ),
        searchResults: state.searchResults.map((u) =>
          u._id === friendUserId || u.requestId === requestId
            ? { ...u, relationship: "friends" }
            : u,
        ),
      }));

      // Immediately refresh chat sidebar contacts
      useChatStore.getState().getUsers();
    } catch (error) {
      console.error("Failed to accept friend request:", error);
      const msg =
        error.response?.data?.error || "Failed to accept friend request";
      toast.error(msg);
    } finally {
      set({ actionLoadingId: null });
    }
  },

  /**
   * Unfriend / remove an existing friend
   */
  unfriendUser: async (friendId) => {
    set({ actionLoadingId: friendId });
    try {
      await axiosInstance.delete(`/friends/${friendId}`);
      toast.success("Removed from friends");

      // Update search results immediately
      set((state) => ({
        searchResults: state.searchResults.map((u) =>
          u._id === friendId
            ? { ...u, relationship: "none", requestId: null }
            : u,
        ),
      }));

      // Refresh chat sidebar contacts
      useChatStore.getState().getUsers();
    } catch (error) {
      console.error("Failed to unfriend user:", error);
      const msg = error.response?.data?.error || "Failed to remove friend";
      toast.error(msg);
    } finally {
      set({ actionLoadingId: null });
    }
  },

  /**
   * Reject / decline an incoming friend request
   */
  rejectFriendRequest: async (requestId) => {
    set({ actionLoadingId: requestId });
    try {
      await axiosInstance.delete(`/friends/reject/${requestId}`);
      toast.success("Friend request declined");

      // Remove from pending requests
      set((state) => ({
        pendingRequests: state.pendingRequests.filter(
          (req) => req._id !== requestId,
        ),
        searchResults: state.searchResults.map((u) =>
          u.requestId === requestId
            ? { ...u, relationship: "none", requestId: null }
            : u,
        ),
      }));
    } catch (error) {
      console.error("Failed to reject friend request:", error);
      const msg =
        error.response?.data?.error || "Failed to reject friend request";
      toast.error(msg);
    } finally {
      set({ actionLoadingId: null });
    }
  },

  /**
   * Subscribe to Socket.io friend events
   */
  subscribeToFriendEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newFriendRequest");
    socket.off("friendRequestAccepted");
    socket.off("friendRequestRejected");
    socket.off("unfriended");

    socket.on("newFriendRequest", (request) => {
      const senderName = request.senderId?.fullname || "Someone";
      toast(`${senderName} sent you a friend request!`, { icon: "👋" });

      set((state) => {
        // Prevent duplicates
        const exists = state.pendingRequests.some((r) => r._id === request._id);
        if (exists) return state;
        return { pendingRequests: [request, ...state.pendingRequests] };
      });
    });

    socket.on("friendRequestAccepted", (request) => {
      const currentUserId = useAuthStore.getState().user?._id;
      const otherUser =
        request.senderId?._id === currentUserId
          ? request.receiverId
          : request.senderId;
      const otherName = otherUser?.fullname || "Your contact";

      toast.success(`${otherName} accepted your friend request!`, {
        icon: "🎉",
      });

      // Update pending requests if any
      set((state) => ({
        pendingRequests: state.pendingRequests.filter(
          (r) => r._id !== request._id,
        ),
      }));

      // Refresh friends in sidebar
      useChatStore.getState().getUsers();
    });

    socket.on("friendRequestRejected", ({ requestId }) => {
      set((state) => ({
        pendingRequests: state.pendingRequests.filter(
          (r) => r._id !== requestId,
        ),
      }));
    });

    socket.on("unfriended", () => {
      // Reset any search results that showed "friends" status,
      // since we don't know which user was removed from here.
      // Re-searching will get fresh relationship statuses.
      set((state) => ({
        searchResults: state.searchResults.map((u) =>
          u.relationship === "friends"
            ? { ...u, relationship: "none", requestId: null }
            : u,
        ),
      }));
      // Refresh sidebar contacts list
      useChatStore.getState().getUsers();
    });
  },

  /**
   * Unsubscribe from Socket.io friend events
   */
  unsubscribeFromFriendEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newFriendRequest");
    socket.off("friendRequestAccepted");
    socket.off("friendRequestRejected");
    socket.off("unfriended");
  },
}));
