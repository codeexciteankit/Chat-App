import mongoose from "mongoose";

const oauthAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    providerAccountId: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

// A provider subject is the stable identity key. Email is never used for this.
oauthAccountSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true });
oauthAccountSchema.index({ userId: 1, provider: 1 }, { unique: true });

export default mongoose.model("OAuthAccount", oauthAccountSchema);
