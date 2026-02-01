import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useChatStore } from "../Store/useChatStore";
import { useAuthStore } from "../Store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users } from "lucide-react";

/**
 * UserItem - Displays individual user in sidebar
 * Memoized to prevent unnecessary re-renders when users list updates
 */
const UserItem = React.memo(({ user, isSelected, isOnline, onSelect }) => (
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
          className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-base-100"
          aria-label="Online"
        />
      )}
    </div>

    {/* User info - visible on all screens now that sidebar is full width on mobile */}
    <div className="text-left min-w-0 flex-1 block">
      <div className="font-medium truncate">{user.fullname}</div>
      <div className="text-sm text-base-content/60">
        {isOnline ? "Online" : "Offline"}
      </div>
    </div>
  </button>
));

UserItem.displayName = "UserItem";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } =
    useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  // Fetch users on component mount
  useEffect(() => {
    getUsers();
  }, [getUsers]);

  // Filter users based on online status
  const filteredUsers = useMemo(
    () =>
      showOnlineOnly
        ? users.filter((user) => onlineUsers.includes(user._id))
        : users,
    [users, onlineUsers, showOnlineOnly],
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
    <aside className="h-full w-full lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      {/* Header */}
      <div className="border-b border-base-300 w-full p-5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Users className="size-6 flex-shrink-0" />
          <span className="font-medium block">Contacts</span>
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
      </div>

      {/* Users list */}
      <div className="flex-1 overflow-y-auto w-full py-3">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <UserItem
              key={user._id}
              user={user}
              isSelected={selectedUser?._id === user._id}
              isOnline={onlineUsers.includes(user._id)}
              onSelect={handleSelectUser}
            />
          ))
        ) : (
          <div className="text-center text-base-content/50 py-8">
            {showOnlineOnly ? "No online users" : "No users available"}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
