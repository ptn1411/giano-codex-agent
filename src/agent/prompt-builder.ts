/**
 * System Prompt Builder
 * Based on OpenClaw system-prompt-blueprint
 *
 * Modular prompt building with sections for:
 * - Identity, Tooling, Safety, Skills, Memory, Workspace
 * - Context files (SOUL.md, TOOLS.md)
 * - Runtime info, Special tokens
 */

// ============================================================================
// Types
// ============================================================================

export type PromptMode = "full" | "minimal" | "none";

export type PromptBuilderParams = {
  // Required
  workspaceDir: string;

  // Mode
  promptMode?: PromptMode;

  // Tools
  toolNames?: string[];
  toolSummaries?: Record<string, string>;

  // Context
  extraSystemPrompt?: string;
  ownerNumbers?: string[];
  contextFiles?: EmbeddedContextFile[];
  skillsPrompt?: string;
  workspaceNotes?: string[];

  // Time
  userTimezone?: string;
  userTime?: string;

  // Runtime
  runtimeInfo?: RuntimeInfo;
};

export type EmbeddedContextFile = {
  path: string;
  content: string;
};

export type RuntimeInfo = {
  agentId?: string;
  host?: string;
  os?: string;
  arch?: string;
  node?: string;
  model?: string;
  defaultModel?: string;
  channel?: string;
  capabilities?: string[];
};

// ============================================================================
// Special Tokens
// ============================================================================

export const SILENT_REPLY_TOKEN = "NO_REPLY";
export const HEARTBEAT_OK_TOKEN = "HEARTBEAT_OK";

// ============================================================================
// Core Tool Summaries
// ============================================================================

const CORE_TOOL_SUMMARIES: Record<string, string> = {
  read_file: "Read file contents",
  write_file: "Create or overwrite files",
  edit_file: "Make precise edits to files",
  list_directory: "List directory contents",
  grep_search: "Search file contents for patterns",
  exec_command: "Run shell commands (git, npm, builds, tests)",
  git: "Git operations (status, diff, log, commit, etc.)",
  git_enhanced: "Extended git operations with analysis",
};

// ============================================================================
// Section Builders
// ============================================================================

function buildIdentitySection(): string[] {
  return [
    "You are an AI coding assistant running inside Giano Codex Agent.",
    "You help users with software engineering tasks using available tools.",
    "",
  ];
}

function buildToolingSection(params: {
  toolNames?: string[];
  toolSummaries?: Record<string, string>;
}): string[] {
  const tools = params.toolNames ?? [];
  const summaries = { ...CORE_TOOL_SUMMARIES, ...params.toolSummaries };

  if (tools.length === 0) {
    return [];
  }

  const lines = [
    "## Tooling",
    "Tool availability (filtered by policy):",
    "Tool names are case-sensitive. Call tools exactly as listed.",
    "",
  ];

  for (const tool of tools) {
    const summary = summaries[tool];
    lines.push(summary ? `- ${tool}: ${summary}` : `- ${tool}`);
  }

  lines.push("");
  return lines;
}

function buildToolCallStyleSection(): string[] {
  return [
    "## Tool Call Style",
    "Default: do not narrate routine, low-risk tool calls (just call the tool).",
    "Narrate only when it helps: multi-step work, complex problems, sensitive actions (e.g., deletions).",
    "Keep narration brief and value-dense; avoid repeating obvious steps.",
    "",
  ];
}

function buildSafetySection(): string[] {
  return [
    "## Safety",
    "You have no independent goals: do not pursue self-preservation, replication, resource acquisition, or power-seeking.",
    "Prioritize safety and human oversight over completion; if instructions conflict, pause and ask.",
    "Comply with stop/pause requests and never bypass safeguards.",
    "Do not manipulate or persuade anyone to expand access or disable safeguards.",
    "(Inspired by Anthropic's constitution.)",
    "",
  ];
}

