// src/config.ts
// Configuration loader with validation

import { config as loadEnv } from "dotenv";
import { z } from "zod";
import type { AgentConfig, SandboxPolicy } from "./types/index.js";

// Load .env file
loadEnv();

// Configuration Schema
const configSchema = z.object({
  // Bot
  botToken: z.string().min(1, "BOT_TOKEN is required"),
  gianoApiUrl: z.string().url().default("https://messages-api.bug.edu.vn"),
  gianoWsUrl: z.string().url().default("wss://messages-api.bug.edu.vn/bot/ws"),

  // LLM
  llmBaseUrl: z.string().url().default("http://127.0.0.1:8045/v1"),
  llmApiKey: z.string().min(1, "LLM_API_KEY is required"),
  llmModel: z.string().default("claude-opus-4-5-thinking"),
  llmMaxTokens: z.coerce.number().positive().default(8192),
  llmTemperature: z.coerce.number().min(0).max(2).default(0.7),
  // HTTP Tool Configuration
  httpAllowlist: z
    .string()
    .transform((s) =>
      s
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean)
    )
    .default(""),

  // Agent
  defaultWorkspace: z.string().default("./workspace"),
  sandboxPolicy: z
    .enum(["read-only", "workspace-write", "full-access"])
    .default("workspace-write"),
  approvalPolicy: z
    .enum(["never", "on-request", "always"])
    .default("on-request"),

  // Admin
  adminUserIds: z
    .string()
    .transform((s) => s.split(",").filter(Boolean))
    .default(""),
  maxHistoryMessages: z.coerce.number().positive().default(50),
  maxFileSizeKb: z.coerce.number().positive().default(500),

  // Optional Features
  autoCreatePR: z
    .string()
    .transform((s) => s === "true")
    .default("false"),
  autoRunTests: z
    .string()
    .transform((s) => s === "true")
    .default("true"),
  enableCostTracking: z
    .string()
    .transform((s) => s === "true")
    .default("false"),
});

// Parse from environment
function parseConfig(): AgentConfig {
  const env = {
    botToken: process.env.BOT_TOKEN,
    gianoApiUrl: process.env.GIANO_API_URL,
    gianoWsUrl: process.env.GIANO_WS_URL,
    llmBaseUrl: process.env.LLM_BASE_URL,
    llmApiKey: process.env.LLM_API_KEY,
    llmModel: process.env.LLM_MODEL,
    llmMaxTokens: process.env.LLM_MAX_TOKENS,
    llmTemperature: process.env.LLM_TEMPERATURE,
    httpAllowlist: process.env.HTTP_ALLOWLIST,
    defaultWorkspace: process.env.DEFAULT_WORKSPACE,
    sandboxPolicy: process.env.SANDBOX_POLICY,
    approvalPolicy: process.env.APPROVAL_POLICY,
    adminUserIds: process.env.ADMIN_USER_IDS,
    maxHistoryMessages: process.env.MAX_HISTORY_MESSAGES,
    maxFileSizeKb: process.env.MAX_FILE_SIZE_KB,
    autoCreatePR: process.env.AUTO_CREATE_PR,
    autoRunTests: process.env.AUTO_RUN_TESTS,
    enableCostTracking: process.env.ENABLE_COST_TRACKING,
  };

  const result = configSchema.safeParse(env);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new Error(`Configuration validation failed:\n${errors}`);
  }

  return result.data as AgentConfig;
}

// Export singleton config
export const config = parseConfig();

// Helper to check if user is admin
export function isAdmin(userId: string): boolean {
  return config.adminUserIds.includes(userId);
}

// Helper to check sandbox policy
export function canWrite(policy: SandboxPolicy): boolean {
  return policy === "workspace-write" || policy === "full-access";
}

export function canExecuteCommands(policy: SandboxPolicy): boolean {
  return policy === "full-access";
}

// Log config on startup (without sensitive data)
export function logConfig(): void {
  console.log("📋 Configuration loaded:");
  console.log(`   LLM Model: ${config.llmModel}`);
  console.log(`   Sandbox Policy: ${config.sandboxPolicy}`);
  console.log(`   Approval Policy: ${config.approvalPolicy}`);
  console.log(`   Workspace: ${config.defaultWorkspace}`);
  console.log(`   Admin Users: ${config.adminUserIds.length}`);
}
