import cloudinary from "../libs/cloudinary.js";
import { generateToken } from "../libs/utils.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import FriendRequest from "../models/friendRequest.model.js";
import BlockedUser from "../models/blockedUser.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import OAuthAccount from "../models/oauthAccount.model.js";
import OAuthState from "../models/oauthState.model.js";
import {
  OAuthError,
  createAuthorizationRequest,
  exchangeAuthorizationCode,
  getOidcSettings,
  hashOAuthState,
  safeReturnTo,
} from "../libs/oauth.js";

const OAUTH_STATE_COOKIE = "oauth_oidc_state";
const stateCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/api/auth/oauth/oidc",
  maxAge: 10 * 60 * 1000,
};

const frontendRedirect = (path, error) => {
  const url = new URL(process.env.FRONTEND_URL || "http://localhost:5173");
  url.pathname = error ? "/login" : safeReturnTo(path);
  if (error) url.searchParams.set("oauth", error);
  return url.toString();
};

const clearOAuthStateCookie = (res) => res.clearCookie(OAUTH_STATE_COOKIE, stateCookieOptions);

const oauthFailureRedirect = (res, category) => {
  clearOAuthStateCookie(res);
  return res.redirect(302, frontendRedirect("/login", category));
};

export const oidcStatus = (req, res) => {
  try {
    const settings = getOidcSettings();
    res.json({ enabled: settings.enabled, provider: settings.providerDisplayName || null });
  } catch {
    // The browser receives no configuration diagnostics or secrets.
    res.json({ enabled: false, provider: null });
  }
};

export const startOidcLogin = async (req, res) => {
  try {
    const settings = getOidcSettings();
    if (!settings.enabled) return res.status(503).json({ message: "Single sign-on is not configured" });

    const request = await createAuthorizationRequest(settings);
    await OAuthState.deleteMany({ expiresAt: { $lt: new Date() } });
    await OAuthState.create({
      stateHash: hashOAuthState(request.state),
      codeVerifier: request.codeVerifier,
      nonce: request.nonce,
      returnTo: safeReturnTo(req.query.returnTo),
      expiresAt: request.expiresAt,
      linkUserId: req.oauthLinkUserId || null,
    });
    res.cookie(OAUTH_STATE_COOKIE, request.state, stateCookieOptions);
    console.info("OAuth authorization started", { provider: settings.provider });
    return res.redirect(302, request.url.toString());
  } catch (error) {
    console.error("OAuth authorization start failed", { category: error.category || "configuration_failure" });
    return res.status(503).json({ message: "Single sign-on is temporarily unavailable" });
  }
};

export const startOidcLink = [
  async (req, res, next) => {
    req.oauthLinkUserId = req.user._id;
    next();
  },
  startOidcLogin,
];

export const oidcCallback = async (req, res) => {
  const providerError = req.query.error;
  const returnedState = typeof req.query.state === "string" ? req.query.state : "";
  const cookieState = req.cookies[OAUTH_STATE_COOKIE];
  if (providerError) {
    console.info("OAuth callback failed", { category: "provider_failure" });
    return oauthFailureRedirect(res, "cancelled");
  }
  if (!returnedState || !cookieState || returnedState.length > 512 || returnedState !== cookieState || !req.query.code) {
    console.info("OAuth callback failed", { category: "invalid_callback" });
    return oauthFailureRedirect(res, "invalid_state");
  }

  let pendingState;
  try {
    // Atomic consume makes a callback one-time-use and prevents code replay.
    pendingState = await OAuthState.findOneAndDelete({
      stateHash: hashOAuthState(returnedState),
      expiresAt: { $gt: new Date() },
    }).select("+codeVerifier +nonce");
    clearOAuthStateCookie(res);
    if (!pendingState) return oauthFailureRedirect(res, "invalid_state");

    const settings = getOidcSettings();
    if (!settings.enabled) throw new OAuthError("configuration_failure", "OIDC is disabled");
    const callbackUrl = new URL(settings.redirectUri);
    callbackUrl.search = new URL(req.originalUrl, `${req.protocol}://${req.get("host")}`).search;
    const identity = await exchangeAuthorizationCode(settings, callbackUrl, {
      state: returnedState,
      nonce: pendingState.nonce,
      codeVerifier: pendingState.codeVerifier,
    });

    let account = await OAuthAccount.findOne({ provider: settings.provider, providerAccountId: identity.subject });
    let user;
    if (account) {
      if (pendingState.linkUserId && String(account.userId) !== String(pendingState.linkUserId)) {
        throw new OAuthError("account_linking_conflict", "This identity is linked to another account");
      }
      user = await User.findById(account.userId).select("+isDisabled");
      if (!user || user.isDisabled) throw new OAuthError("authentication_failure", "Account is unavailable");
    } else if (pendingState.linkUserId) {
      user = await User.findById(pendingState.linkUserId).select("+isDisabled");
      if (!user || user.isDisabled) throw new OAuthError("authentication_failure", "Account is unavailable");
      account = await OAuthAccount.create({ userId: user._id, provider: settings.provider, providerAccountId: identity.subject });
      console.info("OAuth account linked", { provider: settings.provider, userId: String(user._id) });
    } else {
      // Never merge by matching email. Existing local accounts must explicitly
      // initiate the authenticated linking flow.
      const sameEmailUser = await User.exists({ email: identity.email });
      if (sameEmailUser) throw new OAuthError("account_linking_conflict", "An account with this email already exists");
      user = await User.create({
        email: identity.email,
        fullname: String(identity.name).slice(0, 50),
        profilePic: identity.picture,
        oauthOnly: true,
      });
      try {
        account = await OAuthAccount.create({ userId: user._id, provider: settings.provider, providerAccountId: identity.subject });
      } catch (error) {
        await User.deleteOne({ _id: user._id });
        throw error;
      }
      console.info("OAuth account created", { provider: settings.provider, userId: String(user._id) });
    }

    generateToken(user._id, res);
    console.info("OAuth login succeeded", { provider: settings.provider, userId: String(user._id) });
    return res.redirect(302, frontendRedirect(pendingState.returnTo));
  } catch (error) {
    const category = error.category || (error?.code === 11000 ? "account_linking_conflict" : "authentication_failure");
    // Never log codes, tokens, state, ID tokens, or provider responses.
    console.error("OAuth callback failed", { category });
    return oauthFailureRedirect(res, category);
  }
};

