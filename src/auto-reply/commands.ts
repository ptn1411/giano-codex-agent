/**
 * Auto-Reply System - Commands Registry
 * Based on OpenClaw auto-reply-blueprint
 */

import type {
  ChatCommand,
  CommandParseResult,
  MsgContext,
  ReplyPayload,
} from "./types.js";

// ============================================================================
// Commands Registry
// ============================================================================

const commands = new Map<string, ChatCommand>();

export function registerCommand(command: ChatCommand): void {
  commands.set(command.name.toLowerCase(), command);
  if (command.aliases) {
    for (const alias of command.aliases) {
      commands.set(alias.toLowerCase(), command);
    }
  }
}

export function getCommand(name: string): ChatCommand | undefined {
  return commands.get(name.toLowerCase());
}

export function getAllCommands(): ChatCommand[] {
  const unique = new Map<string, ChatCommand>();
  for (const cmd of commands.values()) {
    unique.set(cmd.name, cmd);
  }
  return Array.from(unique.values());
}

// ============================================================================
// Command Parsing
// ============================================================================

export function parseCommand(body: string): CommandParseResult {
  const trimmed = body.trim();

  // Check for /command format
  const match = trimmed.match(/^\/(\w+)(?:\s+(.*))?$/s);
  if (match && match[1]) {
    return {
      command: match[1].toLowerCase(),
      args: match[2]?.trim() ?? "",
      isCommand: true,
    };
  }

  return { isCommand: false };
}

// ============================================================================
// Command Execution
// ============================================================================

export async function executeCommand(
  ctx: MsgContext,
  commandName: string,
  args: string
): Promise<ReplyPayload | ReplyPayload[] | undefined> {
  const command = getCommand(commandName);

  if (!command) {
    return {
      text: `Unknown command: /${commandName}. Use /help to see available commands.`,
      isError: true,
    };
  }

  try {
    return await command.handler(ctx, args);
  } catch (error) {
    return {
      text: `Error executing /${commandName}: ${error instanceof Error ? error.message : String(error)}`,
      isError: true,
    };
  }
}

// ============================================================================
// Built-in Commands
// ============================================================================

registerCommand({
  name: "help",
  description: "Show available commands",
  handler: async () => {
    const cmds = getAllCommands();
    const lines = ["**Available Commands:**", ""];
    for (const cmd of cmds) {
      lines.push(`• \`/${cmd.name}\` - ${cmd.description}`);
    }
    return { text: lines.join("\n") };
  },
});

registerCommand({
  name: "status",
  description: "Show agent status",
  handler: async () => {
    return {
      text: [
        "**Agent Status**",
        `• Time: ${new Date().toISOString()}`,
        `• OS: ${process.platform}`,
        `• Node: ${process.version}`,
      ].join("\n"),
    };
  },
});

registerCommand({
  name: "ping",
  aliases: ["p"],
  description: "Check if agent is alive",
  handler: async () => {
    return { text: "🏓 Pong!" };
  },
});
