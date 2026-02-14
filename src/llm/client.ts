// src/llm/client.ts
// Anthropic SDK-based LLM client for Antigravity proxy

import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import { logError, logger } from "../utils/logger.js";
import type { LLMMessage, LLMTool, LLMUsage } from "./types.js";

export class LLMClient {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor() {
    this.client = new Anthropic({
      baseURL: config.llmBaseUrl,
      apiKey: config.llmApiKey,
    });
    this.model = config.llmModel;
    this.maxTokens = config.llmMaxTokens;

    logger.info(
      `LLM Client initialized (Anthropic SDK): ${this.model} @ ${config.llmBaseUrl}`
    );
  }

  // Convert OpenAI-style tools to Anthropic format
  private convertToolsToAnthropic(tools: LLMTool[]): Anthropic.Tool[] {
    return tools.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: {
        type: "object" as const,
        properties: tool.function.parameters.properties,
        required: tool.function.parameters.required || [],
      },
    }));
  }

  // Convert messages to Anthropic format
  private convertMessagesToAnthropic(messages: LLMMessage[]): {
    system: string;
    messages: Anthropic.MessageParam[];
  } {
    let system = "";
    const anthropicMessages: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        system += msg.content + "\n";
      } else if (msg.role === "user") {
        anthropicMessages.push({ role: "user", content: msg.content });
      } else if (msg.role === "assistant") {
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          // Assistant with tool use
          const content: Anthropic.ContentBlockParam[] = [];
          if (msg.content) {
            content.push({ type: "text", text: msg.content });
          }
          for (const tc of msg.tool_calls) {
            content.push({
              type: "tool_use",
              id: tc.id,
              name: tc.function.name,
              input: JSON.parse(tc.function.arguments),
            });
          }
          anthropicMessages.push({ role: "assistant", content });
        } else {
          anthropicMessages.push({ role: "assistant", content: msg.content });
        }
      } else if (msg.role === "tool") {
        // Tool result
        anthropicMessages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: msg.tool_call_id || "",
              content: msg.content,
            },
          ],
        });
      }
    }

    return { system: system.trim(), messages: anthropicMessages };
  }

  // Standard completion (non-streaming)
  async complete(
    messages: LLMMessage[],
    tools?: LLMTool[]
  ): Promise<LLMCompletionResult> {
    try {
      // Debug: log tools being sent
      logger.info(
        `LLM request: ${messages.length} messages, ${tools?.length || 0} tools`
      );
      if (tools && tools.length > 0) {
        logger.info(
          `Tools available: ${tools.map((t) => t.function.name).join(", ")}`
        );
      }

      const { system, messages: anthropicMessages } =
        this.convertMessagesToAnthropic(messages);

      const anthropicTools = tools
        ? this.convertToolsToAnthropic(tools)
        : undefined;

      const requestParams: Anthropic.MessageCreateParamsNonStreaming = {
        model: this.model,
        max_tokens: this.maxTokens,
        system: system || undefined,
        messages: anthropicMessages,
      };

      if (anthropicTools && anthropicTools.length > 0) {
        requestParams.tools = anthropicTools;
        requestParams.tool_choice = { type: "auto" };
      }

      logger.info(
        `LLM Request: model=${this.model}, messages=${anthropicMessages.length}`
      );

      const response = await this.client.messages.create(requestParams);

      // Debug: log response
      logger.info(`LLM response stop_reason: ${response.stop_reason}`);

      // Convert response back to OpenAI-like format
      let content = "";
      const toolCalls: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }> = [];

      for (const block of response.content) {
        if (block.type === "text") {
          content += block.text;
        } else if (block.type === "tool_use") {
          toolCalls.push({
            id: block.id,
            type: "function",
            function: {
              name: block.name,
              arguments: JSON.stringify(block.input),
            },
          });
        }
      }

      logger.info(`LLM response content length: ${content.length}`);
      logger.info(`LLM response tool_calls: ${toolCalls.length}`);

      if (toolCalls.length > 0) {
        for (const tc of toolCalls) {
          logger.info(
            `Tool call: ${tc.function.name}(${tc.function.arguments.slice(0, 100)}...)`
          );
        }
      }

      return {
        message: {
          role: "assistant",
          content,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        },
        finishReason: response.stop_reason || "stop",
        usage: {
          prompt_tokens: response.usage?.input_tokens || 0,
          completion_tokens: response.usage?.output_tokens || 0,
          total_tokens: (() => {
            const inputTokens = response.usage?.input_tokens || 0;
            const outputTokens = response.usage?.output_tokens || 0;
            const totalTokens = inputTokens + outputTokens;
            return totalTokens;
          })(),
        },
      };
    } catch (error) {
      logError("LLM completion failed", error);
      throw error;
    }
  }

  // Streaming completion (simplified - not fully implemented)
  async *stream(
    messages: LLMMessage[],
    tools?: LLMTool[]
  ): AsyncGenerator<StreamEvent> {
    try {
      // For now, use non-streaming and yield at once
      const result = await this.complete(messages, tools);

      if (result.message.content) {
        yield { type: "text", content: result.message.content };
      }

      if (result.message.tool_calls) {
        for (const tc of result.message.tool_calls) {
          yield { type: "tool_start", name: tc.function.name };
          yield {
            type: "tool_call",
            id: tc.id,
            name: tc.function.name,
            arguments: tc.function.arguments,
          };
        }
      }

      yield { type: "done", content: result.message.content };
    } catch (error) {
      logError("LLM stream failed", error);
      yield { type: "error", error: String(error) };
    }
  }

  // Simple text completion without tools
  async ask(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: LLMMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const result = await this.complete(messages);
    return result.message.content;
  }

  // Get token estimate (rough)
  estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}

// Result types
export interface LLMCompletionResult {
  message: LLMMessage;
  finishReason: string;
  usage?: LLMUsage;
}

export type StreamEvent =
  | { type: "text"; content: string }
  | { type: "tool_start"; name: string }
  | { type: "tool_call"; id: string; name: string; arguments: string }
  | { type: "done"; content: string }
  | { type: "error"; error: string };

// (removed unused PartialToolCall type)

// Singleton instance
let llmClient: LLMClient | null = null;

export function getLLMClient(): LLMClient {
  if (!llmClient) {
    llmClient = new LLMClient();
  }
  return llmClient;
}
