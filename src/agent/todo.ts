// src/agent/todo.ts
// Task/Todo management system for complex tasks

import { logger } from "../utils/logger.js";

export type TodoStatus = "pending" | "in_progress" | "completed" | "cancelled";

export interface TodoItem {
  id: string;
  content: string;
  status: TodoStatus;
  createdAt: Date;
  completedAt?: Date;
}

export interface TodoList {
  items: TodoItem[];
  createdAt: Date;
  updatedAt: Date;
}

export class TodoManager {
  private todos: Map<string, TodoList> = new Map();

  // Generate unique ID
  private generateId(): string {
    return `todo_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  }

  // Get or create todo list for a thread
  getOrCreate(threadId: string): TodoList {
    if (!this.todos.has(threadId)) {
      this.todos.set(threadId, {
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return this.todos.get(threadId)!;
  }

  // Add new todo items
  addItems(
    threadId: string,
    items: Array<{ content: string; status?: TodoStatus }>
  ): TodoItem[] {
    const todoList = this.getOrCreate(threadId);
    const newItems: TodoItem[] = [];

    for (const item of items) {
      const newItem: TodoItem = {
        id: this.generateId(),
        content: item.content,
        status: item.status || "pending",
        createdAt: new Date(),
      };
      todoList.items.push(newItem);
      newItems.push(newItem);
    }

    todoList.updatedAt = new Date();
    logger.debug(`Added ${items.length} todos to thread ${threadId}`);
    return newItems;
  }

  // Update todo status
  updateStatus(threadId: string, todoId: string, status: TodoStatus): boolean {
    const todoList = this.todos.get(threadId);
    if (!todoList) return false;

    const item = todoList.items.find((t) => t.id === todoId);
    if (!item) return false;

    item.status = status;
    if (status === "completed") {
      item.completedAt = new Date();
    }
    todoList.updatedAt = new Date();

    logger.debug(`Updated todo ${todoId} to ${status}`);
    return true;
  }

  // Mark todo as in progress
  startItem(threadId: string, todoId: string): boolean {
    return this.updateStatus(threadId, todoId, "in_progress");
  }

  // Mark todo as completed
  completeItem(threadId: string, todoId: string): boolean {
    return this.updateStatus(threadId, todoId, "completed");
  }

  // Cancel todo
  cancelItem(threadId: string, todoId: string): boolean {
    return this.updateStatus(threadId, todoId, "cancelled");
  }

  // Get current in-progress item
  getCurrentTask(threadId: string): TodoItem | null {
    const todoList = this.todos.get(threadId);
    if (!todoList) return null;
    return todoList.items.find((t) => t.status === "in_progress") || null;
  }

  // Get all pending items
  getPendingItems(threadId: string): TodoItem[] {
    const todoList = this.todos.get(threadId);
    if (!todoList) return [];
    return todoList.items.filter((t) => t.status === "pending");
  }

  // Get progress summary
  getProgress(threadId: string): TodoProgress {
    const todoList = this.todos.get(threadId);
    if (!todoList) {
      return {
        total: 0,
        completed: 0,
        pending: 0,
        inProgress: 0,
        cancelled: 0,
      };
    }

    const items = todoList.items;
    return {
      total: items.length,
      completed: items.filter((t) => t.status === "completed").length,
      pending: items.filter((t) => t.status === "pending").length,
      inProgress: items.filter((t) => t.status === "in_progress").length,
      cancelled: items.filter((t) => t.status === "cancelled").length,
    };
  }

  // Format todos for display
  formatTodos(threadId: string): string {
    const todoList = this.todos.get(threadId);
    if (!todoList || todoList.items.length === 0) {
      return "No tasks.";
    }

    const statusIcons: Record<TodoStatus, string> = {
      pending: "[ ]",
      in_progress: "[*]",
      completed: "[x]",
      cancelled: "[-]",
    };

    const lines: string[] = ["**Task List:**"];
    for (let i = 0; i < todoList.items.length; i++) {
      const item = todoList.items[i];
      if (!item) continue;
      const icon = statusIcons[item.status];
      lines.push(`${i + 1}. ${icon} ${item.content}`);
    }

    const progress = this.getProgress(threadId);
    lines.push(`\nProgress: ${progress.completed}/${progress.total} completed`);

    return lines.join("\n");
  }

  // Clear completed todos
  clearCompleted(threadId: string): number {
    const todoList = this.todos.get(threadId);
    if (!todoList) return 0;

    const before = todoList.items.length;
    todoList.items = todoList.items.filter(
      (t) => t.status !== "completed" && t.status !== "cancelled"
    );
    todoList.updatedAt = new Date();

    return before - todoList.items.length;
  }

  // Clear all todos for thread
  clear(threadId: string): void {
    this.todos.delete(threadId);
    logger.debug(`Cleared todos for thread ${threadId}`);
  }

  // Merge/update todos (like Cursor's merge mode)
  merge(
    threadId: string,
    updates: Array<{ id: string; status?: TodoStatus; content?: string }>
  ): void {
    const todoList = this.getOrCreate(threadId);

    for (const update of updates) {
      const item = todoList.items.find((t) => t.id === update.id);
      if (item) {
        if (update.status) {
          item.status = update.status;
          if (update.status === "completed") {
            item.completedAt = new Date();
          }
        }
        if (update.content) {
          item.content = update.content;
        }
      }
    }

    todoList.updatedAt = new Date();
  }
}

export interface TodoProgress {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  cancelled: number;
}

// Singleton
let todoManager: TodoManager | null = null;

export function getTodoManager(): TodoManager {
  if (!todoManager) {
    todoManager = new TodoManager();
  }
  return todoManager;
}
