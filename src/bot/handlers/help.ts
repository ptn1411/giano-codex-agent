// src/bot/handlers/help.ts
// Help command handler

import type { Bot, Context } from "gianobot";
import { isAdmin } from "../middleware/admin.js";

export function setupHelpHandler(bot: Bot): void {
  // /start - Welcome message
  bot.command("start", async (ctx: Context) => {
    await ctx.reply(
      "🤖 **Giano Codex Agent**\n\n" +
        "I'm an AI-powered coding assistant. I can help you with:\n" +
        "• Reading and editing files\n" +
        "• Running commands\n" +
        "• Searching code\n" +
        "• Git operations\n\n" +
        "Use `/help` to see available commands."
    );
  });

  // /help - Show available commands
  bot.command("help", async (ctx: Context) => {
    const lines: string[] = [
      "**📚 Available Commands**",
      "",
      "**Agent Commands:**",
      "`/agent <task>` - Execute a coding task",
      "`/status` - Show current session status",
      "`/reset` - Clear conversation history",
      "",
      "**Examples:**",
      "• `/agent list files in src/`",
      "• `/agent read package.json`",
      "• `/agent add a function to utils.ts`",
      "• `/agent run npm test`",
      "",
      "**Tips:**",
      "• Be specific about what you want",
      "• I'll show you the plan before making changes",
      "• Use `/status` to check progress",
    ];

    // Add admin commands if user is admin
    if (isAdmin(ctx.userId)) {
      lines.push(
        "",
        "**Admin Commands:**",
        "`/config` - Show configuration",
        "`/workspace <path>` - Set working directory"
      );
    }

    await ctx.reply(lines.join("\n"));
  });
}
