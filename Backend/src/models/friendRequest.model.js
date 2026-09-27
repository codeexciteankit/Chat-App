import mongoose from "mongoose";

const friendRequestSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

// Prevent exact duplicate requests in the same direction at DB level.
// The application layer also checks both directions (A→B and B→A)
// to handle concurrent cross-direction requests gracefully.
friendRequestSchema.index(
  { senderId: 1, receiverId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending", "accepted"] } },
  },
);

export default mongoose.model("FriendRequest", friendRequestSchema);

