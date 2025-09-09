import connectDB from "./database/index.js";
import TelegramBot from "node-telegram-bot-api";
import "dotenv/config.js";
import { handelYtRequest } from "./services/processor/ytProcessor.js";

const BOT_TOKEN = process.env.BOT_TOKEN;
const CACHE_CHAT_ID = process.env.CACHE_CHAT_ID;

await connectDB()
  .then(() => console.log("MongoDB Connected !!"))
  .catch((err) => console.error(err));

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log("Bot is running...");

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "Hello! Send me a YouTube link to download the video.\nSend `/x <YouTube link>` to download audio."
  );
});

// Regex for YouTube URLs
const ytRegex =
  /^(https?:\/\/)?((www|music)\.)?youtube\.com\/\S+|^(https?:\/\/)?youtu\.be\/\S+$/i;

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  if (!text) return;

  let isAudio = false;
  let link = text;

  // If message starts with /x, treat as audio request
  if (text.startsWith("/x")) {
    const parts = text.split(" ");
    if (parts.length < 2) {
      return bot.sendMessage(chatId, "Usage: /x <YouTube link>");
    }
    isAudio = true;
    link = parts[1];
  }

  if (!ytRegex.test(link)) return;

  let waitMsg;
  try {
    waitMsg = await bot.sendMessage(
      chatId,
      `Processing your YouTube ${isAudio ? "audio" : "video"} link...`
    );

    // Call processor with mode
    await handelYtRequest(link, bot, chatId, CACHE_CHAT_ID, isAudio);

    await bot.sendMessage(chatId, "✅ Done!");
    console.log("REQUEST FULFILLED:", link);
  } catch (error) {
    console.error("Processing error:", error);
    console.error("REQUEST UNFULFILLED:", link);
    bot.sendMessage(
      chatId,
      "⚠️ Failed to process your request. Please try again later."
    );
  } finally {
    if (waitMsg) await bot.deleteMessage(chatId, waitMsg.message_id);
  }
});
