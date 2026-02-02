/**
 * Skills System - Frontmatter Parser
 * Based on OpenClaw skills-system-blueprint
 */

import type { ParsedSkillFrontmatter, SkillMetadata } from "./types.js";

// ============================================================================
// Frontmatter Parsing
// ============================================================================

/**
 * Parse YAML-like frontmatter from SKILL.md content
 */
export function parseFrontmatter(content: string): ParsedSkillFrontmatter {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match || !match[1]) return {};

  const block = match[1];
  const result: ParsedSkillFrontmatter = {};

  // Parse YAML-like single-line key: value
  const lines = block.split(/\r?\n/);
  let currentKey = "";
  let currentValue = "";

  for (const line of lines) {
    const keyMatch = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (keyMatch && keyMatch[1] && keyMatch[2] !== undefined) {
      if (currentKey) {
        setFrontmatterValue(result, currentKey, currentValue.trim());
      }
      currentKey = keyMatch[1];
      currentValue = keyMatch[2];
    } else if (currentKey && (line.startsWith("  ") || line.startsWith("\t"))) {
      // Continuation of multi-line value
      currentValue += "\n" + line;
    }
  }

  if (currentKey) {
    setFrontmatterValue(result, currentKey, currentValue.trim());
  }

  return result;
}

function setFrontmatterValue(
  result: ParsedSkillFrontmatter,
  key: string,
  value: string
): void {
  switch (key) {
    case "name":
      result.name = value;
      break;
    case "description":
      result.description = value;
      break;
    case "homepage":
      result.homepage = value;
      break;
    case "metadata":
      result.metadata = value;
      break;
    case "user-invocable":
      result["user-invocable"] = value === "true";
      break;
    case "disable-model-invocation":
      result["disable-model-invocation"] = value === "true";
      break;
    case "command-dispatch":
      result["command-dispatch"] = value;
      break;
    case "command-tool":
      result["command-tool"] = value;
      break;
    case "command-arg-mode":
      result["command-arg-mode"] = value;
      break;
  }
}

/**
 * Extract content body after frontmatter
 */
export function extractBody(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  return match?.[1]?.trim() ?? content.trim();
}

/**
 * Parse metadata JSON from frontmatter
 */
export function parseMetadata(
  frontmatter: ParsedSkillFrontmatter
): SkillMetadata | undefined {
  if (!frontmatter.metadata) return undefined;

  try {
    const parsed = JSON.parse(frontmatter.metadata);
    // Extract openclaw-specific metadata
    const openclaw = parsed.openclaw ?? parsed;
    return {
      always: openclaw.always,
      skillKey: openclaw.skillKey,
      primaryEnv: openclaw.primaryEnv,
      emoji: openclaw.emoji,
      homepage: openclaw.homepage ?? frontmatter.homepage,
      os: openclaw.os,
      requires: openclaw.requires,
    };
  } catch {
    return undefined;
  }
}

/**
 * Parse a SKILL.md file and extract all components
 */
export function parseSkillFile(
  content: string,
  path: string
): {
  name: string;
  description: string;
  body: string;
  metadata?: SkillMetadata;
} {
  const frontmatter = parseFrontmatter(content);
  const body = extractBody(content);
  const metadata = parseMetadata(frontmatter);

  // Use filename as fallback name
  const fallbackName = path.split(/[/\\]/).slice(-2, -1)[0] ?? "unknown";

  return {
    name: frontmatter.name ?? fallbackName,
    description: frontmatter.description ?? "",
    body,
    metadata,
  };
}
