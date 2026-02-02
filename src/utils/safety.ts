// src/utils/safety.ts
// Security validation for commands and file paths

import path from "path";
import type { SandboxPolicy } from "../types/index.js";

// Helper to check sandbox policy
export function canWrite(policy: SandboxPolicy): boolean {
  return policy === "workspace-write" || policy === "full-access";
}

export function canExecuteCommands(policy: SandboxPolicy): boolean {
  return policy === "full-access";
}

// Blocked command patterns - NEVER allow these
const BLOCKED_PATTERNS = [
  /rm\s+(-rf?|--recursive)\s+[\/\\]/, // rm -rf /
  /rm\s+(-rf?|--recursive)\s+~/, // rm -rf ~
  /del\s+\/s\s+\/q\s+[A-Z]:\\/i, // Windows recursive delete
  /format\s+[A-Z]:/i, // Windows format
  /mkfs/i, // Linux format
  /dd\s+if=.*of=\/dev/i, // dd to device
  /:\(\)\s*{\s*:\|:\s*&\s*};:/, // Fork bomb
  />\/dev\/sd[a-z]/i, // Write to disk
  /shutdown|reboot|init\s+[0-6]/i, // System shutdown
  /chmod\s+(-R\s+)?777\s+\//i, // chmod 777 /
  /chown\s+-R.*\s+\//i, // chown -R on root
];

// Dangerous patterns that need approval
const DANGEROUS_PATTERNS = [
  /rm\s/i, // Any rm command
  /del\s/i, // Any del command
  /git\s+push/i, // Git push
  /git\s+reset\s+--hard/i, // Git reset hard
  /npm\s+publish/i, // NPM publish
  /docker\s+(rm|rmi|kill)/i, // Docker destructive
  /kubectl\s+delete/i, // K8s delete
  /DROP\s+(TABLE|DATABASE)/i, // SQL drop
  /TRUNCATE\s+TABLE/i, // SQL truncate
];

// Validate command safety
export interface CommandValidation {
  allowed: boolean;
  reason?: string;
  requiresApproval: boolean;
  riskLevel: "low" | "medium" | "high";
}

export function validateCommand(
  command: string,
  policy: SandboxPolicy
): CommandValidation {
  // Always block dangerous patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      return {
        allowed: false,
        reason: "This command is blocked for security reasons",
        requiresApproval: false,
        riskLevel: "high",
      };
    }
  }

  // Check sandbox policy
  if (policy === "read-only") {
    return {
      allowed: false,
      reason: "Command execution not allowed in read-only mode",
      requiresApproval: false,
      riskLevel: "low",
    };
  }

  // Check if requires approval
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return {
        allowed: true,
        requiresApproval: true,
        riskLevel: "high",
      };
    }
  }

  // Check for write operations
  if (
    /npm\s+install|pip\s+install|apt\s+install|brew\s+install/i.test(command)
  ) {
    return {
      allowed: true,
      requiresApproval: policy !== "full-access",
      riskLevel: "medium",
    };
  }

  // Safe command
  return {
    allowed: true,
    requiresApproval: false,
    riskLevel: "low",
  };
}

// Validate file path
export interface PathValidation {
  allowed: boolean;
  reason?: string;
  normalizedPath: string;
}

export function validatePath(
  filePath: string,
  workingDirectory: string,
  policy: SandboxPolicy
): PathValidation {
  // Normalize path
  const normalized = path.resolve(workingDirectory, filePath);
  const workingDirNormalized = path.resolve(workingDirectory);

  // Check for path traversal
  if (!normalized.startsWith(workingDirNormalized)) {
    if (policy !== "full-access") {
      return {
        allowed: false,
        reason: `Path traversal attempt detected. Access denied outside workspace.`,
        normalizedPath: normalized,
      };
    }
  }

  // Block sensitive files
  const sensitivePatterns = [
    /\.env$/i,
    /\.env\.[^.]+$/i,
    /id_rsa|id_ed25519/i,
    /\.aws\/credentials/i,
    /\.ssh\//i,
    /\.git\/config$/i, // Allow other .git files
    /\.npmrc$/i,
    /\.netrc$/i,
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(normalized)) {
      return {
        allowed: false,
        reason: `Access to sensitive file blocked: ${path.basename(normalized)}`,
        normalizedPath: normalized,
      };
    }
  }

  return {
    allowed: true,
    normalizedPath: normalized,
  };
}

// Validate file extension for writes
export function validateWriteExtension(filePath: string): {
  allowed: boolean;
  reason?: string;
} {
  const blockedExtensions = [
    ".exe",
    ".dll",
    ".so",
    ".dylib",
    ".bin",
    ".sh", // Allow with caution
    ".bat",
    ".cmd",
    ".ps1",
    ".vbs",
  ];

  const ext = path.extname(filePath).toLowerCase();

  if (blockedExtensions.includes(ext)) {
    return {
      allowed: false,
      reason: `Writing executable files (${ext}) is not allowed`,
    };
  }

  return { allowed: true };
}

// Sanitize command arguments
export function sanitizeShellArg(arg: string): string {
  // Remove dangerous characters
  return arg.replace(/[;&|`$(){}[\]<>]/g, "");
}

// Get risk level for tool + args combination
export function assessRisk(
  toolName: string,
  args: Record<string, unknown>
): "low" | "medium" | "high" {
  switch (toolName) {
    case "exec_command": {
      const cmd = String(args.command || "");
      for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(cmd)) return "high";
      }
      return "medium";
    }

    case "write_file":
    case "edit_file": {
      const filePath = String(args.path || "");
      if (/package\.json|\.env|config/i.test(filePath)) return "medium";
      return "low";
    }

    case "git": {
      const subcommand = String(args.subcommand || "");
      if (/push|reset|force/i.test(subcommand)) return "high";
      if (/commit|branch|checkout/i.test(subcommand)) return "medium";
      return "low";
    }

    default:
      return "low";
  }
}
