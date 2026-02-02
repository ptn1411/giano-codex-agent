/**
 * Tool Policy & Filtering
 * Based on OpenClaw tools-system-blueprint
 */

import type { CompiledPattern, ToolPolicy } from "./types.js";

/**
 * Normalize tool name for pattern matching
 */
function normalizeToolName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Compile a pattern string into a matcher
 */
function compilePattern(pattern: string): CompiledPattern {
  const normalized = pattern.trim();

  // Match all
  if (normalized === "*") {
    return { kind: "all" };
  }

  // Contains glob characters
  if (normalized.includes("*") || normalized.includes("?")) {
    // Convert glob to regex
    const regexStr = normalized
      .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape special regex chars
      .replace(/\*/g, ".*") // * -> .*
      .replace(/\?/g, "."); // ? -> .

    return {
      kind: "glob",
      regex: new RegExp(`^${regexStr}$`, "i"),
    };
  }

  // Exact match
  return {
    kind: "exact",
    value: normalizeToolName(normalized),
  };
}

/**
 * Compile multiple patterns
 */
function compilePatterns(patterns?: string[]): CompiledPattern[] {
  if (!patterns || patterns.length === 0) return [];
  return patterns.map(compilePattern);
}

/**
 * Check if a name matches any of the patterns
 */
function matchesAny(name: string, patterns: CompiledPattern[]): boolean {
  for (const pattern of patterns) {
    switch (pattern.kind) {
      case "all":
        return true;
      case "exact":
        if (name === pattern.value) return true;
        break;
      case "glob":
        if (pattern.regex.test(name)) return true;
        break;
    }
  }
  return false;
}

/**
 * Create a tool policy matcher function
 */
export function makeToolPolicyMatcher(
  policy: ToolPolicy
): (name: string) => boolean {
  const deny = compilePatterns(policy.deny);
  const allow = compilePatterns(policy.allow);

  return (name: string): boolean => {
    const normalized = normalizeToolName(name);

    // Deny takes precedence
    if (matchesAny(normalized, deny)) {
      return false;
    }

    // If no allowlist, allow all
    if (allow.length === 0) {
      return true;
    }

    // Check allowlist
    return matchesAny(normalized, allow);
  };
}

/**
 * Filter tools by policy
 */
export function filterToolsByPolicy<T extends { name: string }>(
  tools: T[],
  policy?: ToolPolicy
): T[] {
  if (!policy) return tools;
  const matcher = makeToolPolicyMatcher(policy);
  return tools.filter((tool) => matcher(tool.name));
}

/**
 * Default policy for sub-agents (restricted tools)
 */
export const DEFAULT_SUBAGENT_DENY_TOOLS = [
  // Session management - main agent orchestrates
  "sessions_list",
  "sessions_history",
  "sessions_send",
  "sessions_spawn",
  // System admin - dangerous from subagent
  "gateway",
  "agents_list",
  // Interactive setup
  "whatsapp_login",
  // Status/scheduling
  "session_status",
  "cron",
  // Memory - pass relevant info in spawn prompt instead
  "memory_search",
  "memory_get",
];

/**
 * Create default sub-agent policy
 */
export function createSubagentPolicy(): ToolPolicy {
  return {
    deny: DEFAULT_SUBAGENT_DENY_TOOLS,
  };
}

/**
 * Merge multiple policies (all must allow)
 */
export function mergePolicies(
  ...policies: (ToolPolicy | undefined)[]
): ToolPolicy {
  const deny: string[] = [];
  const allow: string[] = [];

  for (const policy of policies) {
    if (!policy) continue;
    if (policy.deny) deny.push(...policy.deny);
    if (policy.allow) allow.push(...policy.allow);
  }

  return {
    deny: deny.length > 0 ? [...new Set(deny)] : undefined,
    allow: allow.length > 0 ? [...new Set(allow)] : undefined,
  };
}
