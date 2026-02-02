// src/agent/planning.ts
// Multi-step planning engine for complex tasks

import type { AgentPlan, PlanStep } from "../types/index.js";
import { logger } from "../utils/logger.js";

const MAX_PLANNING_STEPS = 10;

export interface PlanningResult {
  success: boolean;
  plan?: AgentPlan;
  error?: string;
}

export class PlanningEngine {
  // Parse LLM response into a structured plan
  parsePlan(llmResponse: string): PlanningResult {
    try {
      // Try to extract JSON from response
      const jsonMatch = llmResponse.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : llmResponse;

      const parsed = JSON.parse(jsonStr!.trim());

      if (!parsed.steps || !Array.isArray(parsed.steps)) {
        return {
          success: false,
          error: "Invalid plan format: missing steps array",
        };
      }

      const steps: PlanStep[] = parsed.steps
        .slice(0, MAX_PLANNING_STEPS)
        .map((step: any, index: number) => ({
          id: step.id || `step_${index + 1}`,
          description: step.description || step.action || "Unknown step",
          status: "pending" as const,
          dependencies: step.dependencies || [],
          estimatedTools: step.tools || [],
        }));

      const plan: AgentPlan = {
        steps,
        currentStep: 0,
        totalEstimatedCost: 0,
      };

      return { success: true, plan };
    } catch (error) {
      logger.error("Failed to parse plan:", error);
      return { success: false, error: `Failed to parse plan: ${error}` };
    }
  }

  // Get next pending step
  getNextStep(plan: AgentPlan): PlanStep | null {
    return plan.steps.find((step) => step.status === "pending") || null;
  }

  // Update step status
  updateStepStatus(
    plan: AgentPlan,
    stepId: string,
    status: PlanStep["status"]
  ): void {
    const step = plan.steps.find((s) => s.id === stepId);
    if (step) {
      step.status = status;
      if (status === "in_progress") {
        plan.currentStep = plan.steps.indexOf(step);
      }
    }
  }

  // Check if plan is complete
  isPlanComplete(plan: AgentPlan): boolean {
    return plan.steps.every(
      (step) => step.status === "completed" || step.status === "failed"
    );
  }

  // Get plan progress
  getProgress(plan: AgentPlan): {
    completed: number;
    total: number;
    percentage: number;
  } {
    const completed = plan.steps.filter((s) => s.status === "completed").length;
    const total = plan.steps.length;
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  // Format plan for display
  formatPlan(plan: AgentPlan): string {
    const statusIcons: Record<PlanStep["status"], string> = {
      pending: "⬜",
      in_progress: "🔄",
      completed: "✅",
      failed: "❌",
    };

    const lines: string[] = ["**Execution Plan:**", ""];

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      if (!step) continue;
      const icon = statusIcons[step.status];
      lines.push(`${i + 1}. ${icon} ${step.description}`);
    }

    const progress = this.getProgress(plan);
    lines.push(
      "",
      `Progress: ${progress.completed}/${progress.total} (${progress.percentage}%)`
    );

    return lines.join("\n");
  }

  // Check dependencies for a step
  canExecuteStep(plan: AgentPlan, step: PlanStep): boolean {
    if (step.dependencies.length === 0) return true;

    return step.dependencies.every((depId) => {
      const depStep = plan.steps.find((s) => s.id === depId);
      return depStep?.status === "completed";
    });
  }
}

// Singleton
let planningEngine: PlanningEngine | null = null;

export function getPlanningEngine(): PlanningEngine {
  if (!planningEngine) {
    planningEngine = new PlanningEngine();
  }
  return planningEngine;
}
