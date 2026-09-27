import express from "express";
import {
  login,
  logout,
  signup,
  updateProfile,
  checkAuth,
  deleteAccount,
  downloadData,
  oidcCallback,
  oidcStatus,
  startOidcLink,
  startOidcLogin,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Stricter rate limit for auth routes (skips successful logins/signups)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 15 : 100,
  skipSuccessfulRequests: true,
  message: { message: "Too many authentication attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/logout", logout);

router.get("/oauth/oidc/status", oidcStatus);
router.get("/oauth/oidc/start", startOidcLogin);
router.get("/oauth/oidc/callback", oidcCallback);
router.get("/oauth/oidc/link", protectRoute, ...startOidcLink);

router.put("/update-profile", protectRoute, updateProfile); // Add this line

router.get("/check", protectRoute, checkAuth);
router.get("/checkAuth", protectRoute, checkAuth);
router.delete("/delete-account", protectRoute, deleteAccount);
router.get("/download-data", protectRoute, downloadData);

export default router;
