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
// //  */
// function downloadYtVideo(url, tempDirPath, cookiesPath = null, audioOnly) {
//   console.log("yt-dlp: ", url);
//   return new Promise((resolve, reject) => {
//     const outputTemplate = `${tempDirPath}/%(title)s.%(ext)s`;
//     const args = [
//       "--embed-metadata",
//       "--no-embed-thumbnail",
//       "-o",
//       outputTemplate, // output path template
//     ];

//     if (audioOnly) args.push("-x");
//     if (cookiesPath && fs.existsSync(cookiesPath)) {
//       args.push("--cookies", cookiesPath);
//     }
//     args.push(url)

//     const ytdlp = spawn("yt-dlp", args);

//     let stderr = "";

//     ytdlp.stderr.on("data", (data) => {
//       const line = data.toString();
//       stderr += line;
//       console.log("[yt-dlp]", line.trim());
//     });

//     ytdlp.on("close", (code) => {
//       if (code !== 0)
//         return reject(new Error(`yt-dlp failed (code ${code}): ${stderr}`));
//       setTimeout(() => {
//         resolve(true);
//       }, 2000);
//     });
//   });
// }

// export { getYtDlpMeta, downloadYtVideo };

import path from "path";

function downloadYtVideo(url, tempDirPath, cookiesPath = null, audioOnly) {
  console.log("yt-dlp: ", url);

  return new Promise((resolve, reject) => {
    const outputTemplate = `${tempDirPath}/%(title)s.%(ext)s`;
    const args = [
      "--embed-metadata",
      "--no-embed-thumbnail",
      "-o",
      outputTemplate,
    ];

    if (audioOnly) {
      args.push("-x");
      // args.push("--audio-format", "opus");
      // args.push("--audio-quality", "0");
    } else {
      args.push("-f", "bestvideo+bestaudio");
      args.push("--merge-output-format", "mkv");
    }

    if (cookiesPath && fs.existsSync(cookiesPath)) {
      args.push("--cookies", cookiesPath);
    }
    args.push(url);

    const ytdlp = spawn("yt-dlp", args);

    let stderr = "";

    ytdlp.stderr.on("data", (data) => {
      const line = data.toString();
      stderr += line;
      console.log("[yt-dlp]", line.trim());
    });

    ytdlp.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`yt-dlp failed (code ${code}): ${stderr}`));
      }

      // Get the latest file in tempDirPath
      fs.readdir(tempDirPath, (err, files) => {
        if (err) return reject(err);
        if (!files || files.length === 0)
          return reject(new Error("No file found after yt-dlp finished."));

        // Sort files by modified time descending
        const file = files
          .map((f) => ({
            name: f,
            time: fs.statSync(path.join(tempDirPath, f)).mtime.getTime(),
          }))
          .sort((a, b) => b.time - a.time)[0].name;

        const absolutePath = path.join(tempDirPath, file);
        resolve(absolutePath);
      });
    });
  });
}

export { downloadYtVideo, getYtDlpMeta };
