import { z } from "zod";

export const TaskSpecSchema = z.object({
  objective: z.string().min(1, "Objective is required"),
  context: z.string().optional(),
  constraints: z.array(z.string()).optional(),
  steps: z.array(z.string()).min(1, "At least one step is required"),
  files: z.array(z.string()).optional(),
  commandsAllowed: z.array(z.string()).optional(),

  // Optional metadata
  taskId: z.string().optional(),
  title: z.string().optional(),
});

export type TaskSpec = z.infer<typeof TaskSpecSchema>;
