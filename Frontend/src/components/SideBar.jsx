import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useChatStore } from "../Store/useChatStore";
import { useAuthStore } from "../Store/useAuthStore";
import { useFriendStore } from "../Store/useFriendStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import FriendsModal from "./FriendsModal";
import { Users, Search, UserPlus } from "lucide-react";

/**
 * Helper function to format last seen time
 */
const getTimeAgo = (date) => {
  if (!date) return "Offline";
  const now = new Date();
  const lastSeenDate = new Date(date);
  const seconds = Math.floor((now - lastSeenDate) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return "Offline";
};

/**
 * UserItem - Displays individual user in sidebar
 * Memoized to prevent unnecessary re-renders when users list updates
 */
const UserItem = React.memo(
  ({ user, isSelected, isOnline, isTyping, onSelect }) => (
    <button
      onClick={() => onSelect(user)}
      className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors rounded-lg ${
        isSelected ? "bg-base-300 ring-1 ring-base-300" : ""
      }`}
      aria-label={`Chat with ${user.fullname}`}
      aria-current={isSelected ? "true" : "false"}
    >
      {/* Avatar with online indicator */}
      <div className="relative flex-shrink-0">
        <img
          src={user.profilePic || "/avatar.png"}
          alt={user.fullname}
          className="size-12 object-cover rounded-full"
          loading="lazy"
        />
        {isOnline && (
          <span
            className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-base-100 animate-pulse"
            aria-label="Online"
          />
        )}
      </div>

      {/* User info - visible on all screens now that sidebar is full width on mobile */}
      <div className="text-left min-w-0 flex-1 block">
        <div className="font-medium truncate">{user.fullname}</div>
        <div className="text-sm text-base-content/60">
          {isTyping ? (
            <span className="text-primary font-medium animate-pulse">
              typing...
            </span>
          ) : isOnline ? (
            <div className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              <span className="text-green-600 font-medium">Online</span>
            </div>
          ) : (
            <span className="text-xs text-base-content/50">
              {user.lastSeen
                ? `Last seen ${getTimeAgo(user.lastSeen)}`
                : "Offline"}
            </span>
          )}
        </div>
      </div>
    </button>
  ),
);

UserItem.displayName = "UserItem";

const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
    typingUsers,
  } = useChatStore();
  const { onlineUsers, socket } = useAuthStore();
  const {
    pendingRequests,
    fetchPendingRequests,
    subscribeToFriendEvents,
    unsubscribeFromFriendEvents,
  } = useFriendStore();

  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);

  // Fetch users and pending requests on component mount
  useEffect(() => {
    getUsers();
    fetchPendingRequests();
  }, [getUsers, fetchPendingRequests]);

  // Subscribe to real-time friend socket events
  useEffect(() => {
    if (socket) {
      subscribeToFriendEvents();
      return () => {
        unsubscribeFromFriendEvents();
      };
    }
  }, [socket, subscribeToFriendEvents, unsubscribeFromFriendEvents]);

  // Filter users based on online status and search query
  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matchesOnline = showOnlineOnly
          ? onlineUsers.includes(user._id)
          : true;
        const matchesSearch = user.fullname
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        return matchesOnline && matchesSearch;
      }),
    [users, onlineUsers, showOnlineOnly, searchQuery],
  );

  // Memoize the callback to prevent unnecessary re-renders of UserItem
  const handleSelectUser = useCallback(
    (user) => {
      setSelectedUser(user);
    },
    [setSelectedUser],
  );

  // Handle online filter toggle
  const handleToggleOnlineOnly = useCallback((e) => {
    setShowOnlineOnly(e.target.checked);
  }, []);

  if (isUsersLoading) return <SidebarSkeleton />;

  const onlineCount = Math.max(0, onlineUsers.length - 1);

  return (
    <>
      <aside className="h-full min-h-0 w-full lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
        {/* Header */}
        <div className="border-b border-base-300 w-full p-4 sm:p-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="size-6 flex-shrink-0" />
              <span className="font-medium block">Contacts</span>
            </div>

            {/* Add Contact / Friends Button */}
            <button
              onClick={() => setIsFriendsModalOpen(true)}
              className="btn btn-sm btn-ghost btn-circle relative text-primary hover:bg-primary/10"
              title="Add contact or view friend requests"
              aria-label="Add Contact"
            >
              <UserPlus className="size-5" />
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 size-4 bg-error text-error-content rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </div>

          {/* Online filter toggle */}
          <div className="mt-3 flex items-center gap-2">
            <label className="cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={handleToggleOnlineOnly}
                className="checkbox checkbox-sm"
                aria-label="Show online users only"
              />
              <span className="text-sm">Show online only</span>
            </label>
            <span className="text-xs text-base-content/70 flex-shrink-0">
              ({onlineCount} online)
            </span>
          </div>

          {/* Search Input */}
          <div className="mt-3 relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="size-4 text-base-content/50" />
            </div>
            <input
              type="text"
              placeholder="Search contacts..."
              className="input input-sm input-bordered w-full pl-10 bg-base-100"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Users list */}
        <div className="flex-1 min-h-0 overflow-y-auto w-full p-2 sm:py-3">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <UserItem
                key={user._id}
                user={user}
                isSelected={selectedUser?._id === user._id}
                isOnline={onlineUsers.includes(user._id)}
                isTyping={typingUsers.has(user._id)}
                onSelect={handleSelectUser}
              />
            ))
          ) : (
            <div className="text-center text-base-content/60 py-8 px-4">
              {showOnlineOnly ? (
                <p className="text-sm">No online users</p>
              ) : searchQuery ? (
                <p className="text-sm">
                  No contacts matching &quot;{searchQuery}&quot;
                </p>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm font-medium">No contacts yet</p>
                  <p className="text-xs text-base-content/50 max-w-[200px]">
                    Add contacts to start chatting with your friends.
                  </p>
                  <button
                    onClick={() => setIsFriendsModalOpen(true)}
                    className="btn btn-primary btn-sm gap-2 mt-1"
                  >
                    <UserPlus className="size-4" />
                    Add Contact
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Friends & Requests Modal */}
      <FriendsModal
        isOpen={isFriendsModalOpen}
        onClose={() => setIsFriendsModalOpen(false)}
      />
    </>
  );
};

export default Sidebar;
