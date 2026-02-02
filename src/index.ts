// src/index.ts
// Giano Codex Agent - Main Entry Point

import { getAgentEngine } from "./agent/index.js";
import { setupGracefulShutdown, startBot } from "./bot/index.js";
import { config } from "./config.js";
import { logError, logInfo } from "./utils/logger.js";

// Banner
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ██████╗ ██╗ █████╗ ███╗   ██╗ ██████╗                       ║
║  ██╔════╝ ██║██╔══██╗████╗  ██║██╔═══██╗                      ║
║  ██║  ███╗██║███████║██╔██╗ ██║██║   ██║                      ║
║  ██║   ██║██║██╔══██║██║╚██╗██║██║   ██║                      ║
║  ╚██████╔╝██║██║  ██║██║ ╚████║╚██████╔╝                      ║
║   ╚═════╝ ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝                       ║
║                                                               ║
║   ██████╗ ██████╗ ██████╗ ███████╗██╗  ██╗                    ║
║  ██╔════╝██╔═══██╗██╔══██╗██╔════╝╚██╗██╔╝                    ║
║  ██║     ██║   ██║██║  ██║█████╗   ╚███╔╝                     ║
║  ██║     ██║   ██║██║  ██║██╔══╝   ██╔██╗                     ║
║  ╚██████╗╚██████╔╝██████╔╝███████╗██╔╝ ██╗                    ║
║   ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝                    ║
║                                                               ║
║   AI Coding Agent for Giano Chat                              ║
║   v1.0.0                                                      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

async function main(): Promise<void> {
  try {
    // Log configuration
    logInfo("Starting Giano Codex Agent...");
    logInfo(`Workspace: ${config.defaultWorkspace}`);
    logInfo(`LLM: ${config.llmModel}`);
    logInfo(`Sandbox: ${config.sandboxPolicy}`);

    // Initialize agent engine
    const engine = getAgentEngine();
    await engine.init();
    logInfo("Agent engine initialized");

    // Setup graceful shutdown
    setupGracefulShutdown();

    // Start bot
    await startBot();
  } catch (error) {
    logError("Failed to start agent", error);
    console.error("Startup error:", error);
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
