import { parseAudioMetadata } from "./metadataPareser.js";
import fs from "fs";

async function cacheAudioToGroup(bot, cacheGroupId, filePath) {  if (!fs.existsSync(filePath))
    throw new Error(
      "error whille caching new audio file: file doesnt exist, yt-dlp failed or couldn't download the best audio"
    );

  const audioMetadata = await parseAudioMetadata(filePath);
  console.log(audioMetadata);

  const options = {
    title: audioMetadata.title,
    performer: audioMetadata.artist,
    duration: audioMetadata.duration,
    contentType: audioMetadata.format
      ? `audio/${audioMetadata.format.toLowerCase()}`
      : "audio/mpeg",
    caption: `Title: ${audioMetadata.title}\nArtist: ${
      audioMetadata.artist
    }\nAlbum: ${audioMetadata.album}\nYear: ${audioMetadata.year}\nCodec: ${
      audioMetadata.codec || "Unknown"
    }${
      audioMetadata.bitrate
        ? " | " + audioMetadata.bitrate + " kbps"
        : ""
    }`,
  };

  try {
    const message = await bot.sendAudio(
      cacheGroupId,
      fs.createReadStream(filePath),
      options
    );
    console.log("bot.sendaudio returns: ", message);
    const newCacheData = {
      ...message,
      telegramOptions: options,
      filePath
    };
    return newCacheData;
  } catch (error) {
    throw new Error(
      "ERROR: failed to upload audio to cache group whille caching new files",
      error
    );
  }
}

export { cacheAudioToGroup };
