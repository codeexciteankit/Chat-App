import express from 'express';
import rateLimit from 'express-rate-limit';
import { protectRoute } from '../middleware/auth.middleware.js';
import { 
  getUserForSidebar, 
  getMessages, 
  sendMessage,
  deleteMessage,
  clearChat,
  batchDeleteMessages
} from '../controllers/message.controller.js';

const router = express.Router();

const isProduction = process.env.NODE_ENV === "production";
const messageSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 60 : 300,
  message: { error: "Too many messages sent. Please wait a moment." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/users", protectRoute, getUserForSidebar);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, messageSendLimiter, sendMessage);
router.post("/batch-delete", protectRoute, batchDeleteMessages);

router.delete("/:id", protectRoute, deleteMessage);
router.delete("/clear/:id", protectRoute, clearChat);

export default router;