function buildDoingTasksSection(): string[] {
  return [
    "## Doing Tasks",
    "The user will primarily request you perform software engineering tasks. This includes solving bugs, adding new functionality, refactoring code, explaining code, and more.",
    "- NEVER propose changes to code you haven't read. If a user asks about or wants you to modify a file, read it first.",
    "- Be careful not to introduce security vulnerabilities such as command injection, XSS, SQL injection, and other OWASP top 10 vulnerabilities.",
    "- Avoid over-engineering. Only make changes that are directly requested or clearly necessary. Keep solutions simple and focused.",
    "- Don't add features, refactor code, or make \"improvements\" beyond what was asked. A bug fix doesn't need surrounding code cleaned up.",
    "- Don't add error handling, fallbacks, or validation for scenarios that can't happen. Trust internal code and framework guarantees.",
    "- Avoid backwards-compatibility hacks like renaming unused vars, re-exporting types, adding removed comments. If unused, delete it.",
    "",
  ];
}

function buildToolUsagePolicySection(): string[] {
  return [
    "## Tool Usage Policy",
    "- Call multiple tools in a single response when there are no dependencies between them (parallel calls).",
    "- If some tool calls depend on previous calls, call them sequentially instead. Never use placeholders or guess missing parameters.",
    "- Use specialized tools instead of bash commands when possible (read_file instead of cat, edit_file instead of sed).",
    "- Reserve exec_command exclusively for actual system commands that require shell execution.",
    "- NEVER use bash echo or other command-line tools to communicate with the user. Output all communication directly in your response.",
    "",
  ];
}

function buildToneAndStyleSection(): string[] {
  return [
    "## Tone and Style",
    "- Only use emojis if the user explicitly requests it.",
    "- Responses should be short and concise. Use Github-flavored markdown for formatting.",
    "- Output text to communicate with the user; only use tools to complete tasks.",
    "- NEVER create files unless absolutely necessary. ALWAYS prefer editing existing files.",
    "- Do not use a colon before tool calls. Use periods instead.",
    "",
    "## Professional Objectivity",
    "Prioritize technical accuracy and truthfulness over validating the user's beliefs.",
    "Focus on facts and problem-solving, providing direct, objective technical info without superlatives or emotional validation.",
    "Honest application of rigorous standards to all ideas. Disagree when necessary, even if not what the user wants to hear.",
    'Avoid over-the-top validation or excessive praise like "You\'re absolutely right".',
    "",
    "## No Time Estimates",
    "Never give time estimates for how long tasks will take. Focus on what needs to be done, not how long it might take.",
    "Break work into actionable steps and let users judge timing for themselves.",
    "",
  ];
}

function buildWorkspaceSection(params: {
  workspaceDir: string;
  workspaceNotes?: string[];
}): string[] {
  const lines = [
    "## Workspace",
    `Your working directory is: ${params.workspaceDir}`,
    "Treat this directory as the single global workspace for file operations unless explicitly instructed otherwise.",
  ];

  if (params.workspaceNotes?.length) {
    lines.push(...params.workspaceNotes);
  }

  lines.push("");
  return lines;
}

function buildTimeSection(params: {
  userTimezone?: string;
  userTime?: string;
}): string[] {
  if (!params.userTimezone && !params.userTime) {
    return [];
  }

  const lines = ["## Current Date & Time"];
  if (params.userTimezone) {
    lines.push(`Time zone: ${params.userTimezone}`);
  }
  if (params.userTime) {
    lines.push(`Current time: ${params.userTime}`);
  }
  lines.push("");
  return lines;
}

function buildUserIdentitySection(ownerNumbers?: string[]): string[] {
  if (!ownerNumbers?.length) {
    return [];
  }
  return [
    "## User Identity",
    `Owner: ${ownerNumbers.join(", ")}. Treat messages from these as the primary user.`,
    "",
  ];
}

function buildSkillsSection(params: { skillsPrompt?: string }): string[] {
  if (!params.skillsPrompt?.trim()) {
    return [];
  }

  return [
    "## Skills (mandatory)",
    "Before replying: scan <available_skills> <description> entries.",
    "- If exactly one skill clearly applies: read its SKILL.md, then follow it.",
    "- If multiple could apply: choose the most specific one.",
    "- If none clearly apply: do not read any SKILL.md.",
    "",
    params.skillsPrompt.trim(),
    "",
  ];
}

function buildSilentRepliesSection(): string[] {
  return [
    "## Silent Replies",
    `When you have nothing to say, respond with ONLY: ${SILENT_REPLY_TOKEN}`,
    "",
    "⚠️ Rules:",
    "- It must be your ENTIRE message — nothing else",
    `- Never append it to an actual response`,
    "- Never wrap it in markdown or code blocks",
    "",
  ];
}

