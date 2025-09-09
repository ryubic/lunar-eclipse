import mongoose, { Schema } from "mongoose";

const youtubeSchema = new Schema(
  {
    url: { type: String, required: true },
    videoId: { type: String, required: true, unique: true, index: true },
    title: { type: String },
    thumbnailUrl: { type: String },
    telegramFileIds: [{ type: String, required: true }],
    audioOnly: { type: Boolean, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.model("YoutubeContentCache", youtubeSchema);
