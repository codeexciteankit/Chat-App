import cloudinary from "../libs/cloudinary.js";
import { generateToken } from "../libs/utils.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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
    if (!user) {
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
  // If using cookies, clear them like this:
  res.clearCookie("jwt", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV !== "development",
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

    // Anonymize user data instead of deleting
    await User.findByIdAndUpdate(userId, {
      email: `deleted_${userId}@deleted.com`,
      fullname: "Deleted User",
      password: "deleted",
      profilePic: "",
      bio: "",
      phone: "",
    });

    // Clear the JWT cookie
    res.clearCookie("jwt", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV !== "development",
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
