import express from 'express';
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

router.get("/users", protectRoute, getUserForSidebar);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);
router.post("/batch-delete", protectRoute, batchDeleteMessages);

router.delete("/:id", protectRoute, deleteMessage);
router.delete("/clear/:id", protectRoute, clearChat);

export default router;