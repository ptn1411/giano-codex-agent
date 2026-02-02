// src/utils/diff.ts
// Diff generation and file backup utilities

import * as Diff from "diff";
import fs from "fs/promises";
import path from "path";
import { logger } from "./logger.js";

const BACKUP_DIR = ".agent-backups";

// Generate unified diff between two strings
export function generateDiff(
  original: string,
  modified: string,
  filename?: string,
): string {
  const diff = Diff.createPatch(
    filename || "file",
    original,
    modified,
    "original",
    "modified",
  );

  // Remove the header lines for cleaner output
  const lines = diff.split("\n");
  return lines.slice(4).join("\n");
}

// Generate colored diff (for terminal)
export function generateColoredDiff(
  original: string,
  modified: string,
): string {
  const changes = Diff.diffLines(original, modified);
  let result = "";

  for (const change of changes) {
    const lines = change.value.split("\n");
    for (const line of lines) {
      if (line === "") continue;
      if (change.added) {
        result += `+ ${line}\n`;
      } else if (change.removed) {
        result += `- ${line}\n`;
      } else {
        result += `  ${line}\n`;
      }
    }
  }

  return result.trim();
}

// Backup manager
export class BackupManager {
  private backupDir: string;

  constructor(workingDirectory: string) {
    this.backupDir = path.join(workingDirectory, BACKUP_DIR);
  }

  async init(): Promise<void> {
    await fs.mkdir(this.backupDir, { recursive: true });
  }

  // Create backup before modifying a file
  async createBackup(filePath: string): Promise<string | null> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const timestamp = Date.now();
      const filename = path.basename(filePath);
      const backupPath = path.join(
        this.backupDir,
        `${timestamp}-${filename.replace(/[/\\]/g, "_")}`,
      );

      await this.init();
      await fs.writeFile(backupPath, content, "utf-8");

      logger.debug(`Backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      // File doesn't exist yet - no backup needed
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  // Restore from backup
  async restore(backupPath: string, originalPath: string): Promise<void> {
    const content = await fs.readFile(backupPath, "utf-8");
    await fs.writeFile(originalPath, content, "utf-8");
    logger.info(`Restored ${originalPath} from backup`);
  }

  // List recent backups
  async listBackups(limit = 10): Promise<BackupInfo[]> {
    await this.init();

    const files = await fs.readdir(this.backupDir);
    const backups: BackupInfo[] = [];

    for (const file of files) {
      const filePath = path.join(this.backupDir, file);
      const stat = await fs.stat(filePath);

      // Parse timestamp and original filename from backup name
      const match = file.match(/^(\d+)-(.+)$/);
      if (match) {
        backups.push({
          backupPath: filePath,
          originalName: match[2]?.replace(/_/g, "/") || file,
          timestamp: new Date(parseInt(match[1] || "0", 10)),
          size: stat.size,
        });
      }
    }

    // Sort by timestamp descending
    backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return backups.slice(0, limit);
  }

  // Clean old backups (keep last N)
  async cleanOldBackups(keepLast = 50): Promise<number> {
    const backups = await this.listBackups(1000);
    const toDelete = backups.slice(keepLast);

    for (const backup of toDelete) {
      await fs.unlink(backup.backupPath);
    }

    if (toDelete.length > 0) {
      logger.info(`Cleaned ${toDelete.length} old backups`);
    }

    return toDelete.length;
  }
}

export interface BackupInfo {
  backupPath: string;
  originalName: string;
  timestamp: Date;
  size: number;
}

// Apply patch to content
export function applyPatch(original: string, patch: string): string | false {
  // Reconstruct full patch format
  const fullPatch = `--- original
+++ modified
${patch}`;

  return Diff.applyPatch(original, fullPatch);
}

// Check if content has changed
export function hasChanges(original: string, modified: string): boolean {
  return original !== modified;
}

// Get change statistics
export function getChangeStats(
  original: string,
  modified: string,
): ChangeStats {
  const changes = Diff.diffLines(original, modified);

  let added = 0;
  let removed = 0;

  for (const change of changes) {
    const lineCount = change.value.split("\n").length - 1;
    if (change.added) {
      added += lineCount;
    } else if (change.removed) {
      removed += lineCount;
    }
  }

  return { added, removed, total: added + removed };
}

export interface ChangeStats {
  added: number;
  removed: number;
  total: number;
}
