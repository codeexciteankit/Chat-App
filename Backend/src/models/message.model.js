import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // For performance
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // For performance
    },
    text: {
      type: String,
      maxlength: [5000, "Message cannot exceed 5000 characters"],
      trim: true,
    },
    image: {
      type: String,
      default: "",
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

// Compound indexes for faster queries
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, createdAt: -1 });

// Validation: must have text OR image (only if not deleted)
messageSchema.pre("validate", function (next) {
  if (!this.isDeleted && !this.text && !this.image) {
    next(new Error("Message must contain text or image"));
  } else {
    next();
  }
});

const Message = mongoose.model("Message", messageSchema);

export default Message;
