// src/tools/index.ts
// Tool registry initialization and exports

import { execCommandDefinition, execCommandHandler } from "./exec.js";
import { editFileDefinition, editFileHandler } from "./file-edit.js";
import { readFileDefinition, readFileHandler } from "./file-read.js";
import { writeFileDefinition, writeFileHandler } from "./file-write.js";
import { gitEnhancedHandler, gitEnhancedTool } from "./git-enhanced.js";
import { gitDefinition, gitHandler } from "./git.js";
import { grepSearchDefinition, grepSearchHandler } from "./grep.js";
import { listDirDefinition, listDirHandler } from "./list-dir.js";
import { memoryAddDefinition, memoryAddHandler } from "./memory-add.js";
import {
  memorySearchDefinition,
  memorySearchHandler,
} from "./memory-search.js";
import { ToolRegistry, getToolRegistry } from "./registry.js";

// Register all tools
export function initializeTools(): ToolRegistry {
  const registry = getToolRegistry();

  // File operations
  registry.register(readFileDefinition, readFileHandler);
  registry.register(writeFileDefinition, writeFileHandler);
  registry.register(editFileDefinition, editFileHandler);
  registry.register(listDirDefinition, listDirHandler);

  // Search
  registry.register(grepSearchDefinition, grepSearchHandler);

  // Commands
  registry.register(execCommandDefinition, execCommandHandler);

  // Git
  registry.register(gitDefinition, gitHandler);
  registry.register(gitEnhancedTool, gitEnhancedHandler);

  // Memory
  registry.register(memorySearchDefinition, memorySearchHandler);
  registry.register(memoryAddDefinition, memoryAddHandler);

  return registry;
}

// Re-exports
export { execCommandDefinition, execCommandHandler } from "./exec.js";
export { editFileDefinition, editFileHandler } from "./file-edit.js";
export { readFileDefinition, readFileHandler } from "./file-read.js";
export { writeFileDefinition, writeFileHandler } from "./file-write.js";
export { gitEnhancedHandler, gitEnhancedTool } from "./git-enhanced.js";
export { gitDefinition, gitHandler } from "./git.js";
export { grepSearchDefinition, grepSearchHandler } from "./grep.js";
export { listDirDefinition, listDirHandler } from "./list-dir.js";
export { ToolRegistry, getToolRegistry } from "./registry.js";

// New enhanced exports
export * from "./helpers.js";
export * from "./policy.js";
export * from "./schema.js";
export * from "./types.js";
