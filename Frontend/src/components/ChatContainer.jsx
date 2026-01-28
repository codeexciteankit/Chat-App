import React, { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { useChatStore } from "../Store/useChatStore";
import { useAuthStore } from "../Store/useAuthStore";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { formatMessageTime, formatMessageDate } from "../lib/utils";
import { Trash2 } from "lucide-react";

// Memoized message item component for performance
const MessageItem = React.memo(
  ({ message, authUser, selectedUser, isDifferentDate, onDelete, isSelectMode, isSelected, onToggleSelect }) => {
    const [showDelete, setShowDelete] = useState(false);
    const isSender = message.senderId === authUser._id;

    // Sender can delete for everyone within 24 hours
    const canDeleteForEveryone = isSender && 
      !message.isDeleted && 
      (Date.now() - new Date(message.createdAt).getTime() < 24 * 60 * 60 * 1000);

    // Receiver can always delete for themselves
    const canDeleteForMe = !isSender && !message.isDeleted;

    // Show delete button if either option is available
    const canDelete = canDeleteForEveryone || canDeleteForMe;

    const handleDelete = () => {
      if (canDeleteForEveryone) {
        // Sender deleting their own message
        if (window.confirm("Delete this message for everyone?\n\nBoth you and the recipient will no longer see this message.")) {
          onDelete(message._id, true); // deleteForEveryone = true
        }
      } else if (canDeleteForMe) {
        // Receiver deleting someone else's message
        if (window.confirm("Delete this message for you?\n\nThis will only remove the message from your view. The sender will still see it.")) {
          onDelete(message._id, false); // deleteForEveryone = false
        }
      }
    };

    return (
      <>
        {isDifferentDate && (
          <div className="chat-date text-center opacity-50 text-xs font-bold my-4 divider">
            {formatMessageDate(message.createdAt)}
          </div>
        )}
        <div
          className={`chat ${isSender ? "chat-end" : "chat-start"} group relative`}
          onMouseEnter={() => setShowDelete(true)}
          onMouseLeave={() => setShowDelete(false)}
        >
          {/* Checkbox for select mode */}
          {isSelectMode && !message.isDeleted && (
            <div className={`absolute ${isSender ? 'left-0' : 'right-0'} top-1/2 -translate-y-1/2 z-10`}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(message._id)}
                className="checkbox checkbox-primary checkbox-sm"
              />
            </div>
          )}
          
          <div className="chat-image avatar">
            <div className="size-10 rounded-full border">
              <img
                src={
                  isSender
                    ? authUser.profilePic || "/avatar.png"
                    : selectedUser.profilePic || "/avatar.png"
                }
                alt="profile pic"
                loading="lazy"
              />
            </div>
          </div>
          <div className="chat-header mb-1">
            <time className="text-xs opacity-50 ml-1">
              {formatMessageTime(message.createdAt)}
            </time>
          </div>
          <div className="chat-bubble flex flex-col relative">
            {message.isDeleted ? (
              <p className="italic opacity-60">
                <span className="text-xs">🗑️</span> This message was deleted
              </p>
            ) : (
              <>
                {message.image && (
                  <div className="relative group mb-2">
                    <img
                      src={message.image}
                      alt="Attachment"
                      className="sm:max-w-[200px] rounded-md cursor-pointer"
                      loading="lazy"
                      onClick={() => window.open(message.image, "_blank")}
                    />
                    <a
                      href={message.image}
                      download={`image-${message.createdAt}.jpg`}
                      className="absolute bottom-2 right-2 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </a>
                  </div>
                )}
                {message.text && <p>{message.text}</p>}
              </>
            )}
            
            {/* Delete button - for sender (delete for everyone) OR receiver (delete for me) - hide in select mode */}
            {canDelete && !isSelectMode && (
              <button
                onClick={handleDelete}
                className={`absolute ${isSender ? '-left-10' : '-right-10'} top-2 p-2 rounded-full ${
                  canDeleteForEveryone ? 'bg-error/80 hover:bg-error' : 'bg-warning/80 hover:bg-warning'
                } text-white transition-all ${
                  showDelete ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                }`}
                title={canDeleteForEveryone ? "Delete for everyone" : "Delete for me"}
                style={{ pointerEvents: showDelete ? 'auto' : 'none' }}
              >
                <Trash2 className="size-4" />
              </button>
            )}

            {isSender && (
              <div className="text-xs opacity-70 mt-1 text-right">
                {message.readBy?.includes(selectedUser._id)
                  ? "✓✓ Read"
                  : "✓ Sent"}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
);

MessageItem.displayName = "MessageItem";

// Memoized typing indicator component
const TypingIndicator = React.memo(({ selectedUser }) => (
  <div className="chat chat-start">
    <div className="chat-image avatar">
      <div className="size-10 rounded-full border">
        <img
          src={selectedUser.profilePic || "/avatar.png"}
          alt="profile pic"
          loading="lazy"
        />
      </div>
    </div>
    <div className="chat-bubble">
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    </div>
  </div>
));

TypingIndicator.displayName = "TypingIndicator";

// Chat header component
const ChatHeader = React.memo(({ onClearChat, onToggleSelectMode, isSelectMode, selectedCount }) => {
  const { selectedUser, setSelectedUser, typingUsers } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const isTyping = typingUsers.has(selectedUser._id);
  const isOnline = onlineUsers.includes(selectedUser._id);

  const handleClearChat = () => {
    if (window.confirm("Clear all messages with this user?\n\nThis will delete all messages from your view only. The other person will still see them.")) {
      onClearChat();
    }
  };

  return (
    <div className="p-2.5 border-b border-base-300 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="size-10 rounded-full">
              <img
                src={selectedUser.profilePic || "/avatar.png"}
                alt={selectedUser.fullname}
                loading="lazy"
              />
            </div>
          </div>
          <div>
            <h3 className="font-medium">{selectedUser.fullname}</h3>
            <p className="text-xs text-base-content/70">
              {isTyping ? "Typing..." : isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Selection mode indicator */}
          {isSelectMode && (
            <span className="text-sm font-medium text-primary px-3 py-1 rounded-full bg-primary/10">
              {selectedCount} selected
            </span>
          )}
          
          {/* Select Messages button */}
          <button
            onClick={onToggleSelectMode}
            className={`btn btn-sm ${isSelectMode ? 'btn-primary' : 'btn-ghost'}`}
            title={isSelectMode ? "Cancel selection" : "Select messages"}
          >
            {isSelectMode ? "Cancel" : "Select"}
          </button>
          
          {/* Clear Chat button */}
          <button
            onClick={handleClearChat}
            className="btn btn-sm btn-ghost"
            title="Clear chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
          
          {/* Close button */}
          <button
            onClick={() => setSelectedUser(null)}
            className="text-xl hover:opacity-70"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
});

ChatHeader.displayName = "ChatHeader";

// Main chat container
const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    markMessagesAsRead,
    deleteMessage,
    clearChat,
    batchDeleteMessages,
    typingUsers,
  } = useChatStore();
  const { user: authUser } = useAuthStore();

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const hasMarkedAsReadRef = useRef(false);
  
  // Select mode state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState(new Set());

  // Handle message deletion
  const handleDeleteMessage = useCallback(
    async (messageId, deleteForEveryone = false) => {
      try {
        await deleteMessage(messageId, deleteForEveryone);
      } catch (error) {
        // Error already handled in store
      }
    },
    [deleteMessage]
  );

  // Handle clear chat
  const handleClearChat = useCallback(async () => {
    try {
      await clearChat();
    } catch (error) {
      // Error already handled in store
    }
  }, [clearChat]);

  // Toggle select mode
  const handleToggleSelectMode = useCallback(() => {
    setIsSelectMode((prev) => !prev);
    setSelectedMessageIds(new Set()); // Clear selection when toggling
  }, []);

  // Toggle message selection
  const handleToggleMessageSelect = useCallback((messageId) => {
    setSelectedMessageIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  }, []);

  // Handle batch delete
  const handleBatchDelete = useCallback(async () => {
    if (selectedMessageIds.size === 0) {
      return;
    }

    if (window.confirm(`Delete ${selectedMessageIds.size} selected message(s)?\n\nThis will delete them from your view only.`)) {
      try {
        await batchDeleteMessages(Array.from(selectedMessageIds));
        setSelectedMessageIds(new Set());
        setIsSelectMode(false);
      } catch (error) {
        // Error already handled in store
      }
    }
  }, [selectedMessageIds, batchDeleteMessages]);

  // Reset select mode when changing users
  useEffect(() => {
    setIsSelectMode(false);
    setSelectedMessageIds(new Set());
  }, [selectedUser._id]);

  // Load messages and subscribe
  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();
    shouldAutoScrollRef.current = true;
    hasMarkedAsReadRef.current = false; // Reset when changing users

    return () => unsubscribeFromMessages();
  }, [
    selectedUser._id,
    getMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  // Mark messages as read - OPTIMIZED to only call when necessary
  useEffect(() => {
    const currentMessageCount = messages.length;
    const isNewMessage = currentMessageCount > previousMessageCountRef.current;
    const hasUnreadMessages = messages.some(
      (msg) => msg.senderId === selectedUser._id && !msg.readBy?.includes(authUser._id)
    );

    // Only mark as read if:
    // 1. First time loading chat (!hasMarkedAsReadRef.current), OR
    // 2. New message received (isNewMessage) AND has unread messages
    if ((!hasMarkedAsReadRef.current || isNewMessage) && hasUnreadMessages) {
      markMessagesAsRead();
      hasMarkedAsReadRef.current = true;
    }

    previousMessageCountRef.current = currentMessageCount;
  }, [messages, selectedUser._id, authUser._id, markMessagesAsRead]);

  // Smart scroll: auto-scroll only if user is at bottom
  useEffect(() => {
    if (shouldAutoScrollRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Handle scroll to detect user position (throttled)
  const handleScroll = useCallback((e) => {
    const { scrollHeight, scrollTop, clientHeight } = e.currentTarget;
    // User is near bottom if within 50px
    shouldAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
  }, []);

  // Memoize message groups to avoid recalculations
  const messageGroups = useMemo(() => {
    return messages.map((message, idx) => ({
      ...message,
      isDifferentDate:
        idx === 0 ||
        formatMessageDate(messages[idx - 1].createdAt) !==
          formatMessageDate(message.createdAt),
    }));
  }, [messages]);

  if (isMessagesLoading) {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden bg-base-100">
        <ChatHeader 
          onClearChat={handleClearChat}
          onToggleSelectMode={handleToggleSelectMode}
          isSelectMode={isSelectMode}
          selectedCount={selectedMessageIds.size}
        />
        <div className="flex-1 overflow-hidden">
          <MessageSkeleton />
        </div>
        <div className="flex-shrink-0">
          <MessageInput />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-base-100 relative">
      {/* Chat Header - Fixed */}
      <div className="flex-shrink-0">
        <ChatHeader 
          onClearChat={handleClearChat}
          onToggleSelectMode={handleToggleSelectMode}
          isSelectMode={isSelectMode}
          selectedCount={selectedMessageIds.size}
        />
      </div>

      {/* Messages Area - Scrollable */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-base-content/50">
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-sm">Send a message to start the conversation!</p>
          </div>
        ) : (
          <>
            {messageGroups.map((message) => (
              <MessageItem
                key={message._id}
                message={message}
                authUser={authUser}
                selectedUser={selectedUser}
                isDifferentDate={message.isDifferentDate}
                onDelete={handleDeleteMessage}
                isSelectMode={isSelectMode}
                isSelected={selectedMessageIds.has(message._id)}
                onToggleSelect={handleToggleMessageSelect}
              />
            ))}
            {typingUsers.has(selectedUser._id) && (
              <TypingIndicator selectedUser={selectedUser} />
            )}
            <div ref={messagesEndRef} className="h-0" />
          </>
        )}
      </div>

      {/* Floating Delete Button for Selected Messages */}
      {isSelectMode && selectedMessageIds.size > 0 && (
        <div className="absolute bottom-20 right-6 z-20">
          <button
            onClick={handleBatchDelete}
            className="btn btn-error btn-circle btn-lg shadow-lg hover:scale-110 transition-transform"
            title={`Delete ${selectedMessageIds.size} selected message(s)`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Message Input - Fixed */}
      <div className="flex-shrink-0 border-t border-base-300">
        <MessageInput />
      </div>
    </div>
  );
};

export default ChatContainer;
