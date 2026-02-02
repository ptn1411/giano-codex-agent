// src/bot/middleware/logging.ts
// Logging middleware for bot

import type { Context } from "gianobot";
import { logger } from "../../utils/logger.js";

export const loggingMiddleware = async (
  ctx: Context,
  next: () => Promise<void>
): Promise<void> => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  logger.info(`[${timestamp}] ← ${ctx.userId}@${ctx.chatId}: ${ctx.text}`);

  await next();

  const duration = Date.now() - start;
  logger.info(`[${timestamp}] → Response in ${duration}ms`);
};
