// src/agent/thread.ts
// Thread management for conversation persistence

import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";
import type { ChatMessage, Thread } from "../types/index.js";
import { logger } from "../utils/logger.js";

const SESSIONS_DIR = ".agent-sessions";

export class ThreadManager {
  private sessionsDir: string;
  private threads: Map<string, Thread> = new Map();

  constructor(workspaceDir: string = config.defaultWorkspace) {
    this.sessionsDir = path.join(workspaceDir, SESSIONS_DIR);
  }

  async init(): Promise<void> {
    await fs.mkdir(this.sessionsDir, { recursive: true });
    logger.debug(`Thread storage initialized: ${this.sessionsDir}`);
  }

  // Generate unique thread ID
  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `thread_${timestamp}_${random}`;
  }

  // Create new thread
  async create(
    chatId: string,
    userId: string,
    workingDirectory?: string
  ): Promise<Thread> {
    const thread: Thread = {
      id: this.generateId(),
      chatId,
      userId,
      workingDirectory: workingDirectory || config.defaultWorkspace,
      messages: [],
      createdAt: new Date(),
      lastActiveAt: new Date(),
      totalTokensUsed: 0,
      status: "idle",
    };

    this.threads.set(thread.id, thread);
    await this.save(thread);

    logger.info(`Created thread ${thread.id} for chat ${chatId}`);
    return thread;
  }

  // Get or create thread for a chat
  async getOrCreate(chatId: string, userId: string): Promise<Thread> {
    // Check memory cache
    for (const thread of this.threads.values()) {
      if (thread.chatId === chatId) {
        return thread;
      }
    }

    // Check disk
    const files = await fs.readdir(this.sessionsDir).catch(() => []);
    for (const file of files) {
      if (file.endsWith(".json")) {
        const thread = await this.load(file.replace(".json", ""));
        if (thread && thread.chatId === chatId) {
          this.threads.set(thread.id, thread);
          return thread;
        }
      }
    }

    // Create new
    return this.create(chatId, userId);
  }

  // Get thread by ID
  async get(threadId: string): Promise<Thread | null> {
    // Check cache
    if (this.threads.has(threadId)) {
      return this.threads.get(threadId)!;
    }

    // Load from disk
    return this.load(threadId);
  }

  // Save thread to disk
  async save(thread: Thread): Promise<void> {
    const filePath = path.join(this.sessionsDir, `${thread.id}.json`);

    // Convert dates to ISO strings for JSON
    const data = {
      ...thread,
      createdAt: thread.createdAt.toISOString(),
      lastActiveAt: thread.lastActiveAt.toISOString(),
      messages: thread.messages.map((m) => ({
        ...m,
        timestamp: m.timestamp.toISOString(),
      })),
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    logger.debug(`Saved thread ${thread.id}`);
  }

  // Load thread from disk
  async load(threadId: string): Promise<Thread | null> {
    const filePath = path.join(this.sessionsDir, `${threadId}.json`);

    try {
      const data = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(data);

      // Convert ISO strings back to dates
      const thread: Thread = {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        lastActiveAt: new Date(parsed.lastActiveAt),
        messages: parsed.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
      };

      return thread;
    } catch {
      return null;
    }
  }

  // Add message to thread
  async addMessage(threadId: string, message: ChatMessage): Promise<void> {
    const thread = await this.get(threadId);
    if (!thread) {
      throw new Error(`Thread not found: ${threadId}`);
    }

    thread.messages.push(message);
    thread.lastActiveAt = new Date();

    // Trim old messages if exceeding limit
    if (thread.messages.length > config.maxHistoryMessages) {
      // Keep system message if present
      const systemMsg = thread.messages.find((m) => m.role === "system");
      const recentMessages = thread.messages.slice(
        -config.maxHistoryMessages + 1
      );

      if (systemMsg && recentMessages[0]?.role !== "system") {
        thread.messages = [systemMsg, ...recentMessages];
      } else {
        thread.messages = recentMessages;
      }
    }

    this.threads.set(threadId, thread);
    await this.save(thread);
  }

  // Update thread status
  async updateStatus(
    threadId: string,
    status: Thread["status"],
    currentTask?: string
  ): Promise<void> {
    const thread = await this.get(threadId);
    if (!thread) return;

    thread.status = status;
    thread.currentTask = currentTask;
    thread.lastActiveAt = new Date();

    this.threads.set(threadId, thread);
    await this.save(thread);
  }

  // Clear thread messages (reset)
  async reset(threadId: string): Promise<void> {
    const thread = await this.get(threadId);
    if (!thread) return;

    thread.messages = [];
    thread.totalTokensUsed = 0;
    thread.status = "idle";
    thread.currentTask = undefined;

    this.threads.set(threadId, thread);
    await this.save(thread);

    logger.info(`Reset thread ${threadId}`);
  }

  // Delete thread
  async delete(threadId: string): Promise<void> {
    this.threads.delete(threadId);

    const filePath = path.join(this.sessionsDir, `${threadId}.json`);
    await fs.unlink(filePath).catch(() => {});

    logger.info(`Deleted thread ${threadId}`);
  }

  // Get messages for LLM context
  getMessagesForLLM(thread: Thread): ChatMessage[] {
    return thread.messages.filter(
      (m) =>
        m.role === "system" ||
        m.role === "user" ||
        m.role === "assistant" ||
        m.role === "tool"
    );
  }

  // Add token usage
  async addTokenUsage(threadId: string, tokens: number): Promise<void> {
    const thread = await this.get(threadId);
    if (!thread) return;

    thread.totalTokensUsed += tokens;
    this.threads.set(threadId, thread);
    await this.save(thread);
  }
}

// Singleton
let threadManager: ThreadManager | null = null;

export function getThreadManager(): ThreadManager {
  if (!threadManager) {
    threadManager = new ThreadManager();
  }
  return threadManager;
}
