import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
        message: "Invalid email format",
      },
    },
    fullname: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    password: {
      type: String,
      // OAuth-only accounts deliberately have no local password. Password
      // login remains unavailable for them until a password is explicitly set.
      required: function () {
        return !this.oauthOnly;
      },
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't include in queries by default for security
    },
    oauthOnly: {
      type: Boolean,
      default: false,
      select: false,
    },
    isDisabled: {
      type: Boolean,
      default: false,
      select: false,
    },
    profilePic: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      maxlength: [500, "Bio cannot exceed 500 characters"],
      default: "",
    },
    blockedUsers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
      select: false,
    },
    phone: {
      type: String,
      validate: {
        validator: function (phone) {
          return !phone || /^\+?[\d\s-()]{10,}$/.test(phone);
        },
        message: "Invalid phone number",
      },
      default: "",
    },
    lastSeen: {
      type: Date,
      default: Date.now,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.oauthOnly;
        delete ret.isDisabled;
        return ret;
      },
    },
  },
);

// Note: Email index is automatically created by 'unique: true' in schema
// No need for separate index declaration

const User = mongoose.model("User", userSchema);

export default User;
