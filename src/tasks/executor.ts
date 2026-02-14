import type { TaskSpec } from "../types/task.js";

export function formatTaskForAgent(task: TaskSpec): string {
  let prompt = `Task Objective: ${task.objective}\n\n`;

  if (task.context) {
    prompt += `Context:\n${task.context}\n\n`;
  }

  if (task.constraints && task.constraints.length > 0) {
    prompt += `Constraints:\n`;
    task.constraints.forEach((c) => (prompt += `- ${c}\n`));
    prompt += `\n`;
  }

  if (task.files && task.files.length > 0) {
    prompt += `Related Files:\n`;
    task.files.forEach((f) => (prompt += `- ${f}\n`));
    prompt += `\n`;
  }

  if (task.commandsAllowed && task.commandsAllowed.length > 0) {
    prompt += `Allowed Commands:\n`;
    task.commandsAllowed.forEach((c) => (prompt += `- \`${c}\`\n`));
    prompt += `\n`;
  }

  prompt += `Steps:\n`;
  task.steps.forEach((s, i) => (prompt += `${i + 1}. ${s}\n`));

  return prompt;
}
