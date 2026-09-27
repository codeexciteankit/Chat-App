import { Server } from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

let io;
const userSocketMap = {}; // {userId: socketId}

export const getReceiverSocketId = (userId) => {
  return userSocketMap[userId];
};

export const initSocket = (server) => {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  // ── Socket authentication middleware ─────────────────────────────────
  // Verify JWT before the "connection" event fires. Unauthenticated
  // clients are rejected here — they never enter the connection handler.
  io.use(async (socket, next) => {
    try {
      // Accept token from cookie (browser) or Authorization header (mobile/testing)
      let token =
        socket.handshake.headers?.cookie
          ?.split(";")
          .map((c) => c.trim())
          .find((c) => c.startsWith("jwt="))
          ?.split("=")[1] ||
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userID).select("+isDisabled");
      if (!user || user.isDisabled) {
        return next(new Error("User not found or disabled"));
      }

      // Attach verified user to socket — controllers can now trust socket.user
      socket.user = user;
      next();
    } catch {
      next(new Error("Authentication required"));
    }
  });

  io.on("connection", (socket) => {
    // Use server-verified userId — NOT the client's query param (which was spoofable)
    const userId = socket.user._id.toString();

    userSocketMap[userId] = socket.id;
    console.log("A user connected", socket.id, "userId:", userId);
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("disconnect", () => {
      console.log("A user disconnected", socket.id);
      if (userId && userSocketMap[userId] === socket.id) {
        delete userSocketMap[userId];
        io.emit("getOnlineUsers", Object.keys(userSocketMap));

        // Update user's lastSeen timestamp when they disconnect
        User.findByIdAndUpdate(
          userId,
          { lastSeen: new Date() },
          { new: true },
        ).catch((err) => {
          console.error(
            "Error updating lastSeen for user",
            userId,
            ":",
            err.message,
          );
        });
      }
    });

    // Typing indicator - with error handling
    socket.on("typing", (receiverId) => {
      try {
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("userTyping", userId);
        }
      } catch (error) {
        console.error("Error emitting typing event:", error.message);
      }
    });

    socket.on("stopTyping", (receiverId) => {
      try {
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("userStopTyping", userId);
        }
      } catch (error) {
        console.error("Error emitting stopTyping event:", error.message);
      }
    });

    // Mark messages as read — also use updateMany for efficiency
    socket.on("markMessagesAsRead", async (senderId) => {
      try {
        const result = await Message.updateMany(
          { senderId, receiverId: userId, readBy: { $ne: userId } },
          { $push: { readBy: userId } },
        );

        // Only notify sender if something actually changed
        const senderSocketId = getReceiverSocketId(senderId);
        if (senderSocketId && result.modifiedCount > 0) {
          io.to(senderSocketId).emit("messagesRead", userId);
        }
      } catch (error) {
        console.log("Error marking messages as read:", error.message);
      }
    });
  });

  return io;
};

export { io };
