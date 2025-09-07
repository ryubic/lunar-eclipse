import mongoose, { Schema } from "mongoose";

const youtubeSchema = new Schema(
  {
    url: { type: String, required: true, index: true },              
    videoId: { type: String, required: true, unique: true, index: true }, 
    title: { type: String },                        
    thumbnailUrl: { type: String },

    // Telegram cache
    telegramFileIds: [{ type: String, required: true }], 
    telegramOptions: { type: Schema.Types.Mixed },

    // Type of content
    type: { type: String, enum: ["video", "music", "short"], default: "video" },

    // Playlist/album info
    playlistIds: [{ type: String }],    
    playlistTitles: [{ type: String }], 

    cachedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("YoutubeContentCache", youtubeSchema);
