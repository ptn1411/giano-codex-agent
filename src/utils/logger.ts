// src/utils/logger.ts
// Logging system with Winston

import path from "path";
import winston from "winston";

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  const ts = new Date(timestamp as string).toLocaleTimeString();
  const msg = stack || message;
  return `${ts} ${level}: ${msg}`;
});

// Custom format for file output
const fileFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const msg = stack || message;
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `${timestamp} [${level.toUpperCase()}] ${msg}${metaStr}`;
});

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(timestamp(), errors({ stack: true })),
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: combine(colorize(), consoleFormat),
    }),
  ],
});

// Add file transport in production
if (process.env.NODE_ENV === "production") {
  const logsDir = process.env.LOGS_DIR || "./logs";

  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      format: fileFormat,
    }),
  );

  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      format: fileFormat,
    }),
  );
}

// Convenience logging functions
export function logInfo(message: string, meta?: Record<string, unknown>): void {
  logger.info(message, meta);
}

export function logError(
  message: string,
  error?: Error | unknown,
  meta?: Record<string, unknown>,
): void {
  if (error instanceof Error) {
    logger.error(message, { ...meta, stack: error.stack });
  } else {
    logger.error(message, { ...meta, error });
  }
}

export function logWarn(message: string, meta?: Record<string, unknown>): void {
  logger.warn(message, meta);
}

export function logDebug(
  message: string,
  meta?: Record<string, unknown>,
): void {
  logger.debug(message, meta);
}

// Tool execution logging
export function logToolCall(
  toolName: string,
  args: Record<string, unknown>,
): void {
  logger.info(`🔧 Tool: ${toolName}`, { args });
}

export function logToolResult(
  toolName: string,
  success: boolean,
  duration: number,
): void {
  const emoji = success ? "✅" : "❌";
  logger.info(`${emoji} Tool ${toolName} completed in ${duration}ms`);
}

// Agent event logging
export function logAgentEvent(event: string, data?: unknown): void {
  logger.debug(`📡 Event: ${event}`, { data });
}
