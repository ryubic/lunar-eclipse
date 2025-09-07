import connectDB from "./database/index.js";
import TelegramBot from "node-telegram-bot-api";
import "dotenv/config.js";
import { handelYtRequest } from "./services/processor/ytProcessor.js";

const BOT_TOKEN = process.env.BOT_TOKEN;
const CACHE_CHAT_ID = process.env.CACHE_CHAT_ID;

connectDB()
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

const bot = new TelegramBot(BOT_TOKEN, { polling: true,   filepath: false, });

console.log("Bot is running...");

// /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "👋 Hello! Send me a YouTube URL and I’ll process it for you."
  );
});

// listen for messages
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || !text.startsWith("http")) return;

  // Basic YouTube URL check
  const ytRegex =
    /^(https?:\/\/)?((www|music)\.)?youtube\.com\/.*$|^(https?:\/\/)?youtu\.be\/.*$/;

  if (!ytRegex.test(text)) {
    return;
  }

  try {
    await bot.sendMessage(chatId, "Processing your YouTube link...");
    // Call your processor: track is the returned DB doc
    await handelYtRequest(text, bot, chatId, CACHE_CHAT_ID);
  } catch (err) {
    console.error("Processing error:", err);
    await bot.sendMessage(
      chatId,
      `Failed to process your track: ${err.message}`
    );
  }
});
