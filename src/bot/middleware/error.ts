// src/bot/middleware/error.ts
// Error handling middleware for bot

import type { Context } from "gianobot";
import { logError } from "../../utils/logger.js";

export const errorMiddleware = async (
  ctx: Context,
  next: () => Promise<void>
): Promise<void> => {
  try {
    await next();
  } catch (error) {
    logError(`Handler error in chat ${ctx.chatId}`, error);

    try {
      await ctx.reply(
        "❌ An error occurred while processing your request. Please try again."
      );
    } catch {
      // Failed to send error message, ignore
    }
  }
};
