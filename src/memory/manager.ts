/**
 * Memory System - Manager
 * Based on OpenClaw memory-system-blueprint
 *
 * Simplified in-memory version for MVP
 */

import { readFileSync } from "fs";
import {
  chunkText,
  hashText,
  keywordSearch,
  listMemoryFiles,
} from "./internal.js";
import type {
  MemoryChunk,
  MemoryConfig,
  MemoryIndexStats,
  MemorySearchOptions,
  MemorySearchResult,
} from "./types.js";

// ============================================================================
// Memory Manager Class
// ============================================================================

export class MemoryManager {
  private config: MemoryConfig;
  private chunks: Map<string, MemoryChunk> = new Map();
  private fileHashes: Map<string, string> = new Map();
  private lastUpdated = 0;

  constructor(config: MemoryConfig) {
    this.config = config;
  }

  // Index all memory files
  async index(): Promise<void> {
    const files = listMemoryFiles(this.config.workspaceDir);

    for (const file of files) {
      // Skip if unchanged
      if (this.fileHashes.get(file.path) === file.hash) {
        continue;
      }

      // Read and chunk file
      const content = readFileSync(file.absPath, "utf-8");
      const chunks = chunkText(content, {
        chunkSize: this.config.chunkSize,
        chunkOverlap: this.config.chunkOverlap,
      });

      // Remove old chunks for this file
      for (const [id, chunk] of this.chunks) {
        if (chunk.path === file.path) {
          this.chunks.delete(id);
        }
      }

      // Add new chunks
      for (const chunk of chunks) {
        chunk.path = file.path;
        this.chunks.set(chunk.id, chunk);
      }

      this.fileHashes.set(file.path, file.hash);
    }

    this.lastUpdated = Date.now();
  }

  // Search memory
  search(options: MemorySearchOptions): MemorySearchResult[] {
    const allChunks = Array.from(this.chunks.values());

    // Filter by source if specified
    const filtered = options.sources
      ? allChunks.filter((c) => options.sources!.includes(c.source))
      : allChunks;

    // Keyword search (simple BM25-like)
    const results = keywordSearch(filtered, options.query, options.limit ?? 5);

    return results
      .filter((r) => r.score >= (options.minScore ?? 0.1))
      .map((r) => ({
        chunk: r.chunk,
        score: r.score,
        matchType: "keyword" as const,
      }));
  }

  // Get specific chunk by ID
  get(id: string): MemoryChunk | undefined {
    return this.chunks.get(id);
  }

  // Get chunks by path
  getByPath(path: string): MemoryChunk[] {
    return Array.from(this.chunks.values()).filter((c) => c.path === path);
  }

  // Get stats
  getStats(): MemoryIndexStats {
    const sources = new Set<string>();
    for (const chunk of this.chunks.values()) {
      sources.add(chunk.source);
    }

    return {
      totalFiles: this.fileHashes.size,
      totalChunks: this.chunks.size,
      lastUpdated: this.lastUpdated,
      sources: Array.from(sources),
    };
  }

  // Clear all memory
  clear(): void {
    this.chunks.clear();
    this.fileHashes.clear();
    this.lastUpdated = 0;
  }

  // Add manual memory entry
  addMemory(text: string, source = "manual"): MemoryChunk {
    const chunk: MemoryChunk = {
      id: crypto.randomUUID(),
      path: `${source}/${Date.now()}`,
      source,
      text,
      startLine: 0,
      endLine: 0,
      hash: hashText(text),
      updatedAt: Date.now(),
    };

    this.chunks.set(chunk.id, chunk);
    return chunk;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let memoryManager: MemoryManager | null = null;

export function getMemoryManager(config?: MemoryConfig): MemoryManager {
  if (!memoryManager && config) {
    memoryManager = new MemoryManager(config);
  }
  if (!memoryManager) {
    throw new Error("Memory manager not initialized. Provide config first.");
  }
  return memoryManager;
}

export function initMemoryManager(config: MemoryConfig): MemoryManager {
  memoryManager = new MemoryManager(config);
  return memoryManager;
}
