/**
 * Memory System - Types
 * Based on OpenClaw memory-system-blueprint
 *
 * Simplified version for MVP - uses in-memory storage
 */

// ============================================================================
// Core Types
// ============================================================================

export interface MemoryChunk {
  id: string;
  path: string;
  source: string;
  text: string;
  startLine: number;
  endLine: number;
  hash: string;
  embedding?: number[];
  updatedAt: number;
}

export interface MemoryFileEntry {
  path: string;
  absPath: string;
  mtimeMs: number;
  size: number;
  hash: string;
}

export interface MemorySearchResult {
  chunk: MemoryChunk;
  score: number;
  matchType: "vector" | "keyword" | "hybrid";
}

export interface MemorySearchOptions {
  query: string;
  limit?: number;
  minScore?: number;
  sources?: string[];
}

export interface MemoryIndexStats {
  totalFiles: number;
  totalChunks: number;
  lastUpdated: number;
  sources: string[];
}

// ============================================================================
// Config Types
// ============================================================================

export interface MemoryConfig {
  workspaceDir: string;
  embeddingProvider?: "openai" | "gemini" | "local";
  embeddingModel?: string;
  chunkSize?: number;
  chunkOverlap?: number;
}

// ============================================================================
// Embedding Types
// ============================================================================

export interface EmbeddingProvider {
  name: string;
  model: string;
  dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}

export interface EmbeddingResult {
  text: string;
  embedding: number[];
}
