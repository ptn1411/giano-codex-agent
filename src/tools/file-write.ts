// src/tools/file-write.ts
// File writing tool with backup support

import fs from "fs/promises";
import path from "path";
import type {
  ToolContext,
  ToolDefinition,
  ToolHandler,
  ToolResult,
} from "../types/index.js";
import { BackupManager, generateDiff } from "../utils/diff.js";
import {
  canWrite,
  validatePath,
  validateWriteExtension,
} from "../utils/safety.js";

export const writeFileDefinition: ToolDefinition = {
  name: "write_file",
  description:
    "Write content to a file. Creates the file if it doesn't exist, or overwrites if it does. A backup is created before overwriting.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description:
          "Path to the file to write (relative to working directory)",
      },
      content: {
        type: "string",
        description: "Content to write to the file",
      },
      mode: {
        type: "string",
        description:
          "Write mode: 'overwrite' (default), 'append', or 'create' (fail if exists)",
        enum: ["overwrite", "append", "create"],
      },
    },
    required: ["path", "content"],
  },
};

export const writeFileHandler: ToolHandler = async (
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> => {
  const filePath = String(args.path);
  const content = String(args.content);
  const mode = (args.mode as string) || "overwrite";

  // Check sandbox policy
  if (!canWrite(context.sandboxPolicy)) {
    return {
      toolCallId: "",
      success: false,
      output: "",
      error: "Write operations not allowed in read-only mode",
    };
  }

  // Validate path
  const validation = validatePath(
    filePath,
    context.workingDirectory,
    context.sandboxPolicy
  );
  if (!validation.allowed) {
    return {
      toolCallId: "",
      success: false,
      output: "",
      error: validation.reason,
    };
  }

  // Validate extension
  const extValidation = validateWriteExtension(validation.normalizedPath);
  if (!extValidation.allowed) {
    return {
      toolCallId: "",
      success: false,
      output: "",
      error: extValidation.reason,
    };
  }

  try {
    const backupManager = new BackupManager(context.workingDirectory);
    let originalContent = "";
    let fileExists = false;

    // Check if file exists
    try {
      originalContent = await fs.readFile(validation.normalizedPath, "utf-8");
      fileExists = true;
    } catch {
      fileExists = false;
    }

    // Handle modes
    if (mode === "create" && fileExists) {
      return {
        toolCallId: "",
        success: false,
        output: "",
        error: `File already exists: ${filePath}. Use mode 'overwrite' to replace.`,
      };
    }

    // Create backup if overwriting
    let backupPath: string | null = null;
    if (fileExists && mode === "overwrite") {
      backupPath = await backupManager.createBackup(validation.normalizedPath);
    }

    // Ensure directory exists
    const dir = path.dirname(validation.normalizedPath);
    await fs.mkdir(dir, { recursive: true });

    // Write content
    let finalContent = content;
    if (mode === "append") {
      finalContent = originalContent + content;
    }

    await fs.writeFile(validation.normalizedPath, finalContent, "utf-8");

    // Generate diff for response
    let diffOutput = "";
    if (fileExists && mode !== "append") {
      const diff = generateDiff(originalContent, finalContent, filePath);
      if (diff.trim()) {
        diffOutput = `\n\nChanges:\n\`\`\`diff\n${diff}\n\`\`\``;
      }
    }

    const action = fileExists
      ? mode === "append"
        ? "appended to"
        : "updated"
      : "created";
    const backupInfo = backupPath
      ? ` (backup: ${path.basename(backupPath)})`
      : "";

    return {
      toolCallId: "",
      success: true,
      output: `Successfully ${action} ${filePath}${backupInfo}${diffOutput}`,
    };
  } catch (error) {
    return {
      toolCallId: "",
      success: false,
      output: "",
      error: `Failed to write file: ${(error as Error).message}`,
    };
  }
};