export const signup = async (req, res) => {
  const { email, fullname, password } = req.body;

  try {
    if (!fullname || !email || !password) {
      return res.status(400).json({ message: "Please fill all the fields" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    const user = await User.findOne({ email });

    if (user) return res.status(400).json({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      email,
      fullname,
      password: hashedPassword,
    });

    if (newUser) {
      generateToken(newUser._id, res);
      await newUser.save();

      res.status(201).json({
        _id: newUser._id,
        email: newUser.email,
        fullname: newUser.fullname,
        profilePic: newUser.profilePic,
        createdAt: newUser.createdAt,
      });
    } else {
      return res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log("Signup error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Need to explicitly select password since it's excluded by default
    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.password) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      email: user.email,
      fullname: user.fullname,
      profilePic: user.profilePic,
      bio: user.bio || "",
      phone: user.phone || "",
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.log("Login error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = (req, res) => {
  res.clearCookie("jwt", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV !== "development",
    path: "/",
  });
  res.status(200).json({ message: "Logged out successfully" });
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    // Extract allowed fields from request body
    const { fullname, profilePic, phone, bio } = req.body;
    const updateData = {};

    if (fullname) updateData.fullname = fullname;
    if (phone) updateData.phone = phone;
    if (bio) updateData.bio = bio;

    // Handle profile picture if provided
    if (profilePic) {
      console.log("Uploading profile picture to Cloudinary...");
      const uploadResponse = await cloudinary.uploader.upload(profilePic, {
        resource_type: "image",
        folder: "profile_pictures",
      });
      console.log("Cloudinary upload successful:", uploadResponse.secure_url);
      updateData.profilePic = uploadResponse.secure_url;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }, // return the updated document
    ).select("-password"); // hide password

    res.status(200).json({ user: updatedUser });
  } catch (error) {
    console.log("Update profile error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = async (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    // IMPORTANT: Don't delete messages - this would delete conversations for other users!
    // Instead, anonymize the user's data
    
    // Delete user's profile picture from Cloudinary if it exists
    const user = await User.findById(userId);
    if (user.profilePic && user.profilePic.includes('cloudinary')) {
      try {
        const publicId = user.profilePic.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`profile_pictures/${publicId}`);
      } catch (error) {
        console.error("Failed to delete profile picture:", error);
        // Continue with account deletion even if image deletion fails
      }
    }

    // Remove external identity mappings before anonymising. A deleted account
    // cannot later be authenticated through a stale OAuth identity.
    await OAuthAccount.deleteMany({ userId });

    // Remove pending or accepted friendships and block entries
    await FriendRequest.deleteMany({
      $or: [{ senderId: userId }, { receiverId: userId }],
    });
    await BlockedUser.deleteMany({
      $or: [{ userId }, { blockedUserId: userId }],
    });

    // Anonymize user data instead of deleting and mark disabled
    await User.findByIdAndUpdate(userId, {
      email: `deleted_${userId}@deleted.com`,
      fullname: "Deleted User",
      password: "deleted",
      profilePic: "",
      bio: "",
      phone: "",
      isDisabled: true,
    });

    // Clear the JWT cookie
    res.clearCookie("jwt", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV !== "development",
      path: "/",
    });

    res.status(200).json({ 
      message: "Account deleted successfully. Your messages will remain visible to other users as 'Deleted User'." 
    });
  } catch (error) {
    console.log("Error in deleteAccount controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const downloadData = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("-password");
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    })
      .populate("senderId", "fullname email")
      .populate("receiverId", "fullname email");

    const data = {
      user,
      messages,
      exportedAt: new Date(),
    };

    res.status(200).json(data);
  } catch (error) {
    console.log("Error in downloadData controller:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
