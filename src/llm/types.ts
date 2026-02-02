// src/llm/types.ts
// LLM-related type definitions

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: LLMToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface LLMToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, LLMParameter>;
      required?: string[];
    };
  };
}

export interface LLMParameter {
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  enum?: string[];
  items?: { type: string };
  default?: unknown;
}

export interface LLMCompletionRequest {
  model: string;
  messages: LLMMessage[];
  tools?: LLMTool[];
  tool_choice?:
    | "auto"
    | "none"
    | { type: "function"; function: { name: string } };
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface LLMCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: LLMChoice[];
  usage?: LLMUsage;
}

export interface LLMChoice {
  index: number;
  message: LLMMessage;
  finish_reason: "stop" | "tool_calls" | "length" | "content_filter";
}

export interface LLMUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// Streaming types
export interface LLMStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: StreamChoice[];
}

export interface StreamChoice {
  index: number;
  delta: Partial<LLMMessage>;
  finish_reason: string | null;
}
