// src/utils/cache.ts
// File cache with mtime-based invalidation

import fs from "fs/promises";
import path from "path";
import { logger } from "./logger.js";

interface CacheEntry {
  content: string;
  mtime: number;
  size: number;
  cachedAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalEntries: number;
  totalSize: number;
}

const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_CACHE_ENTRIES = 500;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class FileCache {
  private cache: Map<string, CacheEntry> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalEntries: 0,
    totalSize: 0,
  };

  // Get file from cache or read from disk
  async get(filePath: string): Promise<string | null> {
    const absolutePath = path.resolve(filePath);
    const cached = this.cache.get(absolutePath);

    if (cached) {
      // Check if still valid
      try {
        const stat = await fs.stat(absolutePath);
        const mtime = stat.mtimeMs;

        if (
          mtime === cached.mtime &&
          Date.now() - cached.cachedAt < CACHE_TTL_MS
        ) {
          this.stats.hits++;
          return cached.content;
        }
      } catch {
        // File no longer exists
        this.cache.delete(absolutePath);
        this.stats.evictions++;
      }
    }

    this.stats.misses++;
    return null;
  }

  // Read file with caching
  async read(filePath: string): Promise<string> {
    const cached = await this.get(filePath);
    if (cached !== null) {
      return cached;
    }

    // Read from disk
    const absolutePath = path.resolve(filePath);
    const content = await fs.readFile(absolutePath, "utf-8");
    const stat = await fs.stat(absolutePath);

    // Cache it
    this.set(absolutePath, content, stat.mtimeMs, stat.size);

    return content;
  }

  // Set cache entry
  private set(
    filePath: string,
    content: string,
    mtime: number,
    size: number
  ): void {
    // Evict if necessary
    this.evictIfNeeded(size);

    const entry: CacheEntry = {
      content,
      mtime,
      size,
      cachedAt: Date.now(),
    };

    // Remove old entry stats if exists
    const existing = this.cache.get(filePath);
    if (existing) {
      this.stats.totalSize -= existing.size;
    } else {
      this.stats.totalEntries++;
    }

    this.cache.set(filePath, entry);
    this.stats.totalSize += size;
  }

  // Evict old entries if cache is full
  private evictIfNeeded(newSize: number): void {
    // Check entry count
    while (this.cache.size >= MAX_CACHE_ENTRIES) {
      this.evictOldest();
    }

    // Check total size
    while (
      this.stats.totalSize + newSize > MAX_CACHE_SIZE &&
      this.cache.size > 0
    ) {
      this.evictOldest();
    }
  }

  // Evict oldest entry
  private evictOldest(): void {
    let oldest: { key: string; entry: CacheEntry } | null = null;

    for (const [key, entry] of this.cache) {
      if (!oldest || entry.cachedAt < oldest.entry.cachedAt) {
        oldest = { key, entry };
      }
    }

    if (oldest) {
      this.cache.delete(oldest.key);
      this.stats.totalSize -= oldest.entry.size;
      this.stats.totalEntries--;
      this.stats.evictions++;
    }
  }

  // Invalidate specific file
  invalidate(filePath: string): boolean {
    const absolutePath = path.resolve(filePath);
    const existed = this.cache.has(absolutePath);

    if (existed) {
      const entry = this.cache.get(absolutePath)!;
      this.stats.totalSize -= entry.size;
      this.stats.totalEntries--;
      this.cache.delete(absolutePath);
    }

    return existed;
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.stats.totalEntries = 0;
    this.stats.totalSize = 0;
    logger.info("File cache cleared");
  }

  // Get cache statistics
  getStats(): CacheStats {
    return { ...this.stats };
  }

  // Format stats for display
  formatStats(): string {
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? Math.round(
            (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
          )
        : 0;

    return [
      "**File Cache Stats:**",
      `• Entries: ${this.stats.totalEntries}`,
      `• Size: ${(this.stats.totalSize / 1024).toFixed(1)} KB`,
      `• Hit Rate: ${hitRate}%`,
      `• Hits: ${this.stats.hits}, Misses: ${this.stats.misses}`,
      `• Evictions: ${this.stats.evictions}`,
    ].join("\n");
  }
}

// Singleton
let fileCache: FileCache | null = null;

export function getFileCache(): FileCache {
  if (!fileCache) {
    fileCache = new FileCache();
  }
  return fileCache;
}
