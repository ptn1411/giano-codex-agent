/**
 * Memory System - Internal Utilities
 * Based on OpenClaw memory-system-blueprint
 */

import { createHash, randomUUID } from "crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import type { MemoryChunk, MemoryFileEntry } from "./types.js";

// ============================================================================
// Hashing
// ============================================================================

export function hashText(text: string): string {
  return createHash("sha256").update(text, "utf-8").digest("hex").slice(0, 16);
}

// ============================================================================
// File Listing
// ============================================================================

export function listMemoryFiles(workspaceDir: string): MemoryFileEntry[] {
  const files: MemoryFileEntry[] = [];

  // Check MEMORY.md and memory.md
  for (const name of ["MEMORY.md", "memory.md"]) {
    const absPath = join(workspaceDir, name);
    if (existsSync(absPath)) {
      const stat = statSync(absPath);
      const content = readFileSync(absPath, "utf-8");
      files.push({
        path: name,
        absPath,
        mtimeMs: stat.mtimeMs,
        size: stat.size,
        hash: hashText(content),
      });
    }
  }

  // List memory/ directory
  const memoryDir = join(workspaceDir, "memory");
  if (existsSync(memoryDir)) {
    const entries = readdirSync(memoryDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".md")) {
        const absPath = join(memoryDir, entry.name);
        const stat = statSync(absPath);
        const content = readFileSync(absPath, "utf-8");
        files.push({
          path: `memory/${entry.name}`,
          absPath,
          mtimeMs: stat.mtimeMs,
          size: stat.size,
          hash: hashText(content),
        });
      }
    }
  }

  return files;
}

// ============================================================================
// Chunking
// ============================================================================

const DEFAULT_CHUNK_SIZE = 400; // ~400 tokens
const DEFAULT_CHUNK_OVERLAP = 50; // overlap for context

export function chunkText(
  text: string,
  options?: { chunkSize?: number; chunkOverlap?: number }
): MemoryChunk[] {
  const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = options?.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;

  const lines = text.split(/\r?\n/);
  const chunks: MemoryChunk[] = [];
  let currentChunk: string[] = [];
  let currentWordCount = 0;
  let startLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;

    const wordCount = line.split(/\s+/).filter(Boolean).length;

    // Start new chunk if heading or size exceeded
    const isHeading = /^#{1,3}\s/.test(line);
    const shouldSplit =
      currentWordCount + wordCount > chunkSize && currentChunk.length > 0;

    if (isHeading || shouldSplit) {
      if (currentChunk.length > 0) {
        const chunkText = currentChunk.join("\n");
        chunks.push({
          id: randomUUID(),
          path: "",
          source: "memory",
          text: chunkText,
          startLine,
          endLine: i - 1,
          hash: hashText(chunkText),
          updatedAt: Date.now(),
        });
      }

      // Start new chunk with overlap
      const overlapLines = Math.min(overlap, currentChunk.length);
      currentChunk = currentChunk.slice(-overlapLines);
      currentWordCount = currentChunk
        .join(" ")
        .split(/\s+/)
        .filter(Boolean).length;
      startLine = i - currentChunk.length;
    }

    currentChunk.push(line);
    currentWordCount += wordCount;
  }

  // Final chunk
  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join("\n");
    chunks.push({
      id: randomUUID(),
      path: "",
      source: "memory",
      text: chunkText,
      startLine,
      endLine: lines.length - 1,
      hash: hashText(chunkText),
      updatedAt: Date.now(),
    });
  }

  return chunks;
}

// ============================================================================
// Simple Keyword Search (no embedding required)
// ============================================================================

export function keywordSearch(
  chunks: MemoryChunk[],
  query: string,
  limit = 5
): { chunk: MemoryChunk; score: number }[] {
  const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);

  const scored = chunks.map((chunk) => {
    const text = chunk.text.toLowerCase();
    let matchCount = 0;

    for (const word of queryWords) {
      if (text.includes(word)) {
        matchCount++;
      }
    }

    const score = queryWords.length > 0 ? matchCount / queryWords.length : 0;
    return { chunk, score };
  });

  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
