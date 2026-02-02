// src/tasks/types.ts
// Task system type definitions

export interface TaskFrontmatter {
  name: string;
  description?: string;
  version?: string;
  author?: string;
  created_at?: string;
  depends_on?: string[];
  variables?: Record<string, string>;
  tags?: string[];
}

export interface TaskStep {
  id: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  phase?: string;
  order: number;
  result?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface TaskSection {
  title: string;
  content: string;
  type: "goal" | "context" | "steps" | "files" | "criteria" | "other";
}

export interface ParsedTask {
  frontmatter: TaskFrontmatter;
  sections: TaskSection[];
  steps: TaskStep[];
  affectedFiles: string[];
  successCriteria: string[];
  rawContent: string;
  filePath: string;
}

export interface TaskExecutionContext {
  taskId: string;
  workingDirectory: string;
  variables: Record<string, string>;
  chatId: string;
  userId: string;
}

export interface TaskExecutionResult {
  taskId: string;
  success: boolean;
  startedAt: Date;
  completedAt: Date;
  steps: TaskStep[];
  modifiedFiles: string[];
  errors: string[];
  summary: string;
}

export interface TaskTemplate {
  name: string;
  description: string;
  filePath: string;
  variables: string[];
}
