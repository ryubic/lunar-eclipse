// import fs from "fs";
// import { parseFile } from "music-metadata";

// export async function parseAudioMetadata(filePath) {
//   try {
//     // Check if file exists
//     if (!fs.existsSync(filePath)) {
//       throw new Error(`File not found: ${filePath}`);
//     }

//     // Parse metadata
//     const metadata = await parseFile(filePath, { native: true });

//     // Create a clean object with common properties
//     const audioMetadata = {
//       title: metadata.common.title || "Unknown",
//       artist: metadata.common.artist || "Unknown",
//       album: metadata.common.album || "Unknown",
//       genre: metadata.common.genre || [],
//       year: metadata.common.year || "Unknown",
//       track: metadata.common.track.no || "Unknown",
//       disk: metadata.common.disk.no || "Unknown",
//       duration: metadata.format.duration || 0, // in seconds
//       bitrate: Math.round(metadata.format.bitrate/1000) || 0, // in kbps
//       sampleRate: metadata.format.sampleRate || 0,
//       channels: metadata.format.numberOfChannels || 0,
//       format: metadata.format.container || "Unknown",
//       codec: metadata.format.codec || "Unknown",
//       picture: metadata.common.picture?.[0] || null, // first album art
//     };
//     return audioMetadata;
//   } catch (error) {
//     throw new Error(error);
//   }
// }

import { parseFile } from "music-metadata";
import fs from "fs";

export async function getMetadataOptions(filePath, isAudio) {
  if (!fs.existsSync(filePath)) throw new Error("File does not exist");

  const meta = await parseFile(filePath, { native: true });

  // Use common and format metadata
  const common = meta.common || {};
  const format = meta.format || {};

  const options = {
    title: common.title || "",            // Song/video title
    artist: common.artist || "",          // Artist or uploader
    album: common.album || "",            // Album if any
    track: common.track || null,          // { no: 1, of: 10 } etc
    genre: common.genre || [],            // Array
    year: common.year || null,
    duration: format.duration || 0,       // in seconds
    bitrate: format.bitrate || null,      // bits per second
    sampleRate: format.sampleRate || null,
    numberOfChannels: format.numberOfChannels || null,
    codec: format.codec || "",            // 'MP3', 'Opus', 'H.264' etc
    container: format.container || "",    // 'MP4', 'MKA', 'WebM' etc
    size: fs.statSync(filePath).size,     // file size in bytes
    path: filePath,                       // absolute path
    audioOnly: !!isAudio,                 // true for audio, false for video
    nativeTags: meta.native || {},        // raw tags for advanced use
  };

  return options;
}
