// src/bot/handlers/agent.ts
// Main agent command handler

import type { Bot, Context } from "gianobot";
import { getAgentEngine } from "../../agent/index.js";
import { executeCommand, parseCommand } from "../../auto-reply/index.js";
import { formatTaskForAgent } from "../../tasks/executor.js";
import { parseTask } from "../../tasks/parser.js";
import { logError, logInfo } from "../../utils/logger.js";
import { formatResponse } from "../utils/formatter.js";

export function setupAgentHandler(bot: Bot): void {
  // /agent <task> - Execute a coding task
  // /cancel - Cancel current task
  bot.command("cancel", async (ctx: Context) => {
    await handleCancel(ctx);
  });
  bot.command("stop", async (ctx: Context) => {
    await handleCancel(ctx);
  });

  // /resume - Resume last task
  bot.command("resume", async (ctx: Context) => {
    await handleResume(ctx);
  });

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
    await ctx.reply("⏳ Processing your request...");

    try {
      const engine = getAgentEngine();
      await engine.init();

      // Subscribe to events for streaming updates
      // Subscribe to events for streaming updates
      // Filter events for this specific run by checking threadId ownership when possible
      // Since engine.run() resolves AFTER completion, we need to rely on the global event stream
      // and match threadId -> chatId via ThreadManager
      const threadManager = engine["threads"]; // Access private property or use getter if available.
      // Actually engine.run creates the thread. We can predict the threadId via getOrCreate(ctx.chatId, ctx.userId) but that's async.
      // Better strategy: The handler will start listening. When 'turn.started' fires, we check if that thread belongs to this chat.

      let myThreadId: string | null = null;
      let lastUpdate = 0;
      const UPDATE_INTERVAL = 2000;

      const progressHandler = async (event: any) => {
        // 1. Identify thread if starting
        if (event.type === "turn.started") {
          const thread = await threadManager.get(event.threadId);
          if (thread && thread.chatId === ctx.chatId) {
            myThreadId = event.threadId;
            await ctx.reply("🚀 Task started...");
            lastUpdate = Date.now();
          }
          return;
        }

        // 2. Filter subsequent events
        if (!myThreadId || event.threadId !== myThreadId) return;

        const now = Date.now();
        // 3. Handle events
        try {
          if (event.type === "item.started" && event.item?.type === "tool") {
            if (now - lastUpdate > UPDATE_INTERVAL) {
              await ctx.reply(`🛠️ Running tool: \`${event.item.name}\`...`);
              lastUpdate = now;
            }
          } else if (
            event.type === "item.completed" &&
            event.item?.type === "tool"
          ) {
            // Optional: Report completion for long tasks
            if (now - lastUpdate > UPDATE_INTERVAL) {
              await ctx.reply(`✅ Tool \`${event.item.name}\` finished.`);
              lastUpdate = now;
            }
          } else if (event.type === "turn.completed") {
            await ctx.reply(`🏁 Task completed.`);
            // Cleanup listener? AgentEngine doesn't support 'off' easily yet.
            // We rely on 'myThreadId' check or just ignoring after this.
            myThreadId = null;
          } else if (event.type === "error") {
            // Error is handled by engine.run catch block usually, but event is also emitted.
            // We avoid double posting errors here by checking if engine.run catch handles it.
            // Engine.run catch block sends error details, so we might skip here or just log.
          }
        } catch (err) {
          // Ignore send errors
        }
      };

      engine.onEvent(progressHandler);

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

  // Try to parse structured task (YAML/Markdown)
  const taskSpec = parseTask(task);
  let finalTaskPrompt = task;

  if (taskSpec.success && taskSpec.task) {
    logInfo(`Calculated structured task: ${taskSpec.task.title || "Untitled"}`);
    await ctx.reply(
      `📋 **Structured Task Detected**\nObjective: ${taskSpec.task.objective}`
    );
    finalTaskPrompt = formatTaskForAgent(taskSpec.task);
  }

  try {
    const engine = getAgentEngine();

    await engine.init();

    // Setup progress handler (duplicated from setupAgentHandler for now - ideally refactor to shared util)
    const threadManager = engine["threads"];
    let myThreadId: string | null = null;
    let lastUpdate = 0;
    const UPDATE_INTERVAL = 2000;

    const progressHandler = async (event: any) => {
      if (event.type === "turn.started") {
        const thread = await threadManager.get(event.threadId);
        if (thread && thread.chatId === ctx.chatId) {
          myThreadId = event.threadId;
          await ctx.reply("🚀 Task started...");
          lastUpdate = Date.now();
        }
        return;
      }

      if (!myThreadId || event.threadId !== myThreadId) return;

      const now = Date.now();
      try {
        if (event.type === "item.started" && event.item?.type === "tool") {
          if (now - lastUpdate > UPDATE_INTERVAL) {
            await ctx.reply(`🛠️ Running tool: \`${event.item.name}\`...`);
            lastUpdate = now;
          }
        } else if (
          event.type === "item.completed" &&
          event.item?.type === "tool"
        ) {
          if (now - lastUpdate > UPDATE_INTERVAL) {
            await ctx.reply(`✅ Tool \`${event.item.name}\` finished.`);
            lastUpdate = now;
          }
        } else if (event.type === "turn.completed") {
          await ctx.reply(`🏁 Task completed.`);
          myThreadId = null;
        }
      } catch (err) {
        // Ignore
      }
    };

    engine.onEvent(progressHandler);

    const result = await engine.run(finalTaskPrompt, ctx.chatId, ctx.userId);
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

async function handleCancel(ctx: Context): Promise<void> {
  const engine = getAgentEngine();
  try {
    const thread = await engine.getThread(ctx.chatId, ctx.userId);
    if (thread && thread.status === "running") {
      const threadManager = engine["threads"];
      await threadManager.cancel(thread.id);
      await ctx.reply(`🛑 Cancelling task...`);
    } else {
      await ctx.reply("ℹ️ No running task found to cancel.");
    }
  } catch (e) {
    await ctx.reply("❌ Failed to cancel task.");
  }
}

async function handleResume(ctx: Context): Promise<void> {
  const engine = getAgentEngine();
  try {
    const thread = await engine.getThread(ctx.chatId, ctx.userId);
    if (!thread) {
      await ctx.reply("ℹ️ No task history found.");
      return;
    }

    if (thread.status === "running") {
      await ctx.reply("ℹ️ Task is already running.");
      return;
    }

    await ctx.reply("▶️ Resuming previous task...");
    await engine.continue(
      thread.id,
      "Please resume the task from where you left off."
    );
  } catch (e) {
    await ctx.reply(
      `❌ Failed to resume: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}
