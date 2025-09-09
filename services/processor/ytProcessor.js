import fs from "fs";
import { downloadYtVideo, getYtDlpMeta } from "../ytDlp.js";
import YoutubeContentCache from "../../database/models/youtube.model.js";
import { TEMP_DIR_PATH, YT_COOKIES_PATH } from "../../constants.js";
import { parseFile } from "music-metadata";
import { getMetadataOptions } from "../../utils/metadataPareser.js";

async function handelYtRequest(
  url,
  bot,
  userChatId,
  cacheChatId,
  audioOnly = false
) {
  let results = [];
  const tempDirPath = `${TEMP_DIR_PATH}/${userChatId}${Date.now()}`;
  try {
    const meta = await getYtDlpMeta(url);
    if (meta._type === "playlist") {
      for (const entry of meta.entries) {
        const t = await processSingleVideo(
          entry,
          bot,
          userChatId,
          cacheChatId,
          tempDirPath,
          audioOnly
        );
        results.push(t);
      }
    } else {
      const singleTrack = await processSingleVideo(
        meta,
        bot,
        userChatId,
        cacheChatId,
        tempDirPath,
        audioOnly
      );
      results.push(singleTrack);
    }

    return results;
  } catch (error) {
    throw error;
  } finally {
    if (tempDirPath && fs.existsSync(tempDirPath)) {
      fs.rmSync(tempDirPath, { recursive: true, force: true });
    }
  }
}

async function processSingleVideo(
  trackMeta,
  bot,
  userChatId,
  cacheChatId,
  tempDirPath,
  audioOnly
) {
  const url = trackMeta.original_url || trackMeta.webpage_url;
  const videoId = trackMeta.id;
  // check db videoID
  let video = await YoutubeContentCache.findOne({ videoId });
  if (video && video.telegramFileIds?.length > 0) {
    await bot.sendDocument(userChatId, video.telegramFileIds[0]);
    return video;
  }

  // cache miss? Download video/audio
  fs.mkdirSync(tempDirPath, { recursive: true });
  let downloadedFilePath;
  let newCache;

  try {
    // download track to unique track dir
    downloadedFilePath = await downloadYtVideo(
      url,
      tempDirPath,
      YT_COOKIES_PATH,
      audioOnly
    );
    if (!downloadedFilePath) throw new Error("yt-dlp did not finish correctly");
    if (!fs.existsSync(downloadedFilePath))
      throw new Error("unable to locate downloaded file");

    const metadata = await parseFile(downloadedFilePath);

    newCache = await bot.sendDocument(
      cacheChatId,
      fs.createReadStream(downloadedFilePath)
    );
    if (!newCache.document) {
      console.log(newCache);

      throw new Error("unable to upload file to cache group");
    }

    //  Only update DB if upload succeeded
    if (!video) {
      video = new YoutubeContentCache({
        url,
        videoId,
        title: trackMeta.title,
        thumbnailUrl: trackMeta.thumbnail || "",
        telegramFileIds: [newCache.document.file_id],
        audioOnly,
        metadata: metadata || {},
      });
    } else {
      video.telegramFileIds.unshift(newCache.document.file_id);
    }
    await video.save();

    // Forward to user
    await bot.sendDocument(userChatId, video.telegramFileIds[0]);
    return video;
  } catch (error) {
    throw error;
  } finally {
    if (downloadedFilePath && fs.existsSync(downloadedFilePath)) {
      fs.rmSync(downloadedFilePath, { recursive: true, force: true });
    }
  }
}

export { processSingleVideo, handelYtRequest };
