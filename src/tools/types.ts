/**
 * Core Types for Tools System
 * Based on OpenClaw tools-system-blueprint
 */

// ============================================================================
// Tool Result Types
// ============================================================================

export type ToolResultContent =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

export interface AgentToolResult<T = unknown> {
  content: ToolResultContent[];
  details?: T;
}

// ============================================================================
// Tool Definition Types
// ============================================================================

export interface ToolDefinition {
  name: string;
  label?: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (
    toolCallId: string,
    params: Record<string, unknown>,
    context?: ToolExecutionContext
  ) => Promise<AgentToolResult>;
}

export type AnyAgentTool = ToolDefinition;

// ============================================================================
// Tool Execution Context
// ============================================================================

export interface ToolExecutionContext {
  workingDir: string;
  sessionKey?: string;
  userId?: string;
  chatId?: string;
  abortSignal?: AbortSignal;
}

// ============================================================================
// Tool Policy Types
// ============================================================================

export interface ToolPolicy {
  allow?: string[]; // Allowlist patterns (e.g., "*", "exec", "file*")
  deny?: string[]; // Denylist patterns
}

export type CompiledPattern =
  | { kind: "all" } // "*"
  | { kind: "exact"; value: string } // "exec"
  | { kind: "glob"; regex: RegExp }; // "session*"

// ============================================================================
// Tool Call Types (for LLM)
// ============================================================================

export interface LLMToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolCallResult {
  toolCallId: string;
  success: boolean;
  output: string;
  error?: string;
}

// ============================================================================
// Schema Types (for LLM compatibility)
// ============================================================================

export interface ToolSchema {
  type: "object";
  properties: Record<string, PropertySchema>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface PropertySchema {
  type: string;
  description?: string;
  enum?: string[];
  default?: unknown;
  items?: PropertySchema;
}

// ============================================================================
// Registry Types
// ============================================================================

export interface RegisteredTool {
  definition: ToolDefinition;
  enabled: boolean;
  metadata?: {
    category?: string;
    tags?: string[];
    dangerous?: boolean;
  };
}

export interface ToolRegistryOptions {
  workingDir: string;
  policy?: ToolPolicy;
  context?: Partial<ToolExecutionContext>;
}
