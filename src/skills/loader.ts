/**
 * Skills System - Loader & Eligibility
 * Based on OpenClaw skills-system-blueprint
 */

import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { parseSkillFile } from "./frontmatter.js";
import type {
  Skill,
  SkillEligibilityContext,
  SkillEntry,
  SkillLoadOptions,
  SkillSource,
  SkillStatus,
  SkillStatusReport,
} from "./types.js";

// ============================================================================
// Binary Detection
// ============================================================================

const binaryCache = new Map<string, boolean>();

function hasBinary(name: string): boolean {
  if (binaryCache.has(name)) {
    return binaryCache.get(name)!;
  }

  const pathVar = process.env.PATH ?? "";
  const separator = process.platform === "win32" ? ";" : ":";
  const paths = pathVar.split(separator);
  const extensions =
    process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];

  for (const dir of paths) {
    for (const ext of extensions) {
      const fullPath = join(dir, name + ext);
      if (existsSync(fullPath)) {
        binaryCache.set(name, true);
        return true;
      }
    }
  }

  binaryCache.set(name, false);
  return false;
}

// ============================================================================
// Skill Loading
// ============================================================================

/**
 * Load skills from a single directory
 */
export function loadSkillsFromDir(
  dir: string,
  source: SkillSource
): SkillEntry[] {
  if (!existsSync(dir)) {
    return [];
  }

  const entries: SkillEntry[] = [];
  const items = readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    if (!item.isDirectory()) continue;

    const skillPath = join(dir, item.name, "SKILL.md");
    if (!existsSync(skillPath)) continue;

    try {
      const content = readFileSync(skillPath, "utf-8");
      const parsed = parseSkillFile(content, skillPath);

      const skill: Skill = {
        name: parsed.name,
        description: parsed.description,
        content: parsed.body,
        path: skillPath,
      };

      entries.push({
        skill,
        source,
        metadata: parsed.metadata,
      });
    } catch (e) {
      // Skip invalid skill files
      console.error(`Failed to load skill from ${skillPath}:`, e);
    }
  }

  return entries;
}

/**
 * Load all skills with precedence merging
 */
export function loadAllSkills(options: SkillLoadOptions): SkillEntry[] {
  const skillMap = new Map<string, SkillEntry>();

  // 1. Bundled (lowest precedence)
  if (options.bundledSkillsDir) {
    const bundled = loadSkillsFromDir(options.bundledSkillsDir, "bundled");
    for (const entry of bundled) {
      skillMap.set(entry.skill.name, entry);
    }
  }

  // 2. Extra dirs
  for (const dir of options.extraDirs ?? []) {
    const extra = loadSkillsFromDir(dir, "extra");
    for (const entry of extra) {
      skillMap.set(entry.skill.name, entry);
    }
  }

  // 3. Managed (~/.giano-agent/skills)
  if (options.managedSkillsDir) {
    const managed = loadSkillsFromDir(options.managedSkillsDir, "managed");
    for (const entry of managed) {
      skillMap.set(entry.skill.name, entry);
    }
  }

  // 4. Workspace (highest precedence)
  const workspaceSkillsDir = join(options.workspaceDir, "skills");
  const workspace = loadSkillsFromDir(workspaceSkillsDir, "workspace");
  for (const entry of workspace) {
    skillMap.set(entry.skill.name, entry);
  }

  return Array.from(skillMap.values());
}

// ============================================================================
// Skill Eligibility
// ============================================================================

/**
 * Check if a skill should be included based on requirements
 */
export function shouldIncludeSkill(params: {
  entry: SkillEntry;
  context?: SkillEligibilityContext;
}): { eligible: boolean; missing: string[] } {
  const { entry, context } = params;
  const metadata = entry.metadata;
  const missing: string[] = [];

  // Always-include skills skip checks
  if (metadata?.always === true) {
    return { eligible: true, missing: [] };
  }

  // Check OS requirements
  if (metadata?.os && metadata.os.length > 0) {
    const currentOS = process.platform;
    if (!metadata.os.includes(currentOS)) {
      missing.push(`os:${metadata.os.join("|")}`);
    }
  }

  // Check required binaries
  if (metadata?.requires?.bins) {
    for (const bin of metadata.requires.bins) {
      const hasBin = context?.hasBinary?.(bin) ?? hasBinary(bin);
      if (!hasBin) {
        missing.push(`bin:${bin}`);
      }
    }
  }

  // Check any-of binaries
  if (metadata?.requires?.anyBins?.length) {
    const anyBins = metadata.requires.anyBins;
    const hasAny = anyBins.some(
      (bin) => context?.hasBinary?.(bin) ?? hasBinary(bin)
    );
    if (!hasAny) {
      missing.push(`anyBin:${anyBins.join("|")}`);
    }
  }

  // Check required env vars
  if (metadata?.requires?.env) {
    for (const envName of metadata.requires.env) {
      const hasEnv = context?.hasEnv?.(envName) ?? !!process.env[envName];
      if (!hasEnv) {
        missing.push(`env:${envName}`);
      }
    }
  }

  return {
    eligible: missing.length === 0,
    missing,
  };
}

/**
 * Filter skills by eligibility
 */
export function filterEligibleSkills(
  entries: SkillEntry[],
  context?: SkillEligibilityContext
): SkillEntry[] {
  return entries.filter((entry) => {
    const { eligible } = shouldIncludeSkill({ entry, context });
    return eligible;
  });
}

// ============================================================================
// Skill Status Report
// ============================================================================

/**
 * Generate a status report for all skills
 */
export function getSkillsStatusReport(
  entries: SkillEntry[],
  workspaceDir: string,
  context?: SkillEligibilityContext
): SkillStatusReport {
  const skills: SkillStatus[] = entries.map((entry) => {
    const { eligible, missing } = shouldIncludeSkill({ entry, context });
    return {
      name: entry.skill.name,
      description: entry.skill.description,
      source: entry.source,
      eligible,
      disabled: false,
      missing: missing.length > 0 ? missing : undefined,
    };
  });

  return {
    workspaceDir,
    skills,
  };
}

// ============================================================================
// Format for System Prompt
// ============================================================================

/**
 * Format eligible skills for inclusion in system prompt
 */
export function formatSkillsForPrompt(entries: SkillEntry[]): string {
  if (entries.length === 0) {
    return "";
  }

  const lines = ["<available_skills>"];

  for (const entry of entries) {
    const emoji = entry.metadata?.emoji ?? "📦";
    lines.push(
      `<skill name="${entry.skill.name}" description="${entry.skill.description}" emoji="${emoji}" />`
    );
  }

  lines.push("</available_skills>");

  return lines.join("\n");
}

/**
 * Get the full content of a skill for the agent
 */
export function getSkillContent(entry: SkillEntry): string {
  const baseDirPlaceholder = entry.skill.path.replace(/[/\\]SKILL\.md$/, "");
  return entry.skill.content.replace(/\{baseDir\}/g, baseDirPlaceholder);
}
