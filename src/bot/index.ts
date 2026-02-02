// src/bot/index.ts
// GianoBot initialization and setup

import { Bot } from "gianobot";
import { config } from "../config.js";
import { logError, logger, logInfo } from "../utils/logger.js";
import { setupHandlers } from "./handlers/index.js";
import { errorMiddleware, loggingMiddleware } from "./middleware/index.js";

let bot: Bot | null = null;

export function createBot(): Bot {
  if (bot) {
    return bot;
  }

  bot = new Bot(config.botToken, {
    mode: "websocket",
    apiBaseUrl: config.gianoApiUrl,
    wsUrl: config.gianoWsUrl,
    logLevel: "info",
    retryAttempts: 5,
    retryDelay: 2000,
  });

  // Register middleware (order matters)
  bot.use(loggingMiddleware);
  bot.use(errorMiddleware);

  // Setup handlers
  setupHandlers(bot);

  // Event listeners
  bot.on("ready", () => {
    logInfo("Bot connected and ready!");
    console.log("╔══════════════════════════════════════╗");
    console.log("║   🤖 Giano Codex Agent - ONLINE     ║");
    console.log("╠══════════════════════════════════════╣");
    console.log("║   Commands:                          ║");
    console.log("║   /agent <task>  - Execute task      ║");
    console.log("║   /status        - Show status       ║");
    console.log("║   /reset         - Reset thread      ║");
    console.log("║   /help          - Show help         ║");
    console.log("╚══════════════════════════════════════╝");
  });

  bot.on("stopped", () => {
    logInfo("Bot stopped");
  });

  bot.on("error", (error, ctx) => {
    logError("Bot error", error);
    if (ctx) {
      logger.error(`Error in chat ${ctx.chatId}:`, error);
    }
  });

  return bot;
}

export async function startBot(): Promise<void> {
  const botInstance = createBot();

  try {
    await botInstance.start();
  } catch (error) {
    logError("Failed to start bot", error);
    throw error;
  }
}

export async function stopBot(): Promise<void> {
  if (bot) {
    await bot.stop();
    bot = null;
  }
}

export function getBot(): Bot | null {
  return bot;
}

// Graceful shutdown handlers
export function setupGracefulShutdown(): void {
  process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down (SIGINT)...");
    await stopBot();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("🛑 Shutting down (SIGTERM)...");
    await stopBot();
    process.exit(0);
  });

  process.on("uncaughtException", async (error) => {
    console.error("Uncaught exception:", error);
    await stopBot();
    process.exit(1);
  });

  process.on("unhandledRejection", async (reason) => {
    console.error("Unhandled rejection:", reason);
    await stopBot();
    process.exit(1);
  });
}