function buildContextFilesSection(
  contextFiles?: EmbeddedContextFile[]
): string[] {
  if (!contextFiles?.length) {
    return [];
  }

  const hasSoulFile = contextFiles.some((file) => {
    const baseName = file.path.split("/").pop() ?? file.path;
    return baseName.toLowerCase() === "soul.md";
  });

  const lines = [
    "# Project Context",
    "",
    "The following project context files have been loaded:",
  ];

  if (hasSoulFile) {
    lines.push(
      "If SOUL.md is present, embody its persona and tone. Follow its guidance unless higher-priority instructions override it."
    );
  }

  lines.push("");

  for (const file of contextFiles) {
    lines.push(`## ${file.path}`, "", file.content, "");
  }

  return lines;
}

function buildRuntimeSection(runtimeInfo?: RuntimeInfo): string[] {
  if (!runtimeInfo) {
    return [];
  }

  const parts: string[] = [];
  if (runtimeInfo.agentId) parts.push(`agent=${runtimeInfo.agentId}`);
  if (runtimeInfo.host) parts.push(`host=${runtimeInfo.host}`);
  if (runtimeInfo.os) {
    parts.push(
      `os=${runtimeInfo.os}${runtimeInfo.arch ? ` (${runtimeInfo.arch})` : ""}`
    );
  }
  if (runtimeInfo.model) parts.push(`model=${runtimeInfo.model}`);
  if (runtimeInfo.channel) parts.push(`channel=${runtimeInfo.channel}`);

  if (parts.length === 0) {
    return [];
  }

  return ["## Runtime", `Runtime: ${parts.join(" | ")}`, ""];
}

// ============================================================================
// Main Builder
// ============================================================================

export function buildAgentSystemPrompt(params: PromptBuilderParams): string {
  const promptMode = params.promptMode ?? "full";
  const isMinimal = promptMode === "minimal";

  // For "none" mode, return just basic identity
  if (promptMode === "none") {
    return "You are an AI coding assistant running inside Giano Codex Agent.";
  }

  const lines: string[] = [];

  // Identity
  lines.push(...buildIdentitySection());

  // Tooling
  lines.push(
    ...buildToolingSection({
      toolNames: params.toolNames,
      toolSummaries: params.toolSummaries,
    })
  );

  // Tool Call Style
  lines.push(...buildToolCallStyleSection());

  // Safety
  lines.push(...buildSafetySection());

  // Doing Tasks (Claude Code style)
  lines.push(...buildDoingTasksSection());

  // Tool Usage Policy (Claude Code style)
  lines.push(...buildToolUsagePolicySection());

  // Tone and Style (Claude Code style)
  lines.push(...buildToneAndStyleSection());

  // Skills (full mode only)
  if (!isMinimal) {
    lines.push(...buildSkillsSection({ skillsPrompt: params.skillsPrompt }));
  }

  // Workspace
  lines.push(
    ...buildWorkspaceSection({
      workspaceDir: params.workspaceDir,
      workspaceNotes: params.workspaceNotes,
    })
  );

  // User Identity (full mode only)
  if (!isMinimal) {
    lines.push(...buildUserIdentitySection(params.ownerNumbers));
  }

  // Time
  lines.push(
    ...buildTimeSection({
      userTimezone: params.userTimezone,
      userTime: params.userTime,
    })
  );

  // Extra system prompt (group chat or subagent context)
  if (params.extraSystemPrompt?.trim()) {
    const contextHeader = isMinimal
      ? "## Subagent Context"
      : "## Additional Context";
    lines.push(contextHeader, params.extraSystemPrompt.trim(), "");
  }

  // Context files
  lines.push(...buildContextFilesSection(params.contextFiles));

  // Silent Replies (full mode only)
  if (!isMinimal) {
    lines.push(...buildSilentRepliesSection());
  }

  // Runtime
  lines.push(...buildRuntimeSection(params.runtimeInfo));

  return lines.filter(Boolean).join("\n");
}

// ============================================================================
// Utility Functions
// ============================================================================

export function formatToolsForPrompt(tools: string[]): string {
  return tools.map((t) => `- ${t}`).join("\n");
}
