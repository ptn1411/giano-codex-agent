// src/agent/verification.ts
// Verification layer for validating changes

import { spawn } from "child_process";
import fs from "fs/promises";
import { logger } from "../utils/logger.js";

export interface VerificationResult {
  success: boolean;
  checks: CheckResult[];
  summary: string;
}

export interface CheckResult {
  name: string;
  passed: boolean;
  output?: string;
  error?: string;
}

export class VerificationEngine {
  // Detect project type from directory
  async detectProjectType(
    workingDir: string
  ): Promise<"node" | "python" | "go" | "rust" | "unknown"> {
    try {
      const files = await fs.readdir(workingDir);

      if (files.includes("package.json")) return "node";
      if (
        files.includes("requirements.txt") ||
        files.includes("pyproject.toml")
      )
        return "python";
      if (files.includes("go.mod")) return "go";
      if (files.includes("Cargo.toml")) return "rust";

      return "unknown";
    } catch {
      return "unknown";
    }
  }

  // Get verification commands based on project type
  getVerificationCommands(
    projectType: string
  ): Array<{ name: string; cmd: string }> {
    switch (projectType) {
      case "node":
        return [
          { name: "TypeScript Check", cmd: "npx tsc --noEmit" },
          { name: "ESLint", cmd: "npm run lint --if-present" },
          { name: "Tests", cmd: "npm test --if-present" },
        ];
      case "python":
        return [
          { name: "Type Check", cmd: "mypy . --ignore-missing-imports" },
          { name: "Lint", cmd: "flake8 ." },
          { name: "Tests", cmd: "pytest -v" },
        ];
      case "go":
        return [
          { name: "Build", cmd: "go build ./..." },
          { name: "Vet", cmd: "go vet ./..." },
          { name: "Tests", cmd: "go test ./..." },
        ];
      case "rust":
        return [
          { name: "Check", cmd: "cargo check" },
          { name: "Clippy", cmd: "cargo clippy" },
          { name: "Tests", cmd: "cargo test" },
        ];
      default:
        return [];
    }
  }

  // Run a single verification command
  async runCommand(
    cmd: string,
    workingDir: string,
    timeout = 60000
  ): Promise<{ success: boolean; output: string }> {
    return new Promise((resolve) => {
      const isWindows = process.platform === "win32";
      const shell = isWindows ? "cmd.exe" : "/bin/sh";
      const args = isWindows ? ["/c", cmd] : ["-c", cmd];

      const proc = spawn(shell, args, { cwd: workingDir });
      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      const timeoutId = setTimeout(() => {
        proc.kill();
        resolve({ success: false, output: "Command timed out" });
      }, timeout);

      proc.on("close", (code) => {
        clearTimeout(timeoutId);
        const output = stdout + (stderr ? `\nStderr:\n${stderr}` : "");
        resolve({
          success: code === 0,
          output: output.trim().slice(0, 2000), // Limit output size
        });
      });

      proc.on("error", (error) => {
        clearTimeout(timeoutId);
        resolve({ success: false, output: error.message });
      });
    });
  }

  // Run all verification checks
  async verify(workingDir: string): Promise<VerificationResult> {
    const checks: CheckResult[] = [];

    const projectType = await this.detectProjectType(workingDir);
    logger.info(`Detected project type: ${projectType}`);

    if (projectType === "unknown") {
      return {
        success: true,
        checks: [],
        summary: "No verification commands configured for this project type",
      };
    }

    const commands = this.getVerificationCommands(projectType);

    for (const { name, cmd } of commands) {
      logger.info(`Running: ${name}`);
      const result = await this.runCommand(cmd, workingDir);

      checks.push({
        name,
        passed: result.success,
        output: result.output,
        error: result.success ? undefined : result.output,
      });

      // Stop on first critical failure (type check or build)
      if (
        !result.success &&
        (name.includes("Check") || name.includes("Build"))
      ) {
        break;
      }
    }

    const passed = checks.filter((c) => c.passed).length;
    const failed = checks.filter((c) => !c.passed).length;

    return {
      success: failed === 0,
      checks,
      summary: `Verification: ${passed} passed, ${failed} failed`,
    };
  }

  // Format verification result for display
  formatResult(result: VerificationResult): string {
    if (result.checks.length === 0) {
      return result.summary;
    }

    const lines: string[] = ["**Verification Results:**", ""];

    for (const check of result.checks) {
      const icon = check.passed ? "✅" : "❌";
      lines.push(`${icon} **${check.name}**`);
      if (!check.passed && check.error) {
        const errorPreview = check.error.split("\n").slice(0, 3).join("\n");
        lines.push(`\`\`\`\n${errorPreview}\n\`\`\``);
      }
    }

    lines.push("", `---`, result.summary);

    return lines.join("\n");
  }
}

// Singleton
let verificationEngine: VerificationEngine | null = null;

export function getVerificationEngine(): VerificationEngine {
  if (!verificationEngine) {
    verificationEngine = new VerificationEngine();
  }
  return verificationEngine;
}
