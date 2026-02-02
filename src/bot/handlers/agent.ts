// src/bot/handlers/agent.ts
// Main agent command handler

import type { Bot, Context } from "gianobot";
import { getAgentEngine } from "../../agent/index.js";
import { executeCommand, parseCommand } from "../../auto-reply/index.js";
import { logError, logInfo } from "../../utils/logger.js";
import { formatResponse } from "../utils/formatter.js";

export function setupAgentHandler(bot: Bot): void {
  // /agent <task> - Execute a coding task
  bot.command("agent", async (ctx: Context) => {
    const task = ctx.args?.join(" ");

    if (!task) {
      await ctx.reply(
        "**Usage:** `/agent <task>`\n\n" +
          "**Examples:**\n" +
          "• `/agent list files in src/`\n" +
          "• `/agent add a hello world function to utils.ts`\n" +
          "• `/agent fix the TypeScript error in index.ts`"
      );
      return;
    }

    logInfo(`Agent task from ${ctx.userId}: ${task}`);

    // Send processing message
    const processingMsg = await ctx.reply("⏳ Processing your request...");

    try {
      const engine = getAgentEngine();
      await engine.init();

      // Subscribe to events for streaming updates
      let lastUpdate = Date.now();
      const UPDATE_INTERVAL = 2000; // Update every 2 seconds

      engine.onEvent(async (event) => {
        const now = Date.now();
        if (
          event.type === "item.started" &&
          now - lastUpdate > UPDATE_INTERVAL
        ) {
          lastUpdate = now;
          // Could update the message here if the API supports editing
        }
      });

      // Run the agent
      const result = await engine.run(task, ctx.chatId, ctx.userId);

      // Format and send response
      const response = formatResponse(result);
      await ctx.reply(response);

      // Log result
      if (result.success) {
        logInfo(
          `Task completed: ${result.modifiedFiles.length} files modified`
        );
      } else {
        logInfo(`Task failed or incomplete`);
      }
    } catch (error) {
      logError("Agent execution error", error);
      await ctx.reply(
        "❌ **Error executing task**\n\n" +
          `\`\`\`\n${error instanceof Error ? error.message : String(error)}\n\`\`\``
      );
    }
  });

  // Handle ALL text messages - bot reads everything and decides whether to act
  bot.on("text", async (ctx: Context) => {
    const text = ctx.text?.trim() || "";

    // Skip empty messages
    if (!text) return;

    // Check for slash commands (auto-reply)
    const parsed = parseCommand(text);
    if (parsed.isCommand && parsed.command !== "agent") {
      const msgContext = {
        from: ctx.userId,
        sessionKey: ctx.chatId,
        body: text,
      };
      const reply = await executeCommand(
        msgContext,
        parsed.command ?? "",
        parsed.args ?? ""
      );
      if (reply) {
        const replies = Array.isArray(reply) ? reply : [reply];
        for (const r of replies) {
          await ctx.reply(r.text ?? "");
        }
      }
      return;
    }

    // For /agent commands in text format, extract the task
    let task = text;
    if (text.startsWith("/agent ")) {
      task = text.slice(7).trim();
    } else if (text.startsWith("@agent ")) {
      task = text.slice(7).trim();
    }

    // Skip if empty after extraction
    if (!task) return;

    logInfo(`Processing message from ${ctx.userId}: ${task.slice(0, 100)}...`);

    // Process the message - let the agent decide what to do
    await handleAgentTask(ctx, task);
  });
}

// Separate function for reuse
async function handleAgentTask(ctx: Context, task: string): Promise<void> {
  logInfo(`Agent task from ${ctx.userId}: ${task}`);

  try {
    const engine = getAgentEngine();
    await engine.init();

    const result = await engine.run(task, ctx.chatId, ctx.userId);
    const response = formatResponse(result);
    await ctx.reply(response);
  } catch (error) {
    logError("Agent execution error", error);
    await ctx.reply(
      "❌ **Error executing task**\n\n" +
        `\`\`\`\n${error instanceof Error ? error.message : String(error)}\n\`\`\``
    );
  }
}
