import fs from "fs";
import { parseFile } from "music-metadata";

export async function parseAudioMetadata(filePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Parse metadata
    const metadata = await parseFile(filePath, { native: true });

    // Create a clean object with common properties
    const audioMetadata = {
      title: metadata.common.title || "Unknown",
      artist: metadata.common.artist || "Unknown",
      album: metadata.common.album || "Unknown",
      genre: metadata.common.genre || [],
      year: metadata.common.year || "Unknown",
      track: metadata.common.track.no || "Unknown",
      disk: metadata.common.disk.no || "Unknown",
      duration: metadata.format.duration || 0, // in seconds
      bitrate: Math.round(metadata.format.bitrate/1000) || 0, // in kbps
      sampleRate: metadata.format.sampleRate || 0,
      channels: metadata.format.numberOfChannels || 0,
      format: metadata.format.container || "Unknown",
      codec: metadata.format.codec || "Unknown",
      picture: metadata.common.picture?.[0] || null, // first album art
    };
    console.log("audioMetadata: ",audioMetadata);
    
    return audioMetadata;
  } catch (error) {
    throw new Error(error);
  }
}

