// src/bot/handlers/status.ts
// Status command handler

import type { Bot, Context } from "gianobot";
import { getAgentEngine } from "../../agent/index.js";
import { getThreadManager } from "../../agent/thread.js";

export function setupStatusHandler(bot: Bot): void {
  // /status - Show current thread status
  bot.command("status", async (ctx: Context) => {
    const engine = getAgentEngine();
    const threads = getThreadManager();

    try {
      const thread = await threads.getOrCreate(ctx.chatId, ctx.userId);

      const lines: string[] = [
        "**📊 Agent Status**",
        "",
        `**Thread ID:** \`${thread.id}\``,
        `**Status:** ${formatStatus(thread.status)}`,
        `**Working Directory:** \`${thread.workingDirectory}\``,
        `**Messages:** ${thread.messages.length}`,
        `**Tokens Used:** ${thread.totalTokensUsed.toLocaleString()}`,
        "",
        `**Created:** ${formatDate(thread.createdAt)}`,
        `**Last Active:** ${formatDate(thread.lastActiveAt)}`,
      ];

      if (thread.currentTask) {
        lines.push("", `**Current Task:** ${thread.currentTask}`);
      }

      // Add todo list if available
      const todoList = engine.getTodoList(thread.id);
      if (todoList !== "No tasks.") {
        lines.push("", todoList);
      }

      await ctx.reply(lines.join("\n"));
    } catch (error) {
      await ctx.reply("❌ Failed to get status: " + String(error));
    }
  });
}

function formatStatus(status: string): string {
  switch (status) {
    case "idle":
      return "🟢 Idle";
    case "running":
      return "🟡 Running";
    case "waiting_approval":
      return "🔵 Waiting Approval";
    default:
      return status;
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
