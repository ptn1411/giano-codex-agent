// src/agent/engine.ts
// Enhanced agent engine with ReAct loop, context tracking, and task management

import { config } from "../config.js";
import { LLMClient, getLLMClient } from "../llm/client.js";
import type { LLMMessage } from "../llm/types.js";
import { MemoryManager, initMemoryManager } from "../memory/index.js";
import {
  filterEligibleSkills,
  loadAllSkills,
  type SkillEntry,
} from "../skills/index.js";
import { ToolRegistry, initializeTools } from "../tools/index.js";
import type {
  AgentEvent,
  AgentRunResult,
  EventHandler,
  Thread,
  ToolContext,
} from "../types/index.js";
import { logError, logInfo, logWarn, logger } from "../utils/logger.js";
import { ContextManager, getContextManager } from "./context.js";
import { buildAgentSystemPrompt } from "./prompt-builder.js";
import { TOOL_ERROR_PROMPT } from "./prompts.js";
import { ThreadManager, getThreadManager } from "./thread.js";
import { TodoManager, getTodoManager } from "./todo.js";

const MAX_ITERATIONS = 15;
const MAX_CONSECUTIVE_ERRORS = 3;

export class AgentEngine {
  private llm: LLMClient;
  private tools: ToolRegistry;
  private threads: ThreadManager;
  private context: ContextManager;
  private todos: TodoManager;
  private memory: MemoryManager;
  private skills: SkillEntry[] = [];
  private eventHandlers: EventHandler[] = [];

  constructor() {
    this.llm = getLLMClient();
    this.tools = initializeTools();
    this.threads = getThreadManager();
    this.context = getContextManager();
    this.todos = getTodoManager();
    this.memory = initMemoryManager({
      workspaceDir: config.defaultWorkspace,
    });

    logger.info("Agent Engine initialized (enhanced)");
    logger.info(`Available tools: ${this.tools.getToolNames().join(", ")}`);
  }

  // Initialize thread manager, memory, and skills
  async init(): Promise<void> {
    await this.threads.init();

    // Index memory files on startup
    try {
      await this.memory.index();
      const stats = this.memory.getStats();
      logger.info(
        `Memory indexed: ${stats.totalChunks} chunks from ${stats.totalFiles} files`
      );
    } catch (e) {
      logger.warn("Failed to index memory:", e);
    }

    // Load skills
    try {
      const allSkills = loadAllSkills({
        workspaceDir: config.defaultWorkspace,
      });
      this.skills = filterEligibleSkills(allSkills);
      logger.info(`Skills loaded: ${this.skills.length} eligible skills`);
    } catch (e) {
      logger.warn("Failed to load skills:", e);
    }
  }

  // Subscribe to agent events
  onEvent(handler: EventHandler): void {
    this.eventHandlers.push(handler);
  }

  // Emit event to all handlers
  private async emit(event: AgentEvent): Promise<void> {
    for (const handler of this.eventHandlers) {
      await handler(event);
    }
  }

