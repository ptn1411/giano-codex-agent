// src/bot/handlers/index.ts
// Handler registration

import type { Bot } from "gianobot";
import { setupAgentHandler } from "./agent.js";
import { setupConfigHandler } from "./config.js";
import { setupHelpHandler } from "./help.js";
import { setupResetHandler } from "./reset.js";
import { setupStatusHandler } from "./status.js";
// import { setupTasksHandler } from "./tasks.js";

export function setupHandlers(bot: Bot): void {
  // Core commands
  setupAgentHandler(bot);
  setupStatusHandler(bot);
  setupResetHandler(bot);
  setupHelpHandler(bot);

  // Task commands
  // setupTasksHandler(bot);

  // Admin commands
  setupConfigHandler(bot);
}

export { setupAgentHandler } from "./agent.js";
export { setupConfigHandler } from "./config.js";
export { setupHelpHandler } from "./help.js";
export { setupResetHandler } from "./reset.js";
export { setupStatusHandler } from "./status.js";
// export { setupTasksHandler } from "./tasks.js";
