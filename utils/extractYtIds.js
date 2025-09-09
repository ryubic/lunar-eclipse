// function extractYouTubeIds(inputUrl) {
//   // extractYouTubeData("https://www.youtube.com/watch?v=x2ZzvgsdEms&list=PL12345")
//   // // { videoId: "x2ZzvgsdEms", playlistId: "PL12345" }

//   // extractYouTubeData("https://www.youtube.com/playlist?list=PL12345")
//   // // { videoId: null, playlistId: "PL12345" }

//   // extractYouTubeData("https://youtu.be/x2ZzvgsdEms?t=60")
//   // // { videoId: "x2ZzvgsdEms", playlistId: null }

//   try {
//     const url = new URL(inputUrl);

//     // Look for videoId
//     let videoId = null;

//     if (url.searchParams.has("v")) {
//       videoId = url.searchParams.get("v");
//     } else if (url.hostname === "youtu.be") {
//       videoId = url.pathname.split("/")[1];
//     } else if (url.pathname.startsWith("/embed/")) {
//       videoId = url.pathname.split("/")[2];
//     } else if (url.pathname.startsWith("/shorts/")) {
//       videoId = url.pathname.split("/")[2];
//     }

//     // Look for playlistId
//     let playlistId = null;
//     if (url.searchParams.has("list")) {
//       playlistId = url.searchParams.get("list");
//     }

//     return { videoId, playlistId };
//   } catch {
//     return { videoId: null, playlistId: null };
//   }
// }

// export { extractYouTubeIds };
