// src/tools/git-enhanced.ts
// Enhanced git operations with AI-powered features

import { spawn } from "child_process";
import type {
  ToolContext,
  ToolDefinition,
  ToolHandler,
  ToolResult,
} from "../types/index.js";
import { canExecuteCommands } from "../utils/safety.js";

export const gitEnhancedTool: ToolDefinition = {
  name: "git_enhanced",
  description: `Enhanced git operations with AI features:
- auto_branch: Create a new branch with suggested name
- auto_commit: Commit with AI-generated message based on changes
- status_summary: Get a human-readable status summary
- diff_summary: Get a summary of current changes`,
  parameters: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description: "Operation to perform",
        enum: ["auto_branch", "auto_commit", "status_summary", "diff_summary"],
      },
      branch_prefix: {
        type: "string",
        description:
          "Prefix for auto-generated branch name (e.g., 'feature', 'fix')",
      },
      description: {
        type: "string",
        description: "Description of changes for branch/commit naming",
      },
    },
    required: ["operation"],
  },
};

export const gitEnhancedHandler: ToolHandler = async (
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> => {
  const operation = args.operation as string;
  const branchPrefix = (args.branch_prefix as string) || "feature";
  const description = (args.description as string) || "";

  // Check permissions
  if (!canExecuteCommands(context.sandboxPolicy)) {
    return {
      toolCallId: "",
      success: false,
      output: "",
      error: "Command execution not allowed in current sandbox policy",
    };
  }

  try {
    switch (operation) {
      case "auto_branch":
        return await createAutoBranch(
          context.workingDirectory,
          branchPrefix,
          description
        );

      case "auto_commit":
        return await createAutoCommit(context.workingDirectory, description);

      case "status_summary":
        return await getStatusSummary(context.workingDirectory);

      case "diff_summary":
        return await getDiffSummary(context.workingDirectory);

      default:
        return {
          toolCallId: "",
          success: false,
          output: "",
          error: `Unknown operation: ${operation}`,
        };
    }
  } catch (error) {
    return {
      toolCallId: "",
      success: false,
      output: "",
      error: `Git operation failed: ${error}`,
    };
  }
};

async function runGitCommand(
  args: string[],
  cwd: string
): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const proc = spawn("git", args, { cwd });
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => (stdout += data.toString()));
    proc.stderr.on("data", (data) => (stderr += data.toString()));

    proc.on("close", (code) => {
      resolve({
        success: code === 0,
        output: code === 0 ? stdout.trim() : stderr.trim() || stdout.trim(),
      });
    });

    proc.on("error", (error) => {
      resolve({ success: false, output: error.message });
    });
  });
}

async function createAutoBranch(
  cwd: string,
  prefix: string,
  description: string
): Promise<ToolResult> {
  // Generate branch name from description
  const timestamp = new Date().toISOString().split("T")[0];
  const slug = description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);

  const branchName = slug ? `${prefix}/${slug}` : `${prefix}/${timestamp}`;

  // Check if we're in a git repo
  const checkRepo = await runGitCommand(["rev-parse", "--git-dir"], cwd);
  if (!checkRepo.success) {
    return {
      toolCallId: "",
      success: false,
      output: "",
      error: "Not a git repository",
    };
  }

  // Create and checkout branch
  const result = await runGitCommand(["checkout", "-b", branchName], cwd);

  return {
    toolCallId: "",
    success: result.success,
    output: result.success
      ? `Created and switched to branch: ${branchName}`
      : "",
    error: result.success ? undefined : result.output,
  };
}

async function createAutoCommit(
  cwd: string,
  description: string
): Promise<ToolResult> {
  // Get status to check for changes
  const status = await runGitCommand(["status", "--porcelain"], cwd);
  if (!status.output) {
    return {
      toolCallId: "",
      success: false,
      output: "",
      error: "No changes to commit",
    };
  }

  // Parse changes for commit message
  const lines = status.output.split("\n").filter(Boolean);
  const added = lines.filter(
    (l) => l.startsWith("A") || l.startsWith("??")
  ).length;
  const modified = lines.filter((l) => l.startsWith("M")).length;
  const deleted = lines.filter((l) => l.startsWith("D")).length;

  // Generate commit message
  let commitMsg = description;
  if (!commitMsg) {
    const parts: string[] = [];
    if (added > 0) parts.push(`add ${added} file${added > 1 ? "s" : ""}`);
    if (modified > 0)
      parts.push(`update ${modified} file${modified > 1 ? "s" : ""}`);
    if (deleted > 0)
      parts.push(`remove ${deleted} file${deleted > 1 ? "s" : ""}`);
    commitMsg = parts.join(", ");
  }

  // Stage all changes
  const addResult = await runGitCommand(["add", "-A"], cwd);
  if (!addResult.success) {
    return {
      toolCallId: "",
      success: false,
      output: "",
      error: `Failed to stage changes: ${addResult.output}`,
    };
  }

  // Commit
  const commitResult = await runGitCommand(["commit", "-m", commitMsg], cwd);

  return {
    toolCallId: "",
    success: commitResult.success,
    output: commitResult.success
      ? `Committed: "${commitMsg}"\n\nChanges: +${added} ~${modified} -${deleted}`
      : "",
    error: commitResult.success ? undefined : commitResult.output,
  };
}

async function getStatusSummary(cwd: string): Promise<ToolResult> {
  const [branchResult, statusResult, logResult] = await Promise.all([
    runGitCommand(["branch", "--show-current"], cwd),
    runGitCommand(["status", "--short"], cwd),
    runGitCommand(["log", "-1", "--oneline"], cwd),
  ]);

  const branch = branchResult.output || "unknown";
  const lastCommit = logResult.output || "no commits";
  const changes = statusResult.output || "clean";

  const lines = [
    `**Git Status Summary**`,
    "",
    `**Branch:** \`${branch}\``,
    `**Last Commit:** ${lastCommit}`,
    "",
    "**Changes:**",
    changes === "clean"
      ? "No uncommitted changes"
      : `\`\`\`\n${changes}\n\`\`\``,
  ];

  return {
    toolCallId: "",
    success: true,
    output: lines.join("\n"),
  };
}

async function getDiffSummary(cwd: string): Promise<ToolResult> {
  const diffResult = await runGitCommand(["diff", "--stat"], cwd);
  const stagedResult = await runGitCommand(["diff", "--cached", "--stat"], cwd);

  const lines = ["**Diff Summary**", ""];

  if (stagedResult.output) {
    lines.push(
      "**Staged Changes:**",
      `\`\`\`\n${stagedResult.output}\n\`\`\``,
      ""
    );
  }

  if (diffResult.output) {
    lines.push("**Unstaged Changes:**", `\`\`\`\n${diffResult.output}\n\`\`\``);
  }

  if (!diffResult.output && !stagedResult.output) {
    lines.push("No changes to show.");
  }

  return {
    toolCallId: "",
    success: true,
    output: lines.join("\n"),
  };
}
