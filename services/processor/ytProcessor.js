// take userinput
// query db for cache with url, forward file if cache hit
// cache miss? fetch metadata and query db with postId
// cache miss again?
// download files
// upload to telegram cache group
// add file's data to mongoDB
// forward to user
// delete temp folder

import fs from "fs";
import path from "path";
import { downloadYtAudio, getYtDlpMeta } from "../ytDlp.js";
import YoutubeContentCache from "../../database/models/youtube.model.js";
import { YT_TEMP_DIR_PATH, YT_COOKIES_PATH } from "../../constants.js";
import { parseAudioMetadata } from "../../utils/metadataPareser.js";

async function handelYtRequest(url, bot, userChatId, cacheChatId) {
  // check db cache by url
  let track = await YoutubeContentCache({ url });
  if (track && track.telegramFileIds?.length > 0) {
    await bot.sendAudio(userChatId, cacheChatId, track.telegramFileIds[0]);
    return track;
  }

  // fetch metadata only if DB miss
  const meta = await getYtDlpMeta(url);
  if (meta._type === "playlist") {
    // Playlist → loop entries
    const results = [];
    for (const entry of meta.entries) {
      const t = await processSingleTrack(
        entry,
        bot,
        userChatId,
        cacheChatId,
        meta
      );
      results.push(t);
    }
    return results;
  } else {
    // Single track/video/short
    return await processSingleTrack(meta, bot, userChatId, cacheChatId);
  }
}

async function processSingleTrack(
  trackMeta,
  bot,
  userChatId,
  cacheChatId,
  playlistMeta = null
) {
  const videoId = trackMeta.id;
  const url = trackMeta.webpage_url || trackMeta.url;

  // check db again by videoID
  let track = await YoutubeContentCache.findOne({ videoId });
  if (track && track.telegramFileIds?.length > 0) {
    await bot.sendAudio(userChatId, track.telegramFileIds[0]);

    // update playlist meta if applicable
    if (playlistMeta) {
      if (!track.playlistIds.includes(playlistMeta.id))
        track.playlistIds.push(playlistMeta.id);
      if (!track.playlistTitles.includes(playlistMeta.title))
        track.playlistTitles.push(playlistMeta.title);
      await track.save();
    }
    return track;
  }

  // Download track
  const tempDir = path.join(YT_TEMP_DIR_PATH, Date.now().toString());
  const trackDir = path.join(
    tempDir,
    `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  );
  fs.mkdirSync(trackDir, { recursive: true });

  try {
    // download track to unique track dir
    const result = await downloadYtAudio(url, trackDir, YT_COOKIES_PATH);
    if (result !== "Done!") throw new Error("yt-dlp did not finish correctly");

    // find downloaded file
    const files = fs.readdirSync(trackDir);
    const audioFile = files.find(
      (f) => f.endsWith(".opus") || f.endsWith(".m4a")
    );
    if (!audioFile) throw new Error("No audio file found after download");

    const filePath = path.join(trackDir, audioFile);

    const audioMetadata = await parseAudioMetadata(filePath);
    console.log(audioMetadata);
    
    const telegramOptions = {
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
          ? " | " + Math.round(audioMetadata.bitrate / 1000) + " kbps"
          : ""
      }`,
    };

    //  upload to Telegram cache
    let fileId;
    try {
      const msg = await bot.sendAudio(
        cacheChatId,
        fs.createReadStream(filePath),
        telegramOptions
      );
      console.log();
      
      fileId = msg.audio.file_id; // save Telegram file_id
    } catch (err) {
      throw new Error("Telegram upload failed: " + err.message);
    }

    //  Only update DB if upload succeeded
    if (!track) {
      track = new YoutubeContentCache({
        url,
        videoId, // replace with real videoId if available
        title: trackMeta.title,
        thumbnailUrl: trackMeta.thumbnail || "",
        type: "music",
        telegramFileIds: [fileId],
        playlistIds: playlistMeta ? [playlistMeta.id] : [],
        playlistTitles: playlistMeta ? [playlistMeta.title] : [],
        telegramOptions,
      });
    } else {
      track.telegramFileIds.push(fileId);
    }
    await track.save();

    // Forward to user
    try {
      await bot.sendAudio(userChatId, fileId);
    } catch (err) {
      console.error("Failed to forward to user:", err.message);
    }
    return track;
  } catch (err) {
    console.error("Error processing YouTube track:", err.message);
    throw err; // propagate error if needed
  } finally {
    //  Cleanup
    if (fs.existsSync(tempDir))
      fs.rmSync(trackDir, { recursive: true, force: true });
  }
}

export { processSingleTrack, handelYtRequest };
