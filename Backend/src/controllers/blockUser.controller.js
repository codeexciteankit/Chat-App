import BlockedUser from "../models/blockedUser.model.js";
import User from "../models/user.model.js";

export const blockUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { blockedUserId } = req.params;

    // Prevent self-blocking
    if (userId.toString() === blockedUserId) {
      return res.status(400).json({ error: "Cannot block yourself" });
    }

    // Check if user exists
    const blockedUserExists = await User.findById(blockedUserId);
    if (!blockedUserExists) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if already blocked
    const existingBlock = await BlockedUser.findOne({ userId, blockedUserId });
    if (existingBlock) {
      return res.status(400).json({ error: "User already blocked" });
    }

    const blockedUser = new BlockedUser({ userId, blockedUserId });
    await blockedUser.save();

    res.status(201).json({ message: "User blocked successfully", blockedUser });
  } catch (error) {
    console.error("Error in blockUser:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { blockedUserId } = req.params;

    const result = await BlockedUser.deleteOne({ userId, blockedUserId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "User not in blocked list" });
    }

    res.status(200).json({ message: "User unblocked successfully" });
  } catch (error) {
    console.error("Error in unblockUser:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getBlockedUsers = async (req, res) => {
  try {
    const userId = req.user._id;

    const blockedUsers = await BlockedUser.find({ userId })
      .populate("blockedUserId", "-password")
      .sort({ createdAt: -1 });

    const list = blockedUsers.map((b) => b.blockedUserId);

    res.status(200).json(list);
  } catch (error) {
    console.error("Error in getBlockedUsers:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const isUserBlocked = async (userId, blockedUserId) => {
  const blocked = await BlockedUser.findOne({ userId, blockedUserId });
  return !!blocked;
};

/**
 * Check if either user has blocked the other — single query instead of two.
 * @returns {Promise<boolean>}
 */
export const isMutuallyBlocked = async (userA, userB) => {
  const blocked = await BlockedUser.findOne({
    $or: [
      { userId: userA, blockedUserId: userB },
      { userId: userB, blockedUserId: userA },
    ],
  });
  return !!blocked;
};
