import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  UserPlus,
  UserCheck,
  UserMinus,
  Clock,
  Check,
  Users,
  Loader2,
} from "lucide-react";
import { useFriendStore } from "../Store/useFriendStore";
import { useAuthStore } from "../Store/useAuthStore";

const FriendsModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("search"); // 'search' | 'requests'
  const [searchQuery, setSearchQuery] = useState("");

  const {
    pendingRequests,
    searchResults,
    isSearching,
    isRequestsLoading,
    actionLoadingId,
    fetchPendingRequests,
    searchUsers,
    clearSearch,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    unfriendUser,
  } = useFriendStore();

  const { onlineUsers } = useAuthStore();

  // Load requests when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPendingRequests();
    } else {
      setSearchQuery("");
      clearSearch();
    }
  }, [isOpen, fetchPendingRequests, clearSearch]);

  // Handle live search with debounce
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery);
      } else {
        clearSearch();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, searchUsers, clearSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-base-300 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-base-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Users className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Manage Contacts</h2>
              <p className="text-xs text-base-content/60">
                Find friends and manage friend requests
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-circle btn-sm"
            aria-label="Close modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="tabs tabs-boxed bg-base-200 m-4 mb-2 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("search")}
            className={`tab flex-1 gap-2 font-medium transition-all ${
              activeTab === "search" ? "tab-active bg-base-100 shadow-sm" : ""
            }`}
          >
            <UserPlus className="size-4" />
            <span>Add Contact</span>
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`tab flex-1 gap-2 font-medium transition-all relative ${
              activeTab === "requests" ? "tab-active bg-base-100 shadow-sm" : ""
            }`}
          >
            <Clock className="size-4" />
            <span>Friend Requests</span>
            {pendingRequests.length > 0 && (
              <span className="badge badge-primary badge-sm font-bold">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Search and Add Friends */}
        {activeTab === "search" && (
          <div className="p-4 pt-2 flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Search Input */}
            <div className="relative mb-3">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base-content/50">
                <Search className="size-4" />
              </div>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="input input-bordered input-sm sm:input-md w-full pl-10 pr-10 bg-base-200 focus:bg-base-100"
              />
              {isSearching && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <Loader2 className="size-4 animate-spin text-primary" />
                </div>
              )}
            </div>

            {/* Search Results List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {searchQuery.trim().length === 0 ? (
                <div className="py-12 text-center text-base-content/60">
                  <UserPlus className="size-10 mx-auto opacity-30 mb-2" />
                  <p className="font-medium text-sm">
                    Find people to chat with
                  </p>
                  <p className="text-xs text-base-content/50 mt-1">
                    Search for a friend by entering their full name or email
                    address
                  </p>
                </div>
              ) : isSearching && searchResults.length === 0 ? (
                <div className="py-12 text-center text-base-content/60">
                  <Loader2 className="size-8 mx-auto animate-spin text-primary opacity-60 mb-2" />
                  <p className="text-sm">Searching users...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-12 text-center text-base-content/60">
                  <p className="font-medium text-sm">No users found</p>
                  <p className="text-xs text-base-content/50 mt-1">
                    Try searching with another name or email
                  </p>
                </div>
              ) : (
                searchResults.map((user) => {
                  const isOnline = onlineUsers.includes(user._id);
                  const isLoading = actionLoadingId === user._id;

                  return (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative flex-shrink-0">
                          <img
                            src={user.profilePic || "/avatar.png"}
                            alt={user.fullname}
                            className="size-10 rounded-full object-cover"
                          />
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 size-2.5 bg-green-500 rounded-full ring-2 ring-base-100" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">
                            {user.fullname}
                          </div>
                          <div className="text-xs text-base-content/60 truncate">
                            {user.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {user.relationship === "friends" ? (
                          <div className="flex items-center gap-1.5">
                            <span className="badge badge-success gap-1 text-xs py-2.5 px-3">
                              <UserCheck className="size-3.5" />
                              Friends
                            </span>
                            <button
                              onClick={() => unfriendUser(user._id)}
                              disabled={isLoading}
                              title="Remove friend"
                              className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                            >
                              {isLoading ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <UserMinus className="size-3.5" />
                              )}
                            </button>
                          </div>
                        ) : user.relationship === "pending_sent" ? (
                          <span className="badge badge-ghost gap-1 text-xs py-2.5 px-3 opacity-70">
                            <Clock className="size-3.5" />
                            Requested
                          </span>
                        ) : user.relationship === "pending_received" ? (
                          <button
                            onClick={() =>
                              acceptFriendRequest(user.requestId, user._id)
                            }
                            disabled={isLoading}
                            className="btn btn-primary btn-xs sm:btn-sm gap-1"
                          >
                            {isLoading ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Check className="size-3.5" />
                            )}
                            Accept
                          </button>
                        ) : (
                          <button
                            onClick={() => sendFriendRequest(user._id)}
                            disabled={isLoading}
                            className="btn btn-primary btn-outline btn-xs sm:btn-sm gap-1.5"
                          >
                            {isLoading ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <UserPlus className="size-3.5" />
                            )}
                            Add Friend
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Pending Friend Requests */}
        {activeTab === "requests" && (
          <div className="p-4 pt-2 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {isRequestsLoading ? (
                <div className="py-12 text-center text-base-content/60">
                  <Loader2 className="size-8 mx-auto animate-spin text-primary opacity-60 mb-2" />
                  <p className="text-sm">Loading requests...</p>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="py-12 text-center text-base-content/60">
                  <Clock className="size-10 mx-auto opacity-30 mb-2" />
                  <p className="font-medium text-sm">
                    No pending friend requests
                  </p>
                  <p className="text-xs text-base-content/50 mt-1">
                    When someone sends you a friend request, it will appear here
                  </p>
                </div>
              ) : (
                pendingRequests.map((request) => {
                  const sender = request.senderId;
                  if (!sender) return null;

                  const isOnline = onlineUsers.includes(sender._id);
                  const isLoading = actionLoadingId === request._id;

                  return (
                    <div
                      key={request._id}
                      className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative flex-shrink-0">
                          <img
                            src={sender.profilePic || "/avatar.png"}
                            alt={sender.fullname}
                            className="size-10 rounded-full object-cover"
                          />
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 size-2.5 bg-green-500 rounded-full ring-2 ring-base-100" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">
                            {sender.fullname}
                          </div>
                          <div className="text-xs text-base-content/60 truncate">
                            {sender.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() =>
                            acceptFriendRequest(request._id, sender._id)
                          }
                          disabled={isLoading}
                          className="btn btn-primary btn-xs sm:btn-sm gap-1"
                        >
                          {isLoading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Check className="size-3.5" />
                          )}
                          Accept
                        </button>
                        <button
                          onClick={() => rejectFriendRequest(request._id)}
                          disabled={isLoading}
                          className="btn btn-ghost btn-xs sm:btn-sm text-error hover:bg-error/10"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsModal;
