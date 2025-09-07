import mongoose, { Schema } from "mongoose";

const instagramSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    postId: { type: String, required: true, unique: true },
    mediaType: {
      type: String,
      enum: ["image", "video", "carousel"],
      required: true,
    },
    caption: { type: String },

    // Telegram storage
    telegramFileIds: [{ type: String, required: true }],
    // Cache info
    cachedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("InstagramCache", instagramSchema);
