// src/types/index.ts
// Core type definitions for the Giano Codex Agent

// ==========================================
// Configuration Types
// ==========================================

export type SandboxPolicy = "read-only" | "workspace-write" | "full-access";
export type ApprovalPolicy = "never" | "on-request" | "always";
export type RiskLevel = "low" | "medium" | "high";

export interface AgentConfig {
  // Bot
  botToken: string;
  gianoApiUrl: string;
  gianoWsUrl: string;

  // LLM
  llmBaseUrl: string;
  llmApiKey: string;
  llmModel: string;
  llmMaxTokens: number;
  llmTemperature: number;

  // Agent
  defaultWorkspace: string;
  sandboxPolicy: SandboxPolicy;
  approvalPolicy: ApprovalPolicy;

  // Admin
  adminUserIds: string[];
  maxHistoryMessages: number;
  maxFileSizeKb: number;

  // Optional
  autoCreatePR: boolean;
  autoRunTests: boolean;
  enableCostTracking: boolean;
}

// ==========================================
// Message Types
// ==========================================

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  timestamp: Date;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  toolCallId: string;
  success: boolean;
  output: string;
  error?: string;
}

// ==========================================
// Thread Types
// ==========================================

export interface Thread {
  id: string;
  chatId: string;
  userId: string;
  workingDirectory: string;

  // History
  messages: ChatMessage[];

  // Metadata
  createdAt: Date;
  lastActiveAt: Date;
  totalTokensUsed: number;

  // State
  status: "idle" | "running" | "waiting_approval";
  currentTask?: string;
}

// ==========================================
// Tool Types
// ==========================================

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

export interface ToolParameter {
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  enum?: string[];
  items?: { type: string };
  default?: unknown;
}

export type ToolHandler = (
  args: Record<string, unknown>,
  context: ToolContext,
) => Promise<ToolResult>;

export interface ToolContext {
  workingDirectory: string;
  threadId: string;
  userId: string;
  sandboxPolicy: SandboxPolicy;
}

// ==========================================
// Agent Types
// ==========================================

export interface AgentPlan {
  steps: PlanStep[];
  currentStep: number;
  totalEstimatedCost: number;
}

export interface PlanStep {
  id: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  dependencies: string[];
  estimatedTools: string[];
}

export interface AgentRunResult {
  success: boolean;
  output: string;
  toolCalls: ToolCall[];
  tokensUsed: {
    input: number;
    output: number;
  };
  modifiedFiles: string[];
}

// ==========================================
// Approval Types
// ==========================================

export interface ApprovalRequest {
  id: string;
  action: "file_delete" | "command_exec" | "git_push" | "file_write";
  details: {
    command?: string;
    path?: string;
    preview?: string;
  };
  risk: RiskLevel;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
}

// ==========================================
// Task Types
// ==========================================

export type TaskType = "bug_fix" | "feature" | "refactoring" | "investigation";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type TaskComplexity = "low" | "medium" | "high";

export interface TaskMetadata {
  type: TaskType;
  priority: TaskPriority;
  estimated_complexity: TaskComplexity;
  tags: string[];
  depends_on?: string[];
  variables?: Record<string, string>;
}

export interface TaskDefinition {
  metadata: TaskMetadata;
  title: string;
  sections: TaskSections;
  rawContent: string;
}

export interface TaskSections {
  context?: string;
  requirements?: string;
  steps?: ChecklistItem[];
  files?: {
    toCreate?: string[];
    toModify?: string[];
    toInvestigate?: string[];
  };
  acceptanceCriteria?: ChecklistItem[];
  constraints?: string[];
  references?: string[];
  testStrategy?: string;
  rollbackPlan?: string;
}

export interface ChecklistItem {
  text: string;
  completed: boolean;
  subtasks?: ChecklistItem[];
}

// ==========================================
// Execution Types
// ==========================================

export interface ExecutionPlan {
  phases: ExecutionPhase[];
}

export interface ExecutionPhase {
  name: string;
  steps: ExecutionStep[];
  required?: boolean;
}

export interface ExecutionStep {
  type: "read_file" | "agent_task" | "verify" | "command";
  target?: string;
  description?: string;
  goal?: string;
  required?: boolean;
}

export interface ExecutionResult {
  startTime: Date;
  endTime?: Date;
  success: boolean;
  phases: PhaseResult[];
  modifiedFiles: ModifiedFile[];
  testsRun: TestResult[];
  errors: ExecutionError[];
}

export interface PhaseResult {
  name: string;
  steps: StepResult[];
  success: boolean;
  error?: string;
}

export interface StepResult {
  step: string;
  success: boolean;
  output?: string;
  error?: string;
  toolsUsed: string[];
}

export interface ModifiedFile {
  path: string;
  diff: string;
  backupPath?: string;
}

export interface TestResult {
  name: string;
  passed: boolean;
  output: string;
}

export interface ExecutionError {
  phase: string;
  error: string;
}

// ==========================================
// Event Types (Streaming)
// ==========================================

export type AgentEvent =
  | { type: "turn.started"; threadId: string }
  | { type: "item.started"; item: { type: string; name?: string } }
  | { type: "item.completed"; item: { type: string; result?: string } }
  | { type: "text.delta"; delta: string }
  | { type: "turn.completed"; result: AgentRunResult }
  | { type: "error"; error: string };

export type EventHandler = (event: AgentEvent) => void | Promise<void>;
