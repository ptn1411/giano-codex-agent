// src/agent/context.ts
// Context manager for tracking session state

import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { logger } from "../utils/logger.js";

export interface SessionContext {
  workingDirectory: string;
  projectType?: string;
  gitBranch?: string;
  gitStatus?: string;
  recentFiles: string[];
  modifiedFiles: string[];
  lastCommand?: string;
}

export class ContextManager {
  private recentFiles: Map<string, string[]> = new Map();
  private modifiedFiles: Map<string, string[]> = new Map();
  private projectTypes: Map<string, string> = new Map();

  private readonly MAX_RECENT_FILES = 10;

  // Track file access
  trackFileAccess(threadId: string, filePath: string): void {
    const files = this.recentFiles.get(threadId) || [];

    // Remove if already exists
    const index = files.indexOf(filePath);
    if (index > -1) {
      files.splice(index, 1);
    }

    // Add to front
    files.unshift(filePath);

    // Limit size
    if (files.length > this.MAX_RECENT_FILES) {
      files.pop();
    }

    this.recentFiles.set(threadId, files);
  }

  // Track file modification
  trackFileModified(threadId: string, filePath: string): void {
    const files = this.modifiedFiles.get(threadId) || [];
    if (!files.includes(filePath)) {
      files.push(filePath);
    }
    this.modifiedFiles.set(threadId, files);
  }

  // Get recent files
  getRecentFiles(threadId: string): string[] {
    return this.recentFiles.get(threadId) || [];
  }

  // Get modified files
  getModifiedFiles(threadId: string): string[] {
    return this.modifiedFiles.get(threadId) || [];
  }

  // Clear modified files (e.g., after commit)
  clearModifiedFiles(threadId: string): void {
    this.modifiedFiles.set(threadId, []);
  }

  // Detect project type
  async detectProjectType(workingDirectory: string): Promise<string> {
    // Check cache
    if (this.projectTypes.has(workingDirectory)) {
      return this.projectTypes.get(workingDirectory)!;
    }

    let projectType = "unknown";

    try {
      const files = await fs.readdir(workingDirectory);

      // Check for common project indicators
      if (files.includes("package.json")) {
        const pkg = JSON.parse(
          await fs.readFile(
            path.join(workingDirectory, "package.json"),
            "utf-8"
          )
        );

        if (pkg.dependencies?.next || pkg.devDependencies?.next) {
          projectType = "Next.js";
        } else if (pkg.dependencies?.react || pkg.devDependencies?.react) {
          projectType = "React";
        } else if (pkg.dependencies?.vue || pkg.devDependencies?.vue) {
          projectType = "Vue";
        } else if (pkg.dependencies?.express || pkg.devDependencies?.express) {
          projectType = "Express";
        } else {
          projectType = "Node.js";
        }
      } else if (
        files.includes("requirements.txt") ||
        files.includes("pyproject.toml")
      ) {
        projectType = "Python";
      } else if (files.includes("go.mod")) {
        projectType = "Go";
      } else if (files.includes("Cargo.toml")) {
        projectType = "Rust";
      } else if (files.includes("pom.xml") || files.includes("build.gradle")) {
        projectType = "Java";
      } else if (files.includes("composer.json")) {
        projectType = "PHP";
      } else if (files.includes("Gemfile")) {
        projectType = "Ruby";
      }

      this.projectTypes.set(workingDirectory, projectType);
    } catch {
      // Ignore errors
    }

    return projectType;
  }

  // Get git branch
  async getGitBranch(workingDirectory: string): Promise<string | null> {
    try {
      const result = await this.runCommand(
        "git branch --show-current",
        workingDirectory
      );
      return result.trim() || null;
    } catch {
      return null;
    }
  }

  // Get git status (short)
  async getGitStatus(workingDirectory: string): Promise<string | null> {
    try {
      const result = await this.runCommand(
        "git status --short",
        workingDirectory
      );
      const lines = result.trim().split("\n").filter(Boolean);
      if (lines.length === 0) return "clean";
      if (lines.length <= 5) return lines.join(", ");
      return `${lines.length} files changed`;
    } catch {
      return null;
    }
  }

  // Build full context
  async buildContext(
    threadId: string,
    workingDirectory: string
  ): Promise<SessionContext> {
    const [projectType, gitBranch, gitStatus] = await Promise.all([
      this.detectProjectType(workingDirectory),
      this.getGitBranch(workingDirectory),
      this.getGitStatus(workingDirectory),
    ]);

    return {
      workingDirectory,
      projectType,
      gitBranch: gitBranch || undefined,
      gitStatus: gitStatus || undefined,
      recentFiles: this.getRecentFiles(threadId),
      modifiedFiles: this.getModifiedFiles(threadId),
    };
  }

  // Format context for LLM
  formatContextForLLM(context: SessionContext): string {
    const parts: string[] = [];

    parts.push(`Working directory: \`${context.workingDirectory}\``);

    if (context.projectType && context.projectType !== "unknown") {
      parts.push(`Project: ${context.projectType}`);
    }

    if (context.gitBranch) {
      let gitInfo = `Git: \`${context.gitBranch}\``;
      if (context.gitStatus && context.gitStatus !== "clean") {
        gitInfo += ` (${context.gitStatus})`;
      }
      parts.push(gitInfo);
    }

    if (context.modifiedFiles.length > 0) {
      const files = context.modifiedFiles
        .slice(0, 5)
        .map((f) => `\`${f}\``)
        .join(", ");
      parts.push(`Modified: ${files}`);
    }

    return parts.join(" | ");
  }

  // Helper to run command
  private runCommand(command: string, cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const isWindows = process.platform === "win32";
      const shell = isWindows ? "cmd.exe" : "/bin/sh";
      const args = isWindows ? ["/c", command] : ["-c", command];

      const proc = spawn(shell, args, { cwd });
      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || `Command failed with code ${code}`));
        }
      });

      // Timeout
      setTimeout(() => {
        proc.kill();
        reject(new Error("Command timed out"));
      }, 5000);
    });
  }

  // Clear context for thread
  clear(threadId: string): void {
    this.recentFiles.delete(threadId);
    this.modifiedFiles.delete(threadId);
    logger.debug(`Cleared context for thread ${threadId}`);
  }
}

// Singleton
let contextManager: ContextManager | null = null;

export function getContextManager(): ContextManager {
  if (!contextManager) {
    contextManager = new ContextManager();
  }
  return contextManager;
}
