import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getMyFriends,
  getMyFriendRequests,
  searchUsers,
} from "../controllers/friendRequest.controller.js";

const router = express.Router();

router.get("/search", protectRoute, searchUsers);
router.post("/request/:receiverId", protectRoute, sendFriendRequest);
router.put("/accept/:requestId", protectRoute, acceptFriendRequest);
router.delete("/reject/:requestId", protectRoute, rejectFriendRequest);
router.delete("/:friendId", protectRoute, removeFriend);
router.get("/my-friends", protectRoute, getMyFriends);
router.get("/requests/pending", protectRoute, getMyFriendRequests);

export default router;
