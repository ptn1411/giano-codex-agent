/**
 * Skills System - Types
 * Based on OpenClaw skills-system-blueprint
 */

// ============================================================================
// Core Types
// ============================================================================

export interface Skill {
  name: string;
  description: string;
  content: string;
  path: string;
}

export interface SkillMetadata {
  always?: boolean; // Always include (skip other gates)
  skillKey?: string; // Config key override
  primaryEnv?: string; // Env var for apiKey shorthand
  emoji?: string; // UI display emoji
  homepage?: string; // Website URL
  os?: string[]; // darwin, linux, win32
  requires?: {
    bins?: string[]; // Required binaries on PATH
    anyBins?: string[]; // At least one required
    env?: string[]; // Required env vars (or config)
    config?: string[]; // Required config paths (truthy)
  };
}

export interface SkillEntry {
  skill: Skill;
  source: SkillSource;
  metadata?: SkillMetadata;
}

export type SkillSource =
  | "bundled"
  | "managed"
  | "workspace"
  | "extra"
  | "plugin";

export interface SkillConfig {
  enabled?: boolean;
  apiKey?: string;
  env?: Record<string, string>;
}

// ============================================================================
// Frontmatter Types
// ============================================================================

export interface ParsedSkillFrontmatter {
  name?: string;
  description?: string;
  homepage?: string;
  metadata?: string; // JSON string
  "user-invocable"?: boolean;
  "disable-model-invocation"?: boolean;
  "command-dispatch"?: string;
  "command-tool"?: string;
  "command-arg-mode"?: string;
}

// ============================================================================
// Skill Loading Options
// ============================================================================

export interface SkillLoadOptions {
  workspaceDir: string;
  managedSkillsDir?: string;
  bundledSkillsDir?: string;
  extraDirs?: string[];
}

export interface SkillEligibilityContext {
  hasBinary?: (bin: string) => boolean;
  hasEnv?: (name: string) => boolean;
  config?: Record<string, unknown>;
  remote?: {
    platforms?: string[];
    hasBinary?: (bin: string) => boolean;
    hasAnyBin?: (bins: string[]) => boolean;
  };
}

// ============================================================================
// Skill Status Report
// ============================================================================

export interface SkillStatusReport {
  workspaceDir: string;
  skills: SkillStatus[];
}

export interface SkillStatus {
  name: string;
  description: string;
  source: SkillSource;
  eligible: boolean;
  disabled: boolean;
  missing?: string[]; // Missing requirements
}
