// src/tasks/executor.ts
// Task execution engine

import { getAgentEngine } from "../agent/engine.js";
import { logger } from "../utils/logger.js";
import { getTaskParser } from "./parser.js";
import type {
  ParsedTask,
  TaskExecutionContext,
  TaskExecutionResult,
  TaskStep,
} from "./types.js";

export class TaskExecutor {
  private runningTasks: Map<string, TaskExecutionResult> = new Map();

  // Execute a parsed task
  async execute(
    task: ParsedTask,
    context: TaskExecutionContext
  ): Promise<TaskExecutionResult> {
    const taskId = context.taskId || `task_${Date.now().toString(36)}`;
    const startedAt = new Date();

    const result: TaskExecutionResult = {
      taskId,
      success: false,
      startedAt,
      completedAt: startedAt,
      steps: [...task.steps],
      modifiedFiles: [],
      errors: [],
      summary: "",
    };

    this.runningTasks.set(taskId, result);

    try {
      // Apply variable substitution
      const parser = getTaskParser();
      const processedTask = parser.substituteVariables(task, context.variables);

      logger.info(`Starting task: ${processedTask.frontmatter.name}`);

      // Execute each step
      for (const step of result.steps) {
        if (step.status === "completed") continue; // Skip already done

        const stepResult = await this.executeStep(step, processedTask, context);

        // Update step in result
        const resultStep = result.steps.find((s) => s.id === step.id);
        if (resultStep) {
          Object.assign(resultStep, stepResult);
        }

        // Stop on failure
        if (stepResult.status === "failed") {
          result.errors.push(stepResult.error || "Step failed");
          break;
        }

        // Collect modified files
        if (stepResult.result) {
          const filesMatch = stepResult.result.match(/Modified: (.+)/);
          if (filesMatch && filesMatch[1]) {
            result.modifiedFiles.push(...filesMatch[1].split(", "));
          }
        }
      }

      // Check success
      const allCompleted = result.steps.every(
        (s) => s.status === "completed" || s.status === "skipped"
      );
      result.success = allCompleted && result.errors.length === 0;

      // Generate summary
      result.summary = this.generateSummary(result, processedTask);
    } catch (error) {
      result.errors.push(String(error));
      result.summary = `Task failed with error: ${error}`;
    } finally {
      result.completedAt = new Date();
      this.runningTasks.delete(taskId);
    }

    return result;
  }

  private async executeStep(
    step: TaskStep,
    task: ParsedTask,
    context: TaskExecutionContext
  ): Promise<TaskStep> {
    const updatedStep = { ...step };
    updatedStep.status = "running";
    updatedStep.startedAt = new Date();

    try {
      logger.info(`Executing step ${step.order + 1}: ${step.description}`);

      // Use agent to execute the step
      const engine = getAgentEngine();
      await engine.init();

      // Build prompt for step execution
      const prompt = this.buildStepPrompt(step, task, context);

      const agentResult = await engine.run(
        prompt,
        context.chatId,
        context.userId
      );

      updatedStep.status = agentResult.success ? "completed" : "failed";
      updatedStep.result = agentResult.output;
      updatedStep.completedAt = new Date();

      if (!agentResult.success) {
        updatedStep.error = "Step execution failed";
      }
    } catch (error) {
      updatedStep.status = "failed";
      updatedStep.error = String(error);
      updatedStep.completedAt = new Date();
    }

    return updatedStep;
  }

  private buildStepPrompt(
    step: TaskStep,
    task: ParsedTask,
    context: TaskExecutionContext
  ): string {
    const parts: string[] = [
      `**Task:** ${task.frontmatter.name}`,
      "",
      `**Step ${step.order + 1}:** ${step.description}`,
    ];

    // Add context if available
    const contextSection = task.sections.find((s) => s.type === "context");
    if (contextSection) {
      parts.push("", "**Context:**", contextSection.content);
    }

    // Add affected files hint
    if (task.affectedFiles.length > 0) {
      parts.push(
        "",
        "**Files to consider:**",
        ...task.affectedFiles.map((f) => `- ${f}`)
      );
    }

    parts.push("", "Execute this step and report the result.");

    return parts.join("\n");
  }

  private generateSummary(
    result: TaskExecutionResult,
    task: ParsedTask
  ): string {
    const completed = result.steps.filter(
      (s) => s.status === "completed"
    ).length;
    const total = result.steps.length;
    const duration =
      (result.completedAt.getTime() - result.startedAt.getTime()) / 1000;

    const lines: string[] = [
      `**Task:** ${task.frontmatter.name}`,
      `**Status:** ${result.success ? "✅ Completed" : "❌ Failed"}`,
      `**Progress:** ${completed}/${total} steps`,
      `**Duration:** ${duration.toFixed(1)}s`,
    ];

    if (result.modifiedFiles.length > 0) {
      lines.push("", "**Modified Files:**");
      lines.push(...result.modifiedFiles.slice(0, 10).map((f) => `- \`${f}\``));
    }

    if (result.errors.length > 0) {
      lines.push("", "**Errors:**");
      lines.push(...result.errors.map((e) => `- ${e}`));
    }

    return lines.join("\n");
  }

  // Get running task status
  getRunningTask(taskId: string): TaskExecutionResult | undefined {
    return this.runningTasks.get(taskId);
  }

  // List running tasks
  getRunningTasks(): TaskExecutionResult[] {
    return Array.from(this.runningTasks.values());
  }
}

// Singleton
let taskExecutor: TaskExecutor | null = null;

export function getTaskExecutor(): TaskExecutor {
  if (!taskExecutor) {
    taskExecutor = new TaskExecutor();
  }
  return taskExecutor;
}
