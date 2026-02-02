/**
 * Helper Utilities for Tools
 * Based on OpenClaw tools-system-blueprint
 */

import type { AgentToolResult, ToolResultContent } from "./types.js";

// ============================================================================
// Parameter Reading Helpers
// ============================================================================

/**
 * Safely read a string parameter from tool arguments
 */
export function readStringParam(
  params: Record<string, unknown>,
  key: string,
  options?: { required?: boolean; trim?: boolean; allowEmpty?: boolean }
): string | undefined {
  const { required = false, trim = true, allowEmpty = false } = options ?? {};
  const raw = params[key];

  if (typeof raw !== "string") {
    if (required) throw new Error(`Parameter "${key}" is required`);
    return undefined;
  }

  const value = trim ? raw.trim() : raw;
  if (!value && !allowEmpty) {
    if (required) throw new Error(`Parameter "${key}" cannot be empty`);
    return undefined;
  }

  return value;
}

/**
 * Safely read a number parameter from tool arguments
 */
export function readNumberParam(
  params: Record<string, unknown>,
  key: string,
  options?: {
    required?: boolean;
    integer?: boolean;
    min?: number;
    max?: number;
  }
): number | undefined {
  const { required = false, integer = false, min, max } = options ?? {};
  const raw = params[key];

  let value: number | undefined;

  if (typeof raw === "number" && Number.isFinite(raw)) {
    value = integer ? Math.trunc(raw) : raw;
  } else if (typeof raw === "string") {
    const parsed = Number.parseFloat(raw.trim());
    if (Number.isFinite(parsed)) {
      value = integer ? Math.trunc(parsed) : parsed;
    }
  }

  if (value === undefined) {
    if (required) throw new Error(`Parameter "${key}" is required`);
    return undefined;
  }

  if (min !== undefined && value < min) {
    throw new Error(`Parameter "${key}" must be >= ${min}`);
  }
  if (max !== undefined && value > max) {
    throw new Error(`Parameter "${key}" must be <= ${max}`);
  }

  return value;
}

/**
 * Safely read a boolean parameter from tool arguments
 */
export function readBooleanParam(
  params: Record<string, unknown>,
  key: string,
  options?: { required?: boolean; defaultValue?: boolean }
): boolean | undefined {
  const { required = false, defaultValue } = options ?? {};
  const raw = params[key];

  if (typeof raw === "boolean") {
    return raw;
  }

  if (typeof raw === "string") {
    const lower = raw.toLowerCase().trim();
    if (lower === "true" || lower === "1" || lower === "yes") return true;
    if (lower === "false" || lower === "0" || lower === "no") return false;
  }

  if (raw === undefined || raw === null) {
    if (defaultValue !== undefined) return defaultValue;
    if (required) throw new Error(`Parameter "${key}" is required`);
    return undefined;
  }

  throw new Error(`Parameter "${key}" must be a boolean`);
}

/**
 * Safely read a string array parameter from tool arguments
 */
export function readStringArrayParam(
  params: Record<string, unknown>,
  key: string,
  options?: { required?: boolean }
): string[] | undefined {
  const { required = false } = options ?? {};
  const raw = params[key];

  if (Array.isArray(raw)) {
    const values = raw
      .filter((entry) => typeof entry === "string")
      .map((entry) => (entry as string).trim())
      .filter(Boolean);

    if (values.length === 0 && required) {
      throw new Error(`Parameter "${key}" is required`);
    }
    return values.length > 0 ? values : undefined;
  }

  if (typeof raw === "string") {
    const value = raw.trim();
    return value ? [value] : undefined;
  }

  if (required) throw new Error(`Parameter "${key}" is required`);
  return undefined;
}

// ============================================================================
// Result Builders
// ============================================================================

/**
 * Create a JSON result for tool output
 */
export function jsonResult<T>(payload: T): AgentToolResult<T> {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2),
      },
    ],
    details: payload,
  };
}

/**
 * Create a text result for tool output
 */
export function textResult(text: string): AgentToolResult<string> {
  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
    details: text,
  };
}

/**
 * Create an error result for tool output
 */
export function errorResult(
  message: string,
  details?: unknown
): AgentToolResult {
  return {
    content: [
      {
        type: "text",
        text: `Error: ${message}`,
      },
    ],
    details: { error: message, ...((details as object) ?? {}) },
  };
}

/**
 * Create an image result for tool output
 */
export function imageResult(params: {
  label: string;
  path: string;
  base64: string;
  mimeType: string;
  extraText?: string;
}): AgentToolResult {
  const content: ToolResultContent[] = [
    { type: "text", text: params.extraText ?? `MEDIA:${params.path}` },
    { type: "image", data: params.base64, mimeType: params.mimeType },
  ];

  return {
    content,
    details: { path: params.path, label: params.label },
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Truncate text to a maximum length
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix = "..."
): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Normalize path separators
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

/**
 * Check if a path is within the allowed directory
 */
export function isPathWithinDir(filePath: string, allowedDir: string): boolean {
  const normalizedPath = normalizePath(filePath).toLowerCase();
  const normalizedDir = normalizePath(allowedDir).toLowerCase();
  return normalizedPath.startsWith(normalizedDir);
}
