// src/tools/file-edit.ts
// File editing tool with search/replace

import fs from "fs/promises";
import type {
  ToolContext,
  ToolDefinition,
  ToolHandler,
  ToolResult,
} from "../types/index.js";
import { BackupManager, generateDiff } from "../utils/diff.js";
import { canWrite, validatePath } from "../utils/safety.js";

export const editFileDefinition: ToolDefinition = {
  name: "edit_file",
  description:
    "Edit a file by replacing specific content. Use for targeted changes without rewriting the entire file.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the file to edit (relative to working directory)",
      },
      search: {
        type: "string",
        description: "The exact text to search for and replace",
      },
      replace: {
        type: "string",
        description: "The text to replace the search text with",
      },
      all: {
        type: "boolean",
        description:
          "If true, replace all occurrences. Default: false (first only)",
      },
    },
    required: ["path", "search", "replace"],
  },
};

export const editFileHandler: ToolHandler = async (
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> => {
  const filePath = String(args.path);
  const search = String(args.search);
  const replace = String(args.replace);
  const all = Boolean(args.all);

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

  try {
    // Read current content
    const originalContent = await fs.readFile(
      validation.normalizedPath,
      "utf-8"
    );

    // Check if search text exists
    if (!originalContent.includes(search)) {
      return {
        toolCallId: "",
        success: false,
        output: "",
        error: `Search text not found in file. Make sure the text matches exactly including whitespace.`,
      };
    }

    // Count occurrences
    const occurrences = (
      originalContent.match(new RegExp(escapeRegex(search), "g")) || []
    ).length;

    // Create backup
    const backupManager = new BackupManager(context.workingDirectory);
    const backupPath = await backupManager.createBackup(
      validation.normalizedPath
    );

    // Perform replacement
    let newContent: string;
    let replacedCount: number;

    if (all) {
      newContent = originalContent.split(search).join(replace);
      replacedCount = occurrences;
    } else {
      newContent = originalContent.replace(search, replace);
      replacedCount = 1;
    }

    // Write updated content
    await fs.writeFile(validation.normalizedPath, newContent, "utf-8");

    // Generate diff
    const diff = generateDiff(originalContent, newContent, filePath);

    return {
      toolCallId: "",
      success: true,
      output: `Replaced ${replacedCount} occurrence(s) in ${filePath}\n\n\`\`\`diff\n${diff}\n\`\`\``,
    };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;

    if (err.code === "ENOENT") {
      return {
        toolCallId: "",
        success: false,
        output: "",
        error: `File not found: ${filePath}`,
      };
    }

    return {
      toolCallId: "",
      success: false,
      output: "",
      error: `Failed to edit file: ${err.message}`,
    };
  }
};

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
