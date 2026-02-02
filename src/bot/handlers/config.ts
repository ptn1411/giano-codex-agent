// src/bot/handlers/config.ts
// Config command handler (admin only)

import type { Bot, Context } from "gianobot";
import { getThreadManager } from "../../agent/thread.js";
import { config } from "../../config.js";

export function setupConfigHandler(bot: Bot): void {
  // /config - Show current configuration (admin only)
  bot.command("config", async (ctx: Context) => {
    // Check admin permission
    if (!config.adminUserIds.includes(ctx.userId)) {
      await ctx.reply("🚫 This command is only available to admins.");
      return;
    }

    const lines: string[] = [
      "**⚙️ Configuration**",
      "",
      "**Agent:**",
      `• Workspace: \`${config.defaultWorkspace}\``,
      `• Sandbox: \`${config.sandboxPolicy}\``,
      `• Approval: \`${config.approvalPolicy}\``,
      "",
      "**LLM:**",
      `• Model: \`${config.llmModel}\``,
      `• Max Tokens: ${config.llmMaxTokens}`,
      `• Temperature: ${config.llmTemperature}`,
      "",
      "**Limits:**",
      `• Max History: ${config.maxHistoryMessages} messages`,
      `• Max File Size: ${config.maxFileSizeKb} KB`,
      "",
      "**Features:**",
      `• Auto Create PR: ${config.autoCreatePR ? "✅" : "❌"}`,
      `• Auto Run Tests: ${config.autoRunTests ? "✅" : "❌"}`,
      `• Cost Tracking: ${config.enableCostTracking ? "✅" : "❌"}`,
    ];

    await ctx.reply(lines.join("\n"));
  });

  // /workspace <path> - Set working directory (admin only)
  bot.command("workspace", async (ctx: Context) => {
    if (!config.adminUserIds.includes(ctx.userId)) {
      await ctx.reply("🚫 This command is only available to admins.");
      return;
    }

    const newPath = ctx.args?.join(" ");

    if (!newPath) {
      await ctx.reply(
        `**Current Workspace:** \`${config.defaultWorkspace}\`\n\n` +
          "Usage: `/workspace <path>`"
      );
      return;
    }

    // Update thread's working directory
    const threads = getThreadManager();
    const thread = await threads.getOrCreate(ctx.chatId, ctx.userId);
    thread.workingDirectory = newPath;

    await ctx.reply(`✅ Workspace updated to: \`${newPath}\``);
  });
}
