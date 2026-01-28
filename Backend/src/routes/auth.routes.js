import express from "express";
import {
  login,
  logout,
  signup,
  updateProfile,
  checkAuth,
  deleteAccount,
  downloadData,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth attempts per windowMs
  message: "Too many authentication attempts, please try again later.",
});

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/logout", logout);

router.put("/update-profile", protectRoute, updateProfile); // Add this line

router.get("/check", protectRoute, checkAuth);
router.get("/checkAuth", protectRoute, checkAuth);
router.delete("/delete-account", protectRoute, deleteAccount);
router.get("/download-data", protectRoute, downloadData);

export default router;
