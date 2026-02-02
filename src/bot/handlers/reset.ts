// src/bot/handlers/reset.ts
// Reset command handler

import type { Bot, Context } from "gianobot";
import { getAgentEngine } from "../../agent/index.js";
import { logInfo } from "../../utils/logger.js";

export function setupResetHandler(bot: Bot): void {
  // /reset - Clear current thread
  bot.command("reset", async (ctx: Context) => {
    try {
      const engine = getAgentEngine();
      await engine.reset(ctx.chatId);

      logInfo(`Thread reset by ${ctx.userId} in chat ${ctx.chatId}`);

      await ctx.reply(
        "🔄 **Thread Reset**\n\n" +
          "Your conversation history has been cleared.\n" +
          "Start fresh with `/agent <task>`"
      );
    } catch (error) {
      await ctx.reply("❌ Failed to reset thread: " + String(error));
    }
  });
}
