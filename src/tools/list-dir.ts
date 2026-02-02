// src/tools/list-dir.ts
// Directory listing tool

import fs from "fs/promises";
import path from "path";
import type {
  ToolContext,
  ToolDefinition,
  ToolHandler,
  ToolResult,
} from "../types/index.js";
import { validatePath } from "../utils/safety.js";

export const listDirDefinition: ToolDefinition = {
  name: "list_directory",
  description:
    "List contents of a directory. Returns files and subdirectories with their sizes.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description:
          "Path to the directory to list (relative to working directory). Use '.' for current directory.",
      },
      recursive: {
        type: "boolean",
        description: "If true, list contents recursively. Default: false",
      },
      maxDepth: {
        type: "number",
        description: "Maximum depth for recursive listing. Default: 3",
      },
    },
    required: ["path"],
  },
};

export const listDirHandler: ToolHandler = async (
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> => {
  const dirPath = String(args.path || ".");
  const recursive = Boolean(args.recursive);
  const maxDepth = (args.maxDepth as number) || 3;

  // Validate path
  const validation = validatePath(
    dirPath,
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
    const entries = await listDirectory(
      validation.normalizedPath,
      context.workingDirectory,
      recursive,
      maxDepth,
      0
    );

    if (entries.length === 0) {
      return {
        toolCallId: "",
        success: true,
        output: `Directory ${dirPath} is empty.`,
      };
    }

    // Format output
    const output = formatDirectoryListing(entries);

    return {
      toolCallId: "",
      success: true,
      output: `Contents of ${dirPath}:\n\n${output}`,
    };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;

    if (err.code === "ENOENT") {
      return {
        toolCallId: "",
        success: false,
        output: "",
        error: `Directory not found: ${dirPath}`,
      };
    }

    if (err.code === "ENOTDIR") {
      return {
        toolCallId: "",
        success: false,
        output: "",
        error: `Not a directory: ${dirPath}`,
      };
    }

    return {
      toolCallId: "",
      success: false,
      output: "",
      error: `Failed to list directory: ${err.message}`,
    };
  }
};

interface DirEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  depth: number;
}

async function listDirectory(
  dirPath: string,
  basePath: string,
  recursive: boolean,
  maxDepth: number,
  currentDepth: number
): Promise<DirEntry[]> {
  const entries: DirEntry[] = [];
  const items = await fs.readdir(dirPath, { withFileTypes: true });

  for (const item of items) {
    // Skip hidden files and common ignore patterns
    if (item.name.startsWith(".") || item.name === "node_modules") {
      continue;
    }

    const fullPath = path.join(dirPath, item.name);
    const relativePath = path.relative(basePath, fullPath);

    if (item.isDirectory()) {
      entries.push({
        name: item.name,
        path: relativePath,
        type: "directory",
        size: 0,
        depth: currentDepth,
      });

      if (recursive && currentDepth < maxDepth) {
        const subEntries = await listDirectory(
          fullPath,
          basePath,
          true,
          maxDepth,
          currentDepth + 1
        );
        entries.push(...subEntries);
      }
    } else if (item.isFile()) {
      const stat = await fs.stat(fullPath);
      entries.push({
        name: item.name,
        path: relativePath,
        type: "file",
        size: stat.size,
        depth: currentDepth,
      });
    }
  }

  return entries;
}

function formatDirectoryListing(entries: DirEntry[]): string {
  const lines: string[] = [];

  for (const entry of entries) {
    const indent = "  ".repeat(entry.depth);
    const icon = entry.type === "directory" ? "📁" : "📄";
    const size = entry.type === "file" ? ` (${formatSize(entry.size)})` : "";

    lines.push(`${indent}${icon} ${entry.name}${size}`);
  }

  return lines.join("\n");
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
