// src/tools/grep.ts
// Search tool using ripgrep-like functionality

import fs from "fs/promises";
import { glob } from "glob";
import path from "path";
import type {
  ToolContext,
  ToolDefinition,
  ToolHandler,
  ToolResult,
} from "../types/index.js";
import { validatePath } from "../utils/safety.js";

export const grepSearchDefinition: ToolDefinition = {
  name: "grep_search",
  description:
    "Search for text patterns in files. Returns matching lines with file paths and line numbers.",
  parameters: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Text or regex pattern to search for",
      },
      path: {
        type: "string",
        description:
          "Directory or file to search in (relative to working directory). Default: '.'",
      },
      filePattern: {
        type: "string",
        description:
          "Glob pattern to filter files. Example: '*.ts' or '**/*.{js,ts}'",
      },
      caseSensitive: {
        type: "boolean",
        description: "Case sensitive search. Default: false",
      },
      maxResults: {
        type: "number",
        description: "Maximum number of results to return. Default: 50",
      },
    },
    required: ["pattern"],
  },
};

export const grepSearchHandler: ToolHandler = async (
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> => {
  const pattern = String(args.pattern);
  const searchPath = String(args.path || ".");
  const filePattern = args.filePattern as string | undefined;
  const caseSensitive = Boolean(args.caseSensitive);
  const maxResults = (args.maxResults as number) || 50;

  // Validate path
  const validation = validatePath(
    searchPath,
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
    // Build regex
    const flags = caseSensitive ? "g" : "gi";
    let regex: RegExp;
    try {
      regex = new RegExp(pattern, flags);
    } catch {
      // Treat as literal string if invalid regex
      regex = new RegExp(escapeRegex(pattern), flags);
    }

    // Find files to search
    const files = await findFiles(validation.normalizedPath, filePattern);

    if (files.length === 0) {
      return {
        toolCallId: "",
        success: true,
        output: "No files found matching the search criteria.",
      };
    }

    // Search files
    const results: SearchResult[] = [];
    let totalMatches = 0;

    for (const file of files) {
      if (totalMatches >= maxResults) break;

      try {
        const content = await fs.readFile(file, "utf-8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          if (totalMatches >= maxResults) break;

          const line = lines[i];
          if (line !== undefined && regex.test(line)) {
            const relativePath = path.relative(context.workingDirectory, file);
            results.push({
              file: relativePath,
              line: i + 1,
              content: line.trim().substring(0, 200), // Truncate long lines
            });
            totalMatches++;
          }

          // Reset regex lastIndex for global flag
          regex.lastIndex = 0;
        }
      } catch {
        // Skip files that can't be read (binary, permission issues)
        continue;
      }
    }

    if (results.length === 0) {
      return {
        toolCallId: "",
        success: true,
        output: `No matches found for "${pattern}" in ${files.length} files.`,
      };
    }

    // Format output
    const output = formatSearchResults(
      results,
      pattern,
      files.length,
      maxResults
    );

    return {
      toolCallId: "",
      success: true,
      output,
    };
  } catch (error) {
    return {
      toolCallId: "",
      success: false,
      output: "",
      error: `Search failed: ${(error as Error).message}`,
    };
  }
};

interface SearchResult {
  file: string;
  line: number;
  content: string;
}

async function findFiles(
  searchPath: string,
  pattern?: string
): Promise<string[]> {
  const stat = await fs.stat(searchPath);

  if (stat.isFile()) {
    return [searchPath];
  }

  // Default patterns to search
  const globPattern =
    pattern || "**/*.{ts,tsx,js,jsx,json,md,py,go,rs,java,c,cpp,h,css,html}";

  const files = await glob(globPattern, {
    cwd: searchPath,
    absolute: true,
    nodir: true,
    ignore: [
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/*.min.js",
      "**/*.map",
    ],
  });

  return files.slice(0, 1000); // Limit number of files
}

function formatSearchResults(
  results: SearchResult[],
  pattern: string,
  totalFiles: number,
  maxResults: number
): string {
  const lines: string[] = [
    `Found ${results.length} matches for "${pattern}" in ${totalFiles} files:`,
    "",
  ];

  // Group by file
  const byFile = new Map<string, SearchResult[]>();
  for (const result of results) {
    const existing = byFile.get(result.file) || [];
    existing.push(result);
    byFile.set(result.file, existing);
  }

  for (const [file, matches] of byFile) {
    lines.push(`📄 ${file}:`);
    for (const match of matches) {
      lines.push(`  L${match.line}: ${match.content}`);
    }
    lines.push("");
  }

  if (results.length >= maxResults) {
    lines.push(`(Results truncated at ${maxResults})`);
  }

  return lines.join("\n");
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
