import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { generateUUID } from "../lib/utils";
import { ERROR_MESSAGES } from "../constants/config";

/**
 * Chat Store - Manages chat state and socket communication
 * Handles: messages, users list, selected user, typing indicators
 */
export const useChatStore = create((set, get) => ({
  // State
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  typingUsers: new Set(),
  // Pagination state
  hasMore: false,
  cursor: null,
  isLoadingMore: false,

  /**
   * Fetch all users for the sidebar
   */
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      if (!res.data || !Array.isArray(res.data)) {
        throw new Error("Invalid users data received");
      }
      set({ users: res.data });
    } catch (error) {
      console.error("Failed to fetch users:", error);
      const message = error.response?.data?.message || "Failed to load users";
      toast.error(message);
      set({ users: [] });
    } finally {
      set({ isUsersLoading: false });
    }
  },

  /**
   * Fetch messages for selected user (with pagination support)
   */
  getMessages: async (userId) => {
    if (!userId) {
      console.warn("getMessages called without userId");
      return;
    }

    set({ isMessagesLoading: true, messages: [], hasMore: false, cursor: null });
    try {
      const res = await axiosInstance.get(`/messages/${userId}?limit=50`);
      
      // Handle paginated response
      const { messages, hasMore, cursor } = res.data;
      
      if (!Array.isArray(messages)) {
        throw new Error("Invalid messages data received");
      }
      
      // Filter out messages deleted for this user
      const currentUserId = useAuthStore.getState().user?._id;
      const filteredMessages = messages.filter(msg => 
        !msg.deletedFor?.includes(currentUserId)
      );
      
      set({ 
        messages: filteredMessages,
        hasMore: hasMore || false,
        cursor: cursor || null
      });

      // Mark messages as read after loading
      get().markMessagesAsRead();
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      const message =
        error.response?.data?.message || "Failed to load messages";
      toast.error(message);
      set({ messages: [], hasMore: false, cursor: null });
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  /**
   * Load more messages (older messages)
   */
  loadMoreMessages: async () => {
    const { selectedUser, cursor, hasMore, isLoadingMore } = get();
    
    if (!selectedUser || !hasMore || isLoadingMore || !cursor) {
      return;
    }

    set({ isLoadingMore: true });
    try {
      const res = await axiosInstance.get(
        `/messages/${selectedUser._id}?before=${cursor}&limit=50`
      );
      
      const { messages: newMessages, hasMore: moreAvailable, cursor: newCursor } = res.data;
      
      if (!Array.isArray(newMessages)) {
        throw new Error("Invalid messages data received");
      }

      // Filter deleted messages
      const currentUserId = useAuthStore.getState().user?._id;
      const filteredMessages = newMessages.filter(msg => 
        !msg.deletedFor?.includes(currentUserId)
      );

      // Prepend older messages
      set(state => ({
        messages: [...filteredMessages, ...state.messages],
        hasMore: moreAvailable || false,
        cursor: newCursor || null
      }));
    } catch (error) {
      console.error("Failed to load more messages:", error);
      toast.error("Failed to load older messages");
    } finally {
      set({ isLoadingMore: false });
    }
  },

  /**
   * Send a message to selected user
   * Uses optimistic updates to show message immediately
   */
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    const currentUser = useAuthStore.getState().user;

    if (!selectedUser) {
      toast.error(ERROR_MESSAGES.NO_USER_SELECTED);
      throw new Error(ERROR_MESSAGES.NO_USER_SELECTED);
    }

    if (!messageData.text?.trim() && !messageData.image) {
      toast.error(ERROR_MESSAGES.EMPTY_MESSAGE);
      throw new Error(ERROR_MESSAGES.EMPTY_MESSAGE);
    }

    // Create optimistic message (temporary message shown immediately)
    const optimisticMessage = {
      _id: `temp-${generateUUID()}`, // Use UUID for better uniqueness
      senderId: currentUser._id,
      receiverId: selectedUser._id,
      text: messageData.text || "",
      image: messageData.image || null,
      createdAt: new Date().toISOString(),
      readBy: [],
      isPending: true, // Flag to indicate this is pending
    };

    // Optimistically add message to UI immediately
    set({ messages: [...messages, optimisticMessage] });

    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData,
      );

      // Check if we got a valid message object back
      if (!res.data || !res.data._id) {
        console.error("Invalid response from server:", res.data);
        throw new Error("Invalid response from server");
      }

      // Replace optimistic message with real message from server
      set({
        messages: messages
          .filter((msg) => msg._id !== optimisticMessage._id)
          .concat(res.data),
      });

      // Return the sent message
      return res.data;
    } catch (error) {
      console.error("Failed to send message:", error);

      // Remove optimistic message on error
      set({
        messages: messages.filter((msg) => msg._id !== optimisticMessage._id),
      });

      // Show error with details if available
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.response?.data?.details ||
        error.message ||
        "Failed to send message";

      toast.error(errorMessage);
      throw error; // Re-throw to let caller know it failed
    }
  },

  /**
   * Delete a message
   * @param {string} messageId - ID of message to delete
   * @param {boolean} deleteForEveryone - If true, deletes for both users (sender only)
   */
  deleteMessage: async (messageId, deleteForEveryone = false) => {
    const { messages } = get();
    const currentUserId = useAuthStore.getState().user?._id;

    try {
      if (deleteForEveryone) {
        // DELETE FOR EVERYONE - updates UI to show deleted state
        set({
          messages: messages.map((msg) =>
            msg._id === messageId
              ? { ...msg, isDeleted: true, text: "This message was deleted", image: "" }
              : msg
          ),
        });

        await axiosInstance.delete(`/messages/${messageId}?deleteForEveryone=true`);
      } else {
        // DELETE FOR ME - just removes from my view
        set({
          messages: messages.filter((msg) => msg._id !== messageId),
        });

        await axiosInstance.delete(`/messages/${messageId}`);
      }

      // Success
    } catch (error) {
      console.error("Failed to delete message:", error);

      // Revert optimistic update on error
      set({ messages });

      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to delete message";

      toast.error(errorMessage);
      throw error;
    }
  },

  /**
   * Subscribe to socket events for real-time messages, typing, and read receipts
   */
  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) {
      console.warn("subscribeToMessages called without selectedUser");
      return;
    }

    const socket = useAuthStore.getState().socket;
    if (!socket) {
      console.warn("Socket not available");
      return;
    }

    // New message event
    socket.on("newMessage", (newMessage) => {
      if (newMessage.senderId !== selectedUser._id) return;
      set({ messages: [...get().messages, newMessage] });
    });

    // Message deleted event
    socket.on("messageDeleted", ({ messageId }) => {
      set({
        messages: get().messages.map((msg) =>
          msg._id === messageId
            ? { ...msg, isDeleted: true, text: "This message was deleted", image: "" }
            : msg
        ),
      });
    });

    // Typing indicator - user started typing
    socket.on("userTyping", (userId) => {
      if (userId === selectedUser._id) {
        set((state) => ({
          typingUsers: new Set([...state.typingUsers, userId]),
        }));
      }
    });

    // Typing indicator - user stopped typing
    socket.on("userStopTyping", (userId) => {
      if (userId === selectedUser._id) {
        set((state) => {
          const newTyping = new Set(state.typingUsers);
          newTyping.delete(userId);
          return { typingUsers: newTyping };
        });
      }
    });

    // Messages read receipts
    socket.on("messagesRead", (readerId) => {
      if (readerId !== selectedUser._id) return;

      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.senderId === useAuthStore.getState().user?._id
            ? {
                ...msg,
                readBy: [...new Set([...(msg.readBy || []), readerId])],
              }
            : msg
        ),
      }));
    });
  },

  /**
   * Unsubscribe from all socket events when changing users
   */
  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.off("messageDeleted");
    socket.off("userTyping");
    socket.off("userStopTyping");
    socket.off("messagesRead");
  },

  /**
   * Set the selected user for chatting
   */
  setSelectedUser: (selectedUser) => {
    // Cleanup old subscriptions
    get().unsubscribeFromMessages();
    // Clear typing users
    set({ selectedUser, typingUsers: new Set() });
  },

  /**
   * Emit typing indicator to selected user
   */
  startTyping: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket?.connected) {
      console.warn("Socket not connected");
      return;
    }

    socket.emit("typing", selectedUser._id);
  },

  /**
   * Stop typing indicator for selected user
   */
  stopTyping: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket?.connected) return;

    socket.emit("stopTyping", selectedUser._id);
  },

  /**
   * Clear all messages with the selected user
   */
  clearChat: async () => {
    const { selectedUser, messages } = get();
    
    if (!selectedUser) {
      toast.error("No user selected");
      return;
    }

    try {
      // Optimistically clear messages
      const previousMessages = messages;
      set({ messages: [] });

      const res = await axiosInstance.delete(`/messages/clear/${selectedUser._id}`);
      
      toast.success(res.data.message || "Chat cleared successfully");
    } catch (error) {
      console.error("Failed to clear chat:", error);
      
      // Revert on error
      set({ messages: get().messages });
      
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to clear chat";
      
      toast.error(errorMessage);
      throw error;
    }
  },

  /**
   * Delete multiple messages at once
   * @param {string[]} messageIds - Array of message IDs to delete
   */
  batchDeleteMessages: async (messageIds) => {
    const { messages } = get();

    if (!messageIds || messageIds.length === 0) {
      toast.error("No messages selected");
      return;
    }

    try {
      // Optimistically remove messages
      const previousMessages = messages;
      set({
        messages: messages.filter((msg) => !messageIds.includes(msg._id)),
      });

      const res = await axiosInstance.post("/messages/batch-delete", {
        messageIds,
      });

      toast.success(res.data.message || `Deleted ${messageIds.length} messages`);
    } catch (error) {
      console.error("Failed to delete messages:", error);

      // Revert on error
      set({ messages: get().messages });

      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to delete messages";

      toast.error(errorMessage);
      throw error;
    }
  },

  /**
   * Emit mark messages as read event
   */
  markMessagesAsRead: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket?.connected) {
      console.warn("Socket not connected when marking messages as read");
      return;
    }

    socket.emit("markMessagesAsRead", selectedUser._id);
  },
}));
