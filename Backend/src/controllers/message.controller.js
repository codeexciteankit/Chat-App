import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../libs/cloudinary.js";
import { getReceiverSocketId, io } from "../libs/socket.js";
import xss from "xss";
import FriendRequest from "../models/friendRequest.model.js";
import BlockedUser from "../models/blockedUser.model.js";
import { isMutuallyBlocked } from "./blockUser.controller.js";

export const getUserForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // Get accepted friends only
    const friendRequests = await FriendRequest.find({
      status: "accepted",
      $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
    });

    const friendIds = friendRequests.map((f) => {
      return f.senderId.toString() === loggedInUserId.toString()
        ? f.receiverId
        : f.senderId;
    });

    // Get all block relations involving current user
    const blockedRecords = await BlockedUser.find({
      $or: [
        { userId: loggedInUserId },
        { blockedUserId: loggedInUserId },
      ],
    });
    const blockedUserIds = blockedRecords.map((b) =>
      b.userId.toString() === loggedInUserId.toString()
        ? b.blockedUserId
        : b.userId,
    );

    // Filter: only friends, exclude blocked, and exclude disabled/deleted accounts
    // Include lastSeen field for displaying user status
    const filteredUsers = await User.find({
      _id: { $in: friendIds, $nin: blockedUserIds },
      isDisabled: { $ne: true },
    })
      .select("-password")
      .select("+lastSeen");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.log("Error in getUserForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const { before, limit = 50 } = req.query; // Pagination params
    const myId = req.user._id;

    // Build query
    const query = {
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
      deletedFor: { $ne: myId }, // Exclude deleted messages
    };

    // If cursor provided, only get messages before this timestamp
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    // Fetch limit + 1 to check if more exist
    const messages = await Message.find(query)
      .sort({ createdAt: -1 }) // Most recent first for pagination
      .limit(parseInt(limit) + 1);

    // Check if more messages exist
    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop(); // Remove the extra one
    }

    // Return in chronological order (oldest first)
    const orderedMessages = messages.reverse();

    res.status(200).json({
      messages: orderedMessages,
      hasMore,
      cursor: orderedMessages.length > 0 ? orderedMessages[0].createdAt : null,
    });
  } catch (error) {
    console.log("Error in getMessages: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    let { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // Check if receiver is blocking sender or sender is blocking receiver (single query)
    const isBlocked = await isMutuallyBlocked(senderId, receiverId);
    if (isBlocked) {
      return res.status(403).json({ error: "You cannot message this user" });
    }

    // Check if users are friends
    const friendRequest = await FriendRequest.findOne({
      status: "accepted",
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    });

    if (!friendRequest) {
      return res.status(403).json({ error: "You must be friends to message" });
    }

    if (!text && !image) {
      return res
        .status(400)
        .json({ error: "Message must contain text or image" });
    }

    if (text && text.length > 5000) {
      return res
        .status(400)
        .json({ error: "Message text too long (max 5000 characters)" });
    }

    // Sanitize text input to prevent XSS attacks
    if (text) {
      text = xss(text, {
        whiteList: {}, // No HTML tags allowed
        stripIgnoreTag: true, // Remove all HTML
        stripIgnoreTagBody: ["script", "style"], // Remove content too
      });
    }

    let imageUrl;
    if (image) {
      try {
        // Upload base64 image to cloudinary
        console.log("Uploading image to Cloudinary...");
        const uploadResponse = await cloudinary.uploader.upload(image, {
          folder: "chat-app",
          resource_type: "auto",
        });
        imageUrl = uploadResponse.secure_url;
        console.log("Image uploaded successfully:", imageUrl);
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(500).json({
          error: "Failed to upload image",
          details: uploadError.message,
        });
      }
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { deleteForEveryone } = req.query; // ?deleteForEveryone=true
    const userId = req.user._id;

    // Find the message
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const isSender = message.senderId.toString() === userId.toString();

    // DELETE FOR EVERYONE - only sender can do this
    if (deleteForEveryone === "true") {
      if (!isSender) {
        return res
          .status(403)
          .json({ error: "Only the sender can delete for everyone" });
      }

      if (message.isDeleted) {
        return res
          .status(400)
          .json({ error: "Message already deleted for everyone" });
      }

      // Soft delete for everyone
      message.isDeleted = true;
      message.deletedAt = new Date();
      await message.save();

      // Notify the receiver via socket
      const receiverSocketId = getReceiverSocketId(message.receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeleted", {
          messageId: message._id,
          deletedBy: userId,
          forEveryone: true,
        });
      }

      return res.status(200).json({
        message: "Message deleted for everyone",
        messageId: message._id,
      });
    }

    // DELETE FOR ME - anyone can delete from their own view
    else {
      // Check if already deleted for this user
      if (message.deletedFor && message.deletedFor.includes(userId)) {
        return res
          .status(400)
          .json({ error: "Message already deleted for you" });
      }

      // Add user to deletedFor array
      if (!message.deletedFor) {
        message.deletedFor = [];
      }
      message.deletedFor.push(userId);
      await message.save();

      // No socket event needed - only affects this user

      return res.status(200).json({
        message: "Message deleted for you",
        messageId: message._id,
      });
    }
  } catch (error) {
    console.log("Error in deleteMessage: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const clearChat = async (req, res) => {
  try {
    const { id: otherUserId } = req.params;
    const myId = req.user._id;

    // Single updateMany instead of N individual saves
    const result = await Message.updateMany(
      {
        $or: [
          { senderId: myId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: myId },
        ],
        deletedFor: { $ne: myId }, // Skip already-deleted ones
      },
      { $addToSet: { deletedFor: myId } }, // $addToSet prevents duplicates
    );

    return res.status(200).json({
      message: "Chat cleared successfully",
      deletedCount: result.modifiedCount,
    });
  } catch (error) {
    console.log("Error in clearChat: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const batchDeleteMessages = async (req, res) => {
  try {
    const { messageIds } = req.body;
    const userId = req.user._id;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: "No message IDs provided" });
    }

    if (messageIds.length > 100) {
      return res
        .status(400)
        .json({ error: "Cannot delete more than 100 messages at once" });
    }

    // Single updateMany instead of N individual saves
    const result = await Message.updateMany(
      {
        _id: { $in: messageIds },
        deletedFor: { $ne: userId }, // Only update messages not already deleted for user
      },
      { $addToSet: { deletedFor: userId } },
    );

    return res.status(200).json({
      message: `Successfully deleted ${result.modifiedCount} messages`,
      deletedCount: result.modifiedCount,
    });
  } catch (error) {
    console.log("Error in batchDeleteMessages: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
