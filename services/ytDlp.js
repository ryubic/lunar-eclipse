import { spawn } from "child_process";
import fs from "fs";

// /**
//  * Get metadata from yt-dlp
//  * @param {string} url - The video/playlist URL
//  * @param {string[]} extraArgs - Optional extra args for yt-dlp
//  * @returns {Promise<any>} - Parsed JSON metadata
//  */

function getYtDlpMeta(url, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const args = ["-J", url, ...extraArgs]; // -J = dump JSON
    const ytdlp = spawn("yt-dlp", args);

    let stdout = "";
    let stderr = "";

    ytdlp.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    ytdlp.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ytdlp.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`yt-dlp failed (code ${code}): ${stderr}`));
      }

      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (err) {
        reject(new Error("Failed to parse yt-dlp JSON: " + err.message));
      }
    });
  });
}

// /**
//  * Download audio using yt-dlp
//  * @param {string} url - The video/playlist URL
//  * @param {string} outputDir - Directory to save the file (e.g. "./downloads/tmp")
//  * @param {string} cookiesPath - Path to cookies.txt (optional)
//  * @returns {Promise<string>} - Resolves with the final file path
//  */
function downloadYtAudio(url, tempDirPath, cookiesPath = null) {
  console.log("yt-dlp: ", url);
  return new Promise((resolve, reject) => {
    const outputTemplate = `${tempDirPath}/%(title)s.%(ext)s`;
    const args = [
      "-x", // extract audio
      "--embed-metadata",
      "--no-embed-thumbnail",
      "-o",
      outputTemplate, // output path template
      url,
    ];

    if (cookiesPath && fs.existsSync(cookiesPath)) {
      args.push("--cookies", cookiesPath);
    }
    const ytdlp = spawn("yt-dlp", args);

    let stderr = "";

    ytdlp.stderr.on("data", (data) => {
      const line = data.toString();
      stderr += line;
      console.log("[yt-dlp]", line.trim());
    });

    ytdlp.on("close", (code) => {
      if (code !== 0)
        return reject(new Error(`yt-dlp failed (code ${code}): ${stderr}`));
      setTimeout(() => {
        resolve({ status: 201 });
      }, 2000);
    });
  });
}

export { getYtDlpMeta, downloadYtAudio };
