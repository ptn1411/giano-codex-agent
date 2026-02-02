// src/tools/memory-add.ts
// Add manual memory entry

import { getMemoryManager } from "../memory/index.js";
import type {
  ToolContext,
  ToolDefinition,
  ToolHandler,
  ToolResult,
} from "../types/index.js";

export const memoryAddDefinition: ToolDefinition = {
  name: "memory_add",
  description: "Add a manual memory entry for future reference.",
  parameters: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "Content to remember",
      },
      source: {
        type: "string",
        description: "Source label (default: 'manual')",
      },
    },
    required: ["text"],
  },
};

export const memoryAddHandler: ToolHandler = async (
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> => {
  const text = String(args.text ?? "");
  const source = String(args.source ?? "manual");

  if (!text.trim()) {
    return {
      toolCallId: "",
      success: false,
      output: "",
      error: "Text is required",
    };
  }

  try {
    const memory = getMemoryManager();
    const chunk = memory.addMemory(text, source);

    return {
      toolCallId: "",
      success: true,
      output: `✓ Memory added (ID: ${chunk.id.slice(0, 8)}..., source: ${source})`,
    };
  } catch (error) {
    return {
      toolCallId: "",
      success: false,
      output: "",
      error: `Failed to add memory: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};
