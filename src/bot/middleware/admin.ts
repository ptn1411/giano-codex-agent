// src/bot/middleware/admin.ts
// Admin-only middleware for bot

import type { Context } from "gianobot";
import { config } from "../../config.js";

export const adminMiddleware = async (
  ctx: Context,
  next: () => Promise<void>
): Promise<void> => {
  if (config.adminUserIds.includes(ctx.userId)) {
    await next();
  } else {
    await ctx.reply("🚫 You don't have permission to use this command.");
  }
};

// Helper to check if user is admin
export function isAdmin(userId: string): boolean {
  return config.adminUserIds.includes(userId);
}
