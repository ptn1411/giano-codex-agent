// src/bot/utils/formatter.ts
// Response formatting utilities

import type { AgentRunResult } from "../../types/index.js";

const MAX_RESPONSE_LENGTH = 3000;

export function formatResponse(result: AgentRunResult): string {
  const lines: string[] = [];

  // Status header
  if (result.success) {
    lines.push("✅ **Task Completed**");
  } else {
    lines.push("⚠️ **Task Incomplete**");
  }
  lines.push("");

  // Main output
  if (result.output) {
    const output = truncateText(result.output, 2000);
    lines.push(output);
    lines.push("");
  }

  // Modified files
  if (result.modifiedFiles.length > 0) {
    lines.push("**Modified Files:**");
    for (const file of result.modifiedFiles.slice(0, 10)) {
      lines.push(`• \`${file}\``);
    }
    if (result.modifiedFiles.length > 10) {
      lines.push(`• ... and ${result.modifiedFiles.length - 10} more`);
    }
    lines.push("");
  }

  // Stats
  lines.push("---");
  lines.push(
    `📊 Tools: ${result.toolCalls.length} | ` +
      `Tokens: ${result.tokensUsed.input + result.tokensUsed.output}`
  );

  return truncateText(lines.join("\n"), MAX_RESPONSE_LENGTH);
}

export function formatCodeBlock(code: string, language = ""): string {
  return `\`\`\`${language}\n${code}\n\`\`\``;
}

export function formatDiff(diff: string): string {
  return formatCodeBlock(diff, "diff");
}

export function formatError(error: Error | string): string {
  const message = error instanceof Error ? error.message : error;
  return `❌ **Error**\n\n\`\`\`\n${message}\n\`\`\``;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  const truncated = text.slice(0, maxLength - 50);
  const lastNewline = truncated.lastIndexOf("\n");

  if (lastNewline > maxLength - 200) {
    return truncated.slice(0, lastNewline) + "\n\n... (truncated)";
  }

  return truncated + "\n\n... (truncated)";
}

export function formatFileList(files: string[], title = "Files"): string {
  if (files.length === 0) {
    return "";
  }

  const lines = [`**${title}:**`];
  for (const file of files.slice(0, 20)) {
    lines.push(`• \`${file}\``);
  }
  if (files.length > 20) {
    lines.push(`• ... and ${files.length - 20} more`);
  }

  return lines.join("\n");
}

export function formatProgress(
  current: number,
  total: number,
  label = ""
): string {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round(percentage / 10);
  const empty = 10 - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);

  return `${label ? label + " " : ""}[${bar}] ${percentage}%`;
}
