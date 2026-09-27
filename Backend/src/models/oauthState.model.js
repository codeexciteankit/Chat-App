import mongoose from "mongoose";

const oauthStateSchema = new mongoose.Schema(
  {
    stateHash: { type: String, required: true, unique: true },
    codeVerifier: { type: String, required: true, select: false },
    nonce: { type: String, required: true, select: false },
    returnTo: { type: String, required: true },
    // Present only for explicit, authenticated account-linking attempts.
    linkUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true },
);

export default mongoose.model("OAuthState", oauthStateSchema);
