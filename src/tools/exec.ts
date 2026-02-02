// src/tools/exec.ts
// Command execution tool

import { spawn } from "child_process";
import type {
  ToolContext,
  ToolDefinition,
  ToolHandler,
  ToolResult,
} from "../types/index.js";
import { canExecuteCommands, validateCommand } from "../utils/safety.js";

export const execCommandDefinition: ToolDefinition = {
  name: "exec_command",
  description:
    "Execute a shell command in the working directory. Use for running builds, tests, git commands, etc.",
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The command to execute",
      },
      timeout: {
        type: "number",
        description: "Timeout in milliseconds. Default: 30000 (30 seconds)",
      },
    },
    required: ["command"],
  },
};

export const execCommandHandler: ToolHandler = async (
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> => {
  const command = String(args.command);
  const timeout = (args.timeout as number) || 30000;

  // Check sandbox policy
  if (!canExecuteCommands(context.sandboxPolicy)) {
    // Allow some safe commands even in workspace-write mode
    const safePatterns = [
      /^(npm|bun|yarn|pnpm)\s+(run|test|build|lint)/i,
      /^(tsc|eslint|prettier)\b/i,
      /^git\s+(status|log|diff|branch|show)/i,
      /^(cat|head|tail|wc|grep)\b/i,
      /^ls\b|^dir\b/i,
    ];

    const isSafe = safePatterns.some((p) => p.test(command));
    if (!isSafe && context.sandboxPolicy !== "full-access") {
      return {
        toolCallId: "",
        success: false,
        output: "",
        error:
          "Command execution requires full-access sandbox policy. This command appears to modify system state.",
      };
    }
  }

  // Validate command
  const validation = validateCommand(command, context.sandboxPolicy);
  if (!validation.allowed) {
    return {
      toolCallId: "",
      success: false,
      output: "",
      error: validation.reason || "Command not allowed",
    };
  }

  // Note: Approval flow would be handled by agent engine, not here
  if (validation.requiresApproval) {
    return {
      toolCallId: "",
      success: false,
      output: "",
      error: `This command requires approval (risk: ${validation.riskLevel}). Command: ${command}`,
    };
  }

  try {
    const result = await executeCommand(
      command,
      context.workingDirectory,
      timeout
    );

    const output = formatOutput(result.stdout, result.stderr, result.exitCode);

    return {
      toolCallId: "",
      success: result.exitCode === 0,
      output,
      error:
        result.exitCode !== 0
          ? `Command exited with code ${result.exitCode}`
          : undefined,
    };
  } catch (error) {
    return {
      toolCallId: "",
      success: false,
      output: "",
      error: `Command execution failed: ${(error as Error).message}`,
    };
  }
};

interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function executeCommand(
  command: string,
  cwd: string,
  timeout: number
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    // Determine shell based on platform
    const isWindows = process.platform === "win32";
    const shell = isWindows ? "cmd.exe" : "/bin/sh";
    const shellArgs = isWindows ? ["/c", command] : ["-c", command];

    const proc = spawn(shell, shellArgs, {
      cwd,
      env: { ...process.env, FORCE_COLOR: "0" },
      timeout,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (error) => {
      reject(error);
    });

    proc.on("close", (code) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? 1,
      });
    });

    // Handle timeout
    setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error(`Command timed out after ${timeout}ms`));
    }, timeout);
  });
}

function formatOutput(
  stdout: string,
  stderr: string,
  exitCode: number
): string {
  const parts: string[] = [];

  if (stdout) {
    parts.push(`stdout:\n${truncateOutput(stdout)}`);
  }

  if (stderr) {
    parts.push(`stderr:\n${truncateOutput(stderr)}`);
  }

  parts.push(`Exit code: ${exitCode}`);

  return parts.join("\n\n");
}

function truncateOutput(output: string, maxLines = 100): string {
  const lines = output.split("\n");
  if (lines.length <= maxLines) {
    return output;
  }

  const head = lines.slice(0, 50).join("\n");
  const tail = lines.slice(-50).join("\n");
  const skipped = lines.length - 100;

  return `${head}\n\n... (${skipped} lines omitted) ...\n\n${tail}`;
}
