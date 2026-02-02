// src/tools/file-read.ts
// File reading tool

import fs from "fs/promises";
import { config } from "../config.js";
import type {
  ToolContext,
  ToolDefinition,
  ToolHandler,
  ToolResult,
} from "../types/index.js";
import { validatePath } from "../utils/safety.js";

export const readFileDefinition: ToolDefinition = {
  name: "read_file",
  description: "Read the contents of a file. Returns the file content as text.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the file to read (relative to working directory)",
      },
      startLine: {
        type: "number",
        description: "Optional. Start line number (1-indexed) for partial read",
      },
      endLine: {
        type: "number",
        description: "Optional. End line number (1-indexed) for partial read",
      },
    },
    required: ["path"],
  },
};

export const readFileHandler: ToolHandler = async (
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> => {
  const filePath = String(args.path);
  const startLine = args.startLine as number | undefined;
  const endLine = args.endLine as number | undefined;

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
    // Check file exists
    const stat = await fs.stat(validation.normalizedPath);

    // Check file size
    const maxBytes = config.maxFileSizeKb * 1024;
    if (stat.size > maxBytes) {
      return {
        toolCallId: "",
        success: false,
        output: "",
        error: `File too large: ${Math.round(stat.size / 1024)}KB exceeds limit of ${config.maxFileSizeKb}KB`,
      };
    }

    // Read file
    let content = await fs.readFile(validation.normalizedPath, "utf-8");

    // Apply line range if specified
    if (startLine !== undefined || endLine !== undefined) {
      const lines = content.split("\n");
      const start = Math.max(1, startLine || 1) - 1;
      const end = Math.min(lines.length, endLine || lines.length);

      content = lines.slice(start, end).join("\n");

      return {
        toolCallId: "",
        success: true,
        output: `[File: ${filePath}, lines ${start + 1}-${end} of ${lines.length}]\n\n${content}`,
      };
    }

    const lines = content.split("\n").length;
    return {
      toolCallId: "",
      success: true,
      output: `[File: ${filePath}, ${lines} lines]\n\n${content}`,
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
      error: `Failed to read file: ${err.message}`,
    };
  }
};
