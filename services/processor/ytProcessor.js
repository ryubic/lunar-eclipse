import fs from "fs";
import { downloadYtAudio, getYtDlpMeta } from "../ytDlp.js";
import YoutubeContentCache from "../../database/models/youtube.model.js";
import { TEMP_DIR_PATH, YT_COOKIES_PATH } from "../../constants.js";
import { cacheAudioToGroup } from "../../utils/cacheToGroup.js";
import path from "path";

async function handelYtRequest(url, bot, userChatId, cacheChatId) {
  let results = [];
  const tempDirPath = `${TEMP_DIR_PATH}/${userChatId}${Date.now()}`;
  try {
    const meta = await getYtDlpMeta(url);
    if (meta._type === "playlist") {
      for (const entry of meta.entries) {
        const t = await processSingleTrack(
          entry,
          bot,
          userChatId,
          cacheChatId,
          tempDirPath,
          meta
        );
        results.push(t);
      }
    } else {
      const singleTrack = await processSingleTrack(
        meta,
        bot,
        userChatId,
        cacheChatId,
        tempDirPath
      );
      results.push(singleTrack);
    }

    return results;
  } catch (error) {
    console.error("handelYtRequest failed:", error);
  } finally {
    if (tempDirPath && fs.existsSync(tempDirPath)) {
      fs.rmSync(tempDirPath, { recursive: true, force: true });
    }
  }
}

async function processSingleTrack(
  trackMeta,
  bot,
  userChatId,
  cacheChatId,
  tempDirPath,
  playlistMeta = null
) {
  const url = trackMeta.original_url || trackMeta.webpage_url;
  const videoId = trackMeta.id;

  // check db videoID
  let track = await YoutubeContentCache.findOne({ videoId });
  if (track && track.telegramFileIds?.length > 0) {
    await bot.sendAudio(
      userChatId,
      track.telegramFileIds[0],
      track.telegramOptions
    );
    return track;
  }

  // cache miss? Download track
  fs.mkdirSync(tempDirPath, { recursive: true });

  let newCacheData;
  const expectedTrackPath = path.join(tempDirPath, `${trackMeta.title}.opus`);
  try {
    // download track to unique track dir
    const result = await downloadYtAudio(url, tempDirPath, YT_COOKIES_PATH);
    if (result.status !== 201)
      throw new Error("yt-dlp did not finish correctly");
    newCacheData = await cacheAudioToGroup(bot, cacheChatId, expectedTrackPath);

    if (!newCacheData)
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
        telegramOptions: newCacheData.telegramOptions,
        fileMetadata: newCacheData.fileMetadata,
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
    if (expectedTrackPath && fs.existsSync(expectedTrackPath)) {
      fs.rmSync(expectedTrackPath, { recursive: true, force: true });
    }
  }
}

export { processSingleTrack, handelYtRequest };
