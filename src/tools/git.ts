// src/tools/git.ts
// Git operations tool

import { spawn } from "child_process";
import type {
  ToolContext,
  ToolDefinition,
  ToolHandler,
  ToolResult,
} from "../types/index.js";

export const gitDefinition: ToolDefinition = {
  name: "git",
  description:
    "Execute git operations. Supports common git commands for version control.",
  parameters: {
    type: "object",
    properties: {
      subcommand: {
        type: "string",
        description:
          "Git subcommand: status, diff, log, blame, branch, show, add, commit, checkout",
        enum: [
          "status",
          "diff",
          "log",
          "blame",
          "branch",
          "show",
          "add",
          "commit",
          "checkout",
          "stash",
        ],
      },
      args: {
        type: "string",
        description: "Additional arguments for the git command",
      },
    },
    required: ["subcommand"],
  },
};

// Safe git commands that don't modify state
const SAFE_SUBCOMMANDS = ["status", "diff", "log", "blame", "branch", "show"];

// Commands that modify state (need approval in some policies)
const WRITE_SUBCOMMANDS = ["add", "commit", "checkout", "stash"];

export const gitHandler: ToolHandler = async (
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> => {
  const subcommand = String(args.subcommand);
  const extraArgs = String(args.args || "");

  // Validate subcommand
  const allAllowed = [...SAFE_SUBCOMMANDS, ...WRITE_SUBCOMMANDS];
  if (!allAllowed.includes(subcommand)) {
    return {
      toolCallId: "",
      success: false,
      output: "",
      error: `Git subcommand '${subcommand}' is not allowed. Allowed: ${allAllowed.join(", ")}`,
    };
  }

  // Check write permissions
  if (WRITE_SUBCOMMANDS.includes(subcommand)) {
    if (context.sandboxPolicy === "read-only") {
      return {
        toolCallId: "",
        success: false,
        output: "",
        error: `Git ${subcommand} requires write access. Current policy: read-only`,
      };
    }
  }

  // Build command with safe defaults
  let gitCommand = `git ${subcommand}`;

  // Add safe defaults for some commands
  switch (subcommand) {
    case "log":
      gitCommand += " --oneline -n 20";
      break;
    case "diff":
      gitCommand += " --stat";
      break;
    case "status":
      gitCommand += " --short";
      break;
  }

  // Add extra args if provided
  if (extraArgs) {
    gitCommand += ` ${extraArgs}`;
  }

  try {
    const result = await runGit(gitCommand, context.workingDirectory);

    return {
      toolCallId: "",
      success: result.exitCode === 0,
      output: result.output,
      error: result.exitCode !== 0 ? result.error : undefined,
    };
  } catch (error) {
    return {
      toolCallId: "",
      success: false,
      output: "",
      error: `Git command failed: ${(error as Error).message}`,
    };
  }
};

interface GitResult {
  output: string;
  error: string;
  exitCode: number;
}

function runGit(command: string, cwd: string): Promise<GitResult> {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === "win32";
    const shell = isWindows ? "cmd.exe" : "/bin/sh";
    const shellArgs = isWindows ? ["/c", command] : ["-c", command];

    const proc = spawn(shell, shellArgs, {
      cwd,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", reject);

    proc.on("close", (code) => {
      resolve({
        output: stdout.trim(),
        error: stderr.trim(),
        exitCode: code ?? 1,
      });
    });

    // 30 second timeout
    setTimeout(() => {
      proc.kill();
      reject(new Error("Git command timed out"));
    }, 30000);
  });
}
