import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";

let io;
const userSocketMap = {}; // {userId: socketId}

export const getReceiverSocketId = (userId) => {
  return userSocketMap[userId];
};

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:5174"],
    },
  });

  io.on("connection", (socket) => {
    console.log(
      "A user connected",
      socket.id,
      "userId:",
      socket.handshake.query.userId,
    );

    const userId = socket.handshake.query.userId;
    if (userId) userSocketMap[userId] = socket.id;

    // io.emit() is used to send events to all the connected clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("disconnect", () => {
      console.log("A user disconnected", socket.id);
      delete userSocketMap[userId];
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });

    // Typing indicator
    socket.on("typing", (receiverId) => {
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("userTyping", userId);
      }
    });

    socket.on("stopTyping", (receiverId) => {
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("userStopTyping", userId);
      }
    });

    // Mark messages as read
    socket.on("markMessagesAsRead", async (senderId) => {
      console.log(`User ${userId} marking messages from ${senderId} as read`);
      try {
        const result = await Message.updateMany(
          { senderId, receiverId: userId, readBy: { $ne: userId } },
          { $push: { readBy: userId } },
        );
        console.log(`Marked ${result.modifiedCount} messages as read`);

        // Notify sender that messages are read
        const senderSocketId = getReceiverSocketId(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("messagesRead", userId);
          console.log(
            `Notified sender ${senderId} that messages were read by ${userId}`,
          );
        } else {
          console.log(`Sender ${senderId} is not online, cannot notify`);
        }
      } catch (error) {
        console.log("Error marking messages as read:", error.message);
      }
    });
  });

  return io;
};

export { io };
