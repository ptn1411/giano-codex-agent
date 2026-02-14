import { config } from "../config.js";
import type { ToolDefinition, ToolHandler } from "../types/index.js";
import { logger } from "../utils/logger.js";

// Validation helper
function isAllowed(url: string, allowlist: string[]): boolean {
  try {
    const hostname = new URL(url).hostname;
    // If allowlist contains "*", allow everything (use with caution)
    if (allowlist.includes("*")) return true;

    // Check specific domains
    return allowlist.some(
      (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
    );
  } catch {
    return false;
  }
}

// Redact sensitive headers
function redactHeaders(
  headers: Record<string, string>
): Record<string, string> {
  const sensitive = ["authorization", "cookie", "x-api-key", "token"];
  const redacted: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (sensitive.includes(k.toLowerCase())) {
      redacted[k] = "[REDACTED]";
    } else {
      redacted[k] = v;
    }
  }
  return redacted;
}

export const httpRequestDefinition: ToolDefinition = {
  name: "http_request",
  description:
    "Make an HTTP request to an allowed external API. Use this for fetching data or interacting with services.",
  parameters: {
    type: "object",
    properties: {
      method: {
        type: "string",
        description: "HTTP method",
        enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      },
      url: {
        type: "string",
        description: "Target URL (must be in allowed domains list)",
      },
      headers: {
        type: "object",
        description: "HTTP headers",
      },
      query: {
        type: "object",
        description: "Query parameters to append to URL",
      },
      jsonBody: {
        type: "object",
        description: "JSON body for POST/PUT/PATCH requests",
      },
      timeoutMs: {
        type: "number",
        description: "Timeout in milliseconds (default 15000, max 60000)",
      },
    },
    required: ["method", "url"],
  },
};

export const httpRequestHandler: ToolHandler = async (args, context) => {
  const method = (args.method as string).toUpperCase();
  const rawUrl = args.url as string;
  const headers = (args.headers as Record<string, string>) || {};
  const query = (args.query as Record<string, any>) || {};
  const jsonBody = args.jsonBody;
  const timeoutMs = Math.min(
    Math.max((args.timeoutMs as number) || 15000, 1000),
    60000
  );

  // 1. URL Validation
  let urlObj: URL;
  try {
    urlObj = new URL(rawUrl);
    if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
      throw new Error("Only HTTP/HTTPS protocols are supported.");
    }
  } catch (e) {
    return {
      toolCallId: "",
      success: false,
      output: `Invalid URL: ${rawUrl}`,
      error: "Invalid URL format",
    };
  }

  // 2. Allowlist Check
  if (!config.httpAllowlist || config.httpAllowlist.length === 0) {
    return {
      toolCallId: "",
      success: false,
      output: "HTTP requests are disabled (HTTP_ALLOWLIST is empty).",
      error: "Safety policy violation",
    };
  }

  if (!isAllowed(rawUrl, config.httpAllowlist)) {
    return {
      toolCallId: "",
      success: false,
      output: `Domain ${urlObj.hostname} is not in the allowlist. Allowed: ${config.httpAllowlist.join(", ")}`,
      error: "Safety policy violation",
    };
  }

  // Add query params
  Object.entries(query).forEach(([k, v]) => {
    urlObj.searchParams.append(k, String(v));
  });

  const finalUrl = urlObj.toString();

  // Log request (redacted)
  logger.info(`HTTP ${method} ${finalUrl}`, {
    threadId: context.threadId,
    headers: redactHeaders(headers),
  });

  // 3. Execution
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const options: RequestInit = {
      method,
      headers: {
        "User-Agent": "GianoCodexAgent/1.0",
        "Content-Type": "application/json",
        ...headers,
      },
      signal: controller.signal,
    };

    if (jsonBody && ["POST", "PUT", "PATCH"].includes(method)) {
      options.body = JSON.stringify(jsonBody);
    }

    const start = Date.now();
    const response = await fetch(finalUrl, options);
    const duration = Date.now() - start;

    clearTimeout(timeoutId);

    // Read body
    const text = await response.text();

    // Truncate if too long (1MB)
    const MAX_SIZE = 1024 * 1024;
    let bodyOutput = text;
    if (text.length > MAX_SIZE) {
      bodyOutput = text.substring(0, MAX_SIZE) + "... [TRUNCATED]";
    }

    // Try parsing JSON for prettier output if applicable
    let formattedBody = bodyOutput;
    try {
      if (text.length <= MAX_SIZE) {
        const json = JSON.parse(text);
        formattedBody = JSON.stringify(json, null, 2);
      }
    } catch {
      // Ignore JSON parse errors, return raw text
    }

    if (!response.ok) {
      return {
        toolCallId: "",
        success: true,
        output: `HTTP Request Failed (${response.status} ${response.statusText}):\n${formattedBody}`,
      };
    }

    return {
      toolCallId: "",
      success: true,
      output: `HTTP Request Successful (${response.status} ${response.statusText}):\n${formattedBody}`,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const isTimeout = error instanceof Error && error.name === "AbortError";
    const msg = isTimeout
      ? `Request timed out after ${timeoutMs}ms`
      : error instanceof Error
        ? error.message
        : String(error);

    logger.error(`HTTP request failed: ${msg}`, { threadId: context.threadId });

    return {
      toolCallId: "",
      success: false,
      output: `Network Error: ${msg}`,
      error: msg,
    };
  }
};
