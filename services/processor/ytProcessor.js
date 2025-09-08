import fs from "fs";
import path from "path";
import { downloadYtAudio, getYtDlpMeta } from "../ytDlp.js";
import YoutubeContentCache from "../../database/models/youtube.model.js";
import { YT_TEMP_DIR_PATH, YT_COOKIES_PATH } from "../../constants.js";
import { cacheAudioToGroup } from "../../utils/cacheToGroup.js";

async function handelYtRequest(url, bot, userChatId, cacheChatId) {
  let results = [];
  const meta = await getYtDlpMeta(url);
  if (meta._type === "playlist") {
    const meta = await getYtDlpMeta(url);
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
  } else {
    const singleTrack = await processSingleTrack(
      meta,
      bot,
      userChatId,
      cacheChatId
    );
    return results.push(singleTrack);
  }
  return results;
}

async function processSingleTrack(
  trackMeta,
  bot,
  userChatId,
  cacheChatId,
  playlistMeta = null
) {
  const url = trackMeta.webpage_url || trackMeta.url;
  const videoId = trackMeta.id;

  // check db videoID
  let track = await YoutubeContentCache.findOne({ videoId });
  if (track && track.telegramFileIds?.length > 0) {
    await bot.sendAudio(
      userChatId,
      track.telegramFileIds[0],
      track.telegramOptions
    );
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

  // cache miss? Download track
  fs.mkdirSync(YT_TEMP_DIR_PATH, { recursive: true });
  let trackPath = path.join(
    YT_TEMP_DIR_PATH,
    `${userChatId}${Date.now()}${Math.floor(Math.random() * 10000)}`.toString()
  );

  let newCacheData;
  try {
    // download track to unique track dir
    const result = await downloadYtAudio(url, trackPath, YT_COOKIES_PATH);
    if (result.status !== 201)
      throw new Error("yt-dlp did not finish correctly");

    newCacheData = await cacheAudioToGroup(
      bot,
      cacheChatId,
      result.expectedPath
    );

    if (!newCacheData)
      console.log(newCacheData);
      throw new Error(
        
        "cacheAudioToGroup function failed: failed to upload cache to group"
      );

    //  Only update DB if upload succeeded
    if (!track) {
      track = new YoutubeContentCache({
        url,
        videoId,
        title: trackMeta.title,
        thumbnailUrl: trackMeta.thumbnail || "",
        type: "audio",
        telegramFileIds: [newCacheData.audio.file_id],
        playlistIds: playlistMeta ? [playlistMeta.id] : [],
        playlistTitles: playlistMeta ? [playlistMeta.title] : [],
        telegramOptions: newCacheData.telegramOptions,
      });
    } else {
      track.telegramFileIds.push(newCacheData.audio.file_id);
    }
    await track.save();

    // Forward to user
    try {
      await bot.sendAudio(
        userChatId,
        newCacheData.audio.file_id,
        newCacheData.telegramOptions
      );
    } catch (err) {
      console.error("Failed to forward to user:", err.message);
    }
    return track;
  } catch (err) {
    console.error("Error processing YouTube track:", err.message);
    throw err; // propagate error if needed
  } finally {
    //  Cleanup
    try {
      fs.unlinkSync(`${newCacheData.filePath}`);
    } catch (err) {
      console.error("Error deleting file:", err);
    }
  }
}

export { processSingleTrack, handelYtRequest };
