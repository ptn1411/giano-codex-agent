// src/agent/index.ts
// Agent module exports

export { ApprovalManager, getApprovalManager } from "./approval.js";
export { ContextManager, getContextManager } from "./context.js";
export type { SessionContext } from "./context.js";
export { AgentEngine, getAgentEngine } from "./engine.js";
export { PlanningEngine, getPlanningEngine } from "./planning.js";
export type { PlanningResult } from "./planning.js";
export {
  PLANNING_PROMPT,
  SYSTEM_PROMPT,
  TODO_SYSTEM_PROMPT,
  TOOL_ERROR_PROMPT,
  TOOL_USAGE_PROMPT,
  VERIFICATION_PROMPT,
  buildContextMessage,
} from "./prompts.js";
export type { ContextInfo } from "./prompts.js";
export { ThreadManager, getThreadManager } from "./thread.js";
export { TodoManager, getTodoManager } from "./todo.js";
export type { TodoItem, TodoProgress, TodoStatus } from "./todo.js";
export { VerificationEngine, getVerificationEngine } from "./verification.js";
export type { CheckResult, VerificationResult } from "./verification.js";