  // Run agent for a task
  async run(
    task: string,
    chatId: string,
    userId: string
  ): Promise<AgentRunResult> {
    // Get or create thread
    const thread = await this.threads.getOrCreate(chatId, userId);

    await this.threads.updateStatus(thread.id, "running", task);
    await this.emit({ type: "turn.started", threadId: thread.id });

    try {
      // Build context
      const sessionContext = await this.context.buildContext(
        thread.id,
        thread.workingDirectory
      );
      const contextLine = this.context.formatContextForLLM(sessionContext);

      // Add system message if not present
      if (!thread.messages.find((m) => m.role === "system")) {
        // Use enhanced prompt builder with tool names and runtime info
        const systemMessage = buildAgentSystemPrompt({
          workspaceDir: thread.workingDirectory,
          promptMode: "full",
          toolNames: this.tools.getToolNames(),
          runtimeInfo: {
            agentId: "giano-codex-agent",
            host: require("os").hostname?.() ?? "unknown",
            os: process.platform,
            arch: process.arch,
            model: config.llmModel,
          },
          userTime: new Date().toISOString(),
          extraSystemPrompt: contextLine,
        });
        await this.threads.addMessage(thread.id, {
          role: "system",
          content: systemMessage,
          timestamp: new Date(),
        });
      }

      // Add user message
      await this.threads.addMessage(thread.id, {
        role: "user",
        content: task,
        timestamp: new Date(),
      });

      // Run ReAct loop
      const result = await this.reactLoop(thread);

      await this.threads.updateStatus(thread.id, "idle");
      await this.emit({ type: "turn.completed", result });

      return result;
    } catch (error) {
      logError("Agent run failed", error);
      await this.threads.updateStatus(thread.id, "idle");

      await this.emit({
        type: "error",
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        output: `Error: ${error instanceof Error ? error.message : String(error)}`,
        toolCalls: [],
        tokensUsed: { input: 0, output: 0 },
        modifiedFiles: [],
      };
    }
  }

  // ReAct (Reason + Act) loop with enhanced features
  private async reactLoop(thread: Thread): Promise<AgentRunResult> {
    let iteration = 0;
    let consecutiveErrors = 0;
    const modifiedFiles: string[] = [];
    const allToolCalls: any[] = [];
    let totalTokens = { input: 0, output: 0 };
    let lastOutput = "";

    while (iteration < MAX_ITERATIONS) {
      iteration++;
      logInfo(`ReAct iteration ${iteration}/${MAX_ITERATIONS}`);

      // Check for too many consecutive errors
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        logWarn("Too many consecutive errors, stopping");
        break;
      }

      // Get current messages
      const freshThread = await this.threads.get(thread.id);
      if (!freshThread) break;

      const messages = this.threads.getMessagesForLLM(freshThread);

      // Convert to LLM message format
      const llmMessages: LLMMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
        tool_calls: m.toolCalls?.map((tc) => ({
          id: tc.id,
          type: tc.type,
          function: tc.function,
        })),
        tool_call_id: m.toolCallId,
      }));

      // Call LLM
      const result = await this.llm.complete(
        llmMessages,
        this.tools.getToolsForLLM()
      );

      // Track tokens
      if (result.usage) {
        totalTokens.input += result.usage.prompt_tokens;
        totalTokens.output += result.usage.completion_tokens;
        await this.threads.addTokenUsage(thread.id, result.usage.total_tokens);
      }

      const message = result.message;

      // Debug logging
      logInfo(
        `LLM response: content=${message.content ? message.content.slice(0, 100) + "..." : "(empty)"}`
      );
      logInfo(
        `LLM tool_calls: ${message.tool_calls ? message.tool_calls.length : 0}`
      );
      if (message.tool_calls && message.tool_calls.length > 0) {
        logInfo(
          `Tools called: ${message.tool_calls.map((tc) => tc.function.name).join(", ")}`
        );
      }

      // Handle text content
      if (message.content) {
        lastOutput = message.content;
        await this.emit({ type: "text.delta", delta: message.content });

        await this.threads.addMessage(thread.id, {
          role: "assistant",
          content: message.content,
          timestamp: new Date(),
        });
      }

      // If no tool calls, task is complete
      if (!message.tool_calls || message.tool_calls.length === 0) {
        logInfo(
          `No tool calls, completing with output: ${lastOutput.slice(0, 200)}...`
        );
        return {
          success: true,
          output: lastOutput,
          toolCalls: allToolCalls,
          tokensUsed: totalTokens,
          modifiedFiles: [...new Set(modifiedFiles)],
        };
      }

      // Save assistant message with tool calls
      await this.threads.addMessage(thread.id, {
        role: "assistant",
        content: message.content || "",
        toolCalls: message.tool_calls.map((tc) => ({
          id: tc.id,
          type: tc.type,
          function: tc.function,
        })),
        timestamp: new Date(),
      });

      // Execute tool calls (parallel when possible)
      const toolContext: ToolContext = {
        workingDirectory: thread.workingDirectory,
        threadId: thread.id,
        userId: thread.userId,
        sandboxPolicy: config.sandboxPolicy,
      };

      // Group tool calls for parallel execution
      const toolResults = await this.executeToolsParallel(
        message.tool_calls,
        toolContext,
        thread.id,
        allToolCalls,
        modifiedFiles
      );

      // Check if any tools had errors
      let hasErrors = false;
      for (const { toolCall, toolResult } of toolResults) {
        // Add tool result as message
        const resultContent = toolResult.success
          ? toolResult.output
          : `Error: ${toolResult.error}`;

        await this.threads.addMessage(thread.id, {
          role: "tool",
          content: resultContent,
          toolCallId: toolCall.id,
          timestamp: new Date(),
        });

        if (!toolResult.success) {
          hasErrors = true;
          // Add error guidance
          await this.threads.addMessage(thread.id, {
            role: "system",
            content: TOOL_ERROR_PROMPT(toolResult.error || "Unknown error"),
            timestamp: new Date(),
          });
        }
      }

      if (hasErrors) {
        consecutiveErrors++;
      } else {
        consecutiveErrors = 0;
      }
    }

    // Max iterations or errors reached
    logWarn(`Loop ended: iteration=${iteration}, errors=${consecutiveErrors}`);
    return {
      success: iteration < MAX_ITERATIONS,
      output:
        lastOutput ||
        "Task incomplete. Please provide more specific instructions.",
      toolCalls: allToolCalls,
      tokensUsed: totalTokens,
      modifiedFiles: [...new Set(modifiedFiles)],
    };
  }

  // Execute multiple tools in parallel
  private async executeToolsParallel(
    toolCalls: Array<{
      id: string;
      type: string;
      function: { name: string; arguments: string };
    }>,
    context: ToolContext,
    threadId: string,
    allToolCalls: any[],
    modifiedFiles: string[]
  ): Promise<
    Array<{
      toolCall: (typeof toolCalls)[0];
      toolResult: { success: boolean; output: string; error?: string };
    }>
  > {
    const results: Array<{
      toolCall: (typeof toolCalls)[0];
      toolResult: { success: boolean; output: string; error?: string };
    }> = [];

    // Execute all tool calls in parallel
    const promises = toolCalls.map(async (toolCall) => {
      await this.emit({
        type: "item.started",
        item: { type: "tool", name: toolCall.function.name },
      });

      allToolCalls.push(toolCall);

      const toolResult = await this.tools.execute(
        {
          id: toolCall.id,
          type: "function" as const,
          function: toolCall.function,
        },
        context
      );

      await this.emit({
        type: "item.completed",
        item: {
          type: "tool",
          result: toolResult.success ? "success" : "error",
        },
      });

      // Track context
      try {
        const args = JSON.parse(toolCall.function.arguments);

        // Track file access
        if (toolCall.function.name === "read_file" && args.path) {
          this.context.trackFileAccess(threadId, args.path);
        }

        // Track modifications
        if (
          toolResult.success &&
          (toolCall.function.name === "write_file" ||
            toolCall.function.name === "edit_file")
        ) {
          if (args.path) {
            modifiedFiles.push(args.path);
            this.context.trackFileModified(threadId, args.path);
          }
        }
      } catch {
        // Ignore parse errors
      }

      return { toolCall, toolResult };
    });

    const parallelResults = await Promise.all(promises);
    results.push(...parallelResults);

    return results;
  }

  // Continue thread with additional input
  async continue(threadId: string, message: string): Promise<AgentRunResult> {
    const thread = await this.threads.get(threadId);
    if (!thread) {
      throw new Error(`Thread not found: ${threadId}`);
    }

    // Add user message
    await this.threads.addMessage(threadId, {
      role: "user",
      content: message,
      timestamp: new Date(),
    });

    // Run loop
    await this.threads.updateStatus(threadId, "running", message);
    const result = await this.reactLoop(thread);
    await this.threads.updateStatus(threadId, "idle");

    return result;
  }

  // Get thread info
  async getThread(chatId: string, userId: string): Promise<Thread | null> {
    return this.threads.getOrCreate(chatId, userId);
  }

  // Reset thread
  async reset(chatId: string): Promise<void> {
    // Find thread by chatId and reset
    const threads = await this.threads.getOrCreate(chatId, "system");
    if (threads) {
      await this.threads.reset(threads.id);
      this.context.clear(threads.id);
      this.todos.clear(threads.id);
    }
  }

  // Get todo list for display
  getTodoList(threadId: string): string {
    return this.todos.formatTodos(threadId);
  }

  // Get context summary
  async getContextSummary(
    threadId: string,
    workingDirectory: string
  ): Promise<string> {
    const ctx = await this.context.buildContext(threadId, workingDirectory);
    return this.context.formatContextForLLM(ctx);
  }
}

// Singleton
let agentEngine: AgentEngine | null = null;

export function getAgentEngine(): AgentEngine {
  if (!agentEngine) {
    agentEngine = new AgentEngine();
  }
  return agentEngine;
}
