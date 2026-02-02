// src/tools/memory-search.ts
// Search memory chunks tool

import { getMemoryManager } from "../memory/index.js";
import type {
  ToolContext,
  ToolDefinition,
  ToolHandler,
  ToolResult,
} from "../types/index.js";

export const memorySearchDefinition: ToolDefinition = {
  name: "memory_search",
  description:
    "Search agent memory for relevant information. Returns matching memory chunks.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query to find relevant memories",
      },
      limit: {
        type: "number",
        description: "Maximum number of results (default: 5)",
      },
      sources: {
        type: "array",
        items: { type: "string" },
        description: "Filter by source types (e.g., 'workspace', 'manual')",
      },
    },
    required: ["query"],
  },
};

export const memorySearchHandler: ToolHandler = async (
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> => {
  const query = String(args.query ?? "");
  const limit = (args.limit as number) ?? 5;
  const sources = args.sources as string[] | undefined;

  if (!query.trim()) {
    return {
      toolCallId: "",
      success: false,
      output: "",
      error: "Query is required",
    };
  }

  try {
    const memory = getMemoryManager();
    const results = memory.search({
      query,
      limit,
      sources,
    });

    if (results.length === 0) {
      return {
        toolCallId: "",
        success: true,
        output: "No relevant memories found.",
      };
    }

    const formatted = results.map((r, i) => {
      return [
        `### Result ${i + 1} (score: ${r.score.toFixed(2)})`,
        `**Source:** ${r.chunk.source} | **Path:** ${r.chunk.path}`,
        r.chunk.text,
      ].join("\n");
    });

    return {
      toolCallId: "",
      success: true,
      output: `Found ${results.length} relevant memories:\n\n${formatted.join("\n\n---\n\n")}`,
    };
  } catch (error) {
    return {
      toolCallId: "",
      success: false,
      output: "",
      error: `Memory search failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};
