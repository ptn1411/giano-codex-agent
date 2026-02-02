// src/tools/registry.ts
// Tool registry and executor (Enhanced with schema normalization)

import type { LLMTool, LLMToolCall } from "../llm/types.js";
import type {
  ToolContext,
  ToolDefinition,
  ToolHandler,
  ToolResult,
} from "../types/index.js";
import { logger, logToolCall, logToolResult } from "../utils/logger.js";
import { filterToolsByPolicy } from "./policy.js";
import { normalizeToolParameters } from "./schema.js";
import type { ToolPolicy } from "./types.js";

export class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();
  private policy?: ToolPolicy;

  // Set tool policy for filtering
  setPolicy(policy: ToolPolicy): void {
    this.policy = policy;
    logger.debug(
      `Tool policy set: allow=${policy.allow?.join(",") || "*"}, deny=${policy.deny?.join(",") || "none"}`
    );
  }

  // Register a tool
  register(definition: ToolDefinition, handler: ToolHandler): void {
    this.tools.set(definition.name, {
      definition,
      handler,
    });
    logger.debug(`Registered tool: ${definition.name}`);
  }

  // Get all tools as LLM format (with schema normalization and policy filtering)
  getToolsForLLM(): LLMTool[] {
    let tools = Array.from(this.tools.values()).map((t) => ({
      name: t.definition.name,
      description: t.definition.description,
      parameters: t.definition.parameters,
    }));

    // Apply policy filtering
    if (this.policy) {
      tools = filterToolsByPolicy(tools, this.policy);
    }

    // Format for LLM with schema normalization
    return tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: normalizeToolParameters(
          t.parameters as Record<string, unknown>
        ) as LLMTool["function"]["parameters"],
      },
    }));
  }

  // Get tool names
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  // Check if tool exists
  has(name: string): boolean {
    return this.tools.has(name);
  }

  // Execute a single tool call
  async execute(
    toolCall: LLMToolCall,
    context: ToolContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolCall.function.name);

    if (!tool) {
      return {
        toolCallId: toolCall.id,
        success: false,
        output: "",
        error: `Unknown tool: ${toolCall.function.name}`,
      };
    }

    const startTime = Date.now();

    try {
      // Parse arguments
      const args = JSON.parse(toolCall.function.arguments);
      logToolCall(toolCall.function.name, args);

      // Execute handler
      const result = await tool.handler(args, context);

      const duration = Date.now() - startTime;
      logToolResult(toolCall.function.name, result.success, duration);

      return {
        ...result,
        toolCallId: toolCall.id,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logToolResult(toolCall.function.name, false, duration);

      return {
        toolCallId: toolCall.id,
        success: false,
        output: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Execute multiple tool calls (potentially in parallel)
  async executeAll(
    toolCalls: LLMToolCall[],
    context: ToolContext,
    parallel = false
  ): Promise<ToolResult[]> {
    if (parallel) {
      // Check for dependencies first
      const canParallel = this.canExecuteInParallel(toolCalls);

      if (canParallel) {
        return Promise.all(toolCalls.map((tc) => this.execute(tc, context)));
      }
    }

    // Sequential execution
    const results: ToolResult[] = [];
    for (const tc of toolCalls) {
      const result = await this.execute(tc, context);
      results.push(result);
    }
    return results;
  }

  // Check if tool calls can be executed in parallel
  private canExecuteInParallel(toolCalls: LLMToolCall[]): boolean {
    // Simple heuristic: multiple read operations can be parallel
    // Any write operation should be sequential
    const writeTools = ["write_file", "edit_file", "exec_command"];

    for (const tc of toolCalls) {
      if (writeTools.includes(tc.function.name)) {
        return false;
      }
    }

    return true;
  }
}

interface RegisteredTool {
  definition: ToolDefinition;
  handler: ToolHandler;
}

// Singleton instance
let registry: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
  if (!registry) {
    registry = new ToolRegistry();
  }
  return registry;
}
