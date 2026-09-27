import FriendRequest from "../models/friendRequest.model.js";
import User from "../models/user.model.js";
import BlockedUser from "../models/blockedUser.model.js";
import { getReceiverSocketId, io } from "../libs/socket.js";
import { isMutuallyBlocked } from "./blockUser.controller.js";

export const searchUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { query } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(200).json([]);
    }

    const trimmedQuery = query.trim();
    const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedQuery, "i");

    // Exclude current user, deleted/disabled accounts
    const users = await User.find({
      _id: { $ne: currentUserId },
      isDisabled: { $ne: true },
      email: { $not: /^deleted_/ },
      $or: [{ email: regex }, { fullname: regex }],
    })
      .select("fullname email profilePic")
      .limit(20)
      .lean();

    // Exclude users in mutual block relations
    const blockedRecords = await BlockedUser.find({
      $or: [{ userId: currentUserId }, { blockedUserId: currentUserId }],
    });
    const blockedIds = new Set(
      blockedRecords.map((b) =>
        b.userId.toString() === currentUserId.toString()
          ? b.blockedUserId.toString()
          : b.userId.toString(),
      ),
    );

    const nonBlockedUsers = users.filter(
      (u) => !blockedIds.has(u._id.toString()),
    );

    const userIds = nonBlockedUsers.map((u) => u._id);

    const requests = await FriendRequest.find({
      $or: [
        { senderId: currentUserId, receiverId: { $in: userIds } },
        { senderId: { $in: userIds }, receiverId: currentUserId },
      ],
      status: { $in: ["pending", "accepted"] },
    }).lean();

    const results = nonBlockedUsers.map((user) => {
      const req = requests.find(
        (r) =>
          (r.senderId.toString() === currentUserId.toString() &&
            r.receiverId.toString() === user._id.toString()) ||
          (r.senderId.toString() === user._id.toString() &&
            r.receiverId.toString() === currentUserId.toString()),
      );

      let relationship = "none";
      let requestId = null;

      if (req) {
        requestId = req._id;
        if (req.status === "accepted") {
          relationship = "friends";
        } else if (req.status === "pending") {
          relationship =
            req.senderId.toString() === currentUserId.toString()
              ? "pending_sent"
              : "pending_received";
        }
      }

      return {
        ...user,
        relationship,
        requestId,
      };
    });

    res.status(200).json(results);
  } catch (error) {
    console.error("Error in searchUsers:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiverId } = req.params;

    // Prevent self-requests
    if (senderId.toString() === receiverId) {
      return res.status(400).json({ error: "Cannot send request to yourself" });
    }

    // Check if receiver exists and is not disabled
    const receiver = await User.findById(receiverId);
    if (!receiver || receiver.isDisabled) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if either user has blocked the other (single query)
    const isBlocked = await isMutuallyBlocked(senderId, receiverId);
    if (isBlocked) {
      return res
        .status(403)
        .json({ error: "Cannot send friend request to this user" });
    }

    // Check if request already exists (pending or accepted)
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { senderId, receiverId, status: { $in: ["pending", "accepted"] } },
        {
          senderId: receiverId,
          receiverId: senderId,
          status: { $in: ["pending", "accepted"] },
        },
      ],
    });

    if (existingRequest) {
      return res.status(400).json({ error: "Friend request already exists" });
    }

    const friendRequest = new FriendRequest({ senderId, receiverId });
    await friendRequest.save();

    const populatedRequest = await FriendRequest.findById(friendRequest._id)
      .populate("senderId", "fullname email profilePic")
      .populate("receiverId", "fullname email profilePic");

    try {
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId && io) {
        io.to(receiverSocketId).emit("newFriendRequest", populatedRequest);
      }
    } catch (socketErr) {
      console.warn(
        "Socket emission error in sendFriendRequest:",
        socketErr.message,
      );
    }

    res.status(201).json({
      message: "Friend request sent",
      friendRequest: populatedRequest,
    });
  } catch (error) {
    console.error("Error in sendFriendRequest:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { requestId } = req.params;

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    // Verify user is the receiver
    if (friendRequest.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    friendRequest.status = "accepted";
    await friendRequest.save();

    const populatedRequest = await FriendRequest.findById(requestId)
      .populate("senderId", "fullname email profilePic")
      .populate("receiverId", "fullname email profilePic");

    try {
      const senderSocketId = getReceiverSocketId(friendRequest.senderId);
      if (senderSocketId && io) {
        io.to(senderSocketId).emit("friendRequestAccepted", populatedRequest);
      }
      const receiverSocketId = getReceiverSocketId(friendRequest.receiverId);
      if (receiverSocketId && io) {
        io.to(receiverSocketId).emit("friendRequestAccepted", populatedRequest);
      }
    } catch (socketErr) {
      console.warn(
        "Socket emission error in acceptFriendRequest:",
        socketErr.message,
      );
    }

    res.status(200).json({
      message: "Friend request accepted",
      friendRequest: populatedRequest,
    });
  } catch (error) {
    console.error("Error in acceptFriendRequest:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const rejectFriendRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { requestId } = req.params;

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    // Verify user is the receiver
    if (friendRequest.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const senderId = friendRequest.senderId;
    await FriendRequest.deleteOne({ _id: requestId });

    try {
      const senderSocketId = getReceiverSocketId(senderId);
      if (senderSocketId && io) {
        io.to(senderSocketId).emit("friendRequestRejected", {
          requestId,
          receiverId: userId,
        });
      }
    } catch (socketErr) {
      console.warn(
        "Socket emission error in rejectFriendRequest:",
        socketErr.message,
      );
    }

    res.status(200).json({ message: "Friend request rejected" });
  } catch (error) {
    console.error("Error in rejectFriendRequest:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeFriend = async (req, res) => {
  try {
    const userId = req.user._id;
    const { friendId } = req.params;

    // Delete request in either direction (whether accepted or pending)
    await FriendRequest.deleteMany({
      $or: [
        { senderId: userId, receiverId: friendId },
        { senderId: friendId, receiverId: userId },
      ],
    });

    // Notify both parties in real-time so their UI updates instantly
    try {
      const friendSocketId = getReceiverSocketId(friendId);
      if (friendSocketId && io) {
        io.to(friendSocketId).emit("unfriended", {
          removedBy: userId.toString(),
          friendId: friendId.toString(),
        });
      }
      const selfSocketId = getReceiverSocketId(userId);
      if (selfSocketId && io) {
        io.to(selfSocketId).emit("unfriended", {
          removedBy: userId.toString(),
          friendId: friendId.toString(),
        });
      }
    } catch (socketErr) {
      console.warn("Socket emission error in removeFriend:", socketErr.message);
    }

    res.status(200).json({ message: "Friend removed" });
  } catch (error) {
    console.error("Error in removeFriend:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMyFriends = async (req, res) => {
  try {
    const userId = req.user._id;

    const friends = await FriendRequest.find({
      status: "accepted",
      $or: [{ senderId: userId }, { receiverId: userId }],
    })
      .populate("senderId", "-password")
      .populate("receiverId", "-password");

    // Extract friend objects
    const friendList = friends.map((f) => {
      return f.senderId._id.toString() === userId.toString()
        ? f.receiverId
        : f.senderId;
    });

    res.status(200).json(friendList);
  } catch (error) {
    console.error("Error in getMyFriends:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMyFriendRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await FriendRequest.find({
      receiverId: userId,
      status: "pending",
    })
      .populate("senderId", "-password")
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    console.error("Error in getMyFriendRequests:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
