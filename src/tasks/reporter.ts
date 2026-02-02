// src/tasks/reporter.ts
// Task execution report generation

import fs from "fs/promises";
import type { ParsedTask, TaskExecutionResult, TaskStep } from "./types.js";

export class TaskReporter {
  // Generate a full execution report
  generateReport(result: TaskExecutionResult, task: ParsedTask): string {
    const lines: string[] = [];

    // Header
    lines.push(`# Task Execution Report`);
    lines.push("");
    lines.push(`**Task:** ${task.frontmatter.name}`);
    if (task.frontmatter.description) {
      lines.push(`**Description:** ${task.frontmatter.description}`);
    }
    lines.push("");

    // Status summary
    lines.push("## Summary");
    lines.push("");
    lines.push(`- **Status:** ${result.success ? "✅ Success" : "❌ Failed"}`);
    lines.push(`- **Started:** ${result.startedAt.toISOString()}`);
    lines.push(`- **Completed:** ${result.completedAt.toISOString()}`);
    lines.push(
      `- **Duration:** ${((result.completedAt.getTime() - result.startedAt.getTime()) / 1000).toFixed(1)}s`
    );
    lines.push("");

    // Step results
    lines.push("## Steps");
    lines.push("");

    for (const step of result.steps) {
      const icon = this.getStatusIcon(step.status);
      lines.push(`### ${icon} Step ${step.order + 1}: ${step.description}`);
      lines.push("");
      lines.push(`- **Status:** ${step.status}`);

      if (step.startedAt && step.completedAt) {
        const duration =
          (step.completedAt.getTime() - step.startedAt.getTime()) / 1000;
        lines.push(`- **Duration:** ${duration.toFixed(1)}s`);
      }

      if (step.result) {
        lines.push("");
        lines.push("**Result:**");
        lines.push("```");
        lines.push(this.truncate(step.result, 500));
        lines.push("```");
      }

      if (step.error) {
        lines.push("");
        lines.push("**Error:**");
        lines.push("```");
        lines.push(step.error);
        lines.push("```");
      }

      lines.push("");
    }

    // Modified files
    if (result.modifiedFiles.length > 0) {
      lines.push("## Modified Files");
      lines.push("");
      for (const file of result.modifiedFiles) {
        lines.push(`- \`${file}\``);
      }
      lines.push("");
    }

    // Success criteria check
    if (task.successCriteria.length > 0) {
      lines.push("## Success Criteria");
      lines.push("");
      for (const criteria of task.successCriteria) {
        const passed = result.success; // Could be more granular
        lines.push(`- ${passed ? "✅" : "⬜"} ${criteria}`);
      }
      lines.push("");
    }

    // Errors
    if (result.errors.length > 0) {
      lines.push("## Errors");
      lines.push("");
      for (const error of result.errors) {
        lines.push(`- ❌ ${error}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  // Generate compact summary for chat
  generateChatSummary(result: TaskExecutionResult, task: ParsedTask): string {
    const completed = result.steps.filter(
      (s) => s.status === "completed"
    ).length;
    const total = result.steps.length;
    const icon = result.success ? "✅" : "❌";

    const lines: string[] = [
      `${icon} **${task.frontmatter.name}**`,
      "",
      `**Progress:** ${completed}/${total} steps`,
    ];

    if (result.modifiedFiles.length > 0) {
      lines.push(`**Files Modified:** ${result.modifiedFiles.length}`);
    }

    if (result.errors.length > 0) {
      lines.push(`**Errors:** ${result.errors.length}`);
    }

    return lines.join("\n");
  }

  // Save report to file
  async saveReport(
    result: TaskExecutionResult,
    task: ParsedTask,
    outputPath: string
  ): Promise<string> {
    const report = this.generateReport(result, task);
    await fs.writeFile(outputPath, report, "utf-8");
    return outputPath;
  }

  private getStatusIcon(status: TaskStep["status"]): string {
    const icons: Record<TaskStep["status"], string> = {
      pending: "⬜",
      running: "🔄",
      completed: "✅",
      failed: "❌",
      skipped: "⏭️",
    };
    return icons[status] || "❓";
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...(truncated)";
  }
}

// Singleton
let taskReporter: TaskReporter | null = null;

export function getTaskReporter(): TaskReporter {
  if (!taskReporter) {
    taskReporter = new TaskReporter();
  }
  return taskReporter;
}
