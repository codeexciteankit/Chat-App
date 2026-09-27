import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  blockUser,
  unblockUser,
  getBlockedUsers,
} from "../controllers/blockUser.controller.js";

const router = express.Router();

router.post("/block/:blockedUserId", protectRoute, blockUser);
router.delete("/block/:blockedUserId", protectRoute, unblockUser);
router.get("/blocked-list", protectRoute, getBlockedUsers);

export default router;
