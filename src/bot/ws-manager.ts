import { Bot } from "gianobot";
import Link from "ws";
import { logDebug, logError, logInfo, logWarn } from "../utils/logger.js";

// We use 'any' to access private members of Bot that we need to interface with (updateRouter)

export class CustomWebSocketManager {
  private ws: Link | null = null;
  private reconnectAttempts = 0;
  private isConnected = false;
  private shouldReconnect = true;
  private pingInterval: NodeJS.Timeout | null = null;
  private connectionStableTimer: NodeJS.Timeout | null = null;

  // Config
  private readonly maxReconnectAttempts = 30;
  private readonly baseDelay = 1000;
  private readonly maxDelay = 30000;
  private readonly stableConnectionThreshold = 30000;
  private readonly pingIntervalMs = 20000;

  constructor(
    private bot: Bot,
    private token: string,
    private url: string
  ) {}

  public async connect(): Promise<void> {
    // Fail-fast validation
    if (!this.token || !this.url) {
      const error = new Error(
        "Configuration Error: Missing BOT_TOKEN or GIANO_WS_URL"
      );
      logError("Fatal Error", error);
      throw error;
    }

    try {
      new URL(this.url);
    } catch (e) {
      logError("Fatal Error: Invalid WebSocket URL", e);
      throw e;
    }

    this.shouldReconnect = true;
    this.attemptConnection();
  }

  private attemptConnection(): void {
    if (!this.shouldReconnect) return;

    const connectUrl = `${this.url}?token=${this.token}`;
    // Redact token for logs
    const redactedUrl = this.url.replace(this.token, "***") + "?token=***";

    logInfo(`Connecting to Giano WebSocket...`, {
      attempt: this.reconnectAttempts + 1,
      url: redactedUrl,
    });

    try {
      this.ws = new Link(connectUrl);

      this.ws.on("open", () => this.handleOpen());
      this.ws.on("message", (data: any) => this.handleMessage(data));
      this.ws.on("close", (code: number, reason: Buffer) =>
        this.handleClose(code, reason.toString())
      );
      this.ws.on("error", (err: Error) => this.handleError(err));
    } catch (error) {
      logError("Failed to initialize WebSocket", error);
      this.scheduleReconnect();
    }
  }

  private handleOpen(): void {
    logInfo("WebSocket connection open. Verifying stability...");
    this.isConnected = true;

    // Notify bot that we are ready
    (this.bot as any).emit("ready");

    this.startPing();

    // Reset attempts only after stability
    if (this.connectionStableTimer) clearTimeout(this.connectionStableTimer);
    this.connectionStableTimer = setTimeout(() => {
      if (this.isConnected) {
        logInfo("WebSocket connection stable (>30s). Resetting backoff.");
        this.reconnectAttempts = 0;
      }
    }, this.stableConnectionThreshold);
  }

  private handleMessage(data: any): void {
    try {
      const msgString = data.toString();
      const parsed = JSON.parse(msgString);

      if (parsed.event === "BotConnected" || parsed.event === "bot_connected") {
        logInfo("Handshake success: Bot authenticated.", {
          botName: parsed.data.botName || parsed.data.bot_name,
        });
      }

      if (parsed.event === "BotUpdate" || parsed.event === "bot_update") {
        const update = {
          updateId: parsed.data.updateId,
          message: parsed.data.message,
        };
        const botAny = this.bot as any;
        if (
          botAny.updateRouter &&
          typeof botAny.updateRouter.route === "function"
        ) {
          botAny.updateRouter.route(update);
        } else {
          logError("Internal Error: Bot updateRouter not found or invalid.");
        }
      }
    } catch (error) {
      logError("Error parsing WebSocket message", error);
    }
  }

  private handleClose(code: number, reason: string): void {
    logInfo(`WebSocket closed.`, {
      code,
      reason,
      reconnectAttempts: this.reconnectAttempts,
    });

    this.isConnected = false;
    this.stopPing();
    if (this.connectionStableTimer) clearTimeout(this.connectionStableTimer);

    // Fail-fast on specific codes
    if (
      code === 4001 ||
      code === 4003 ||
      reason.toLowerCase().includes("auth") ||
      reason.toLowerCase().includes("token") ||
      reason.toLowerCase().includes("invalid token")
    ) {
      logError("Fatal Connection Error: Authentication failed.");
      logError(`Code: ${code}, Reason: ${reason}`);
      logError("Please check your BOT_TOKEN and GIANO_WS_URL.");

      this.shouldReconnect = false;
      // Emit error so main process knows
      (this.bot as any).emit(
        "error",
        new Error(`Authentication failed: ${reason}`)
      );
      // Exit to prevent hanging if desired, or let main logic handle it
      // Task says "dừng" (stop).
      return;
    }

    if (this.shouldReconnect) {
      this.scheduleReconnect();
    }
  }

  private handleError(error: Error): void {
    logError("WebSocket error occurred", error);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // We could stop here, but user asked for "max 30s" backoff which implies indefinite retrying
      // with max delay. But "max attempts" is a safety valve.
      // If we want infinite retry, we should remove this check or just log warning.
      logWarn("High reconnect attempt count", {
        count: this.reconnectAttempts,
      });
    }

    // Exponential backoff
    // 1s, 2s, 4s... max 30s
    let delay = this.baseDelay * Math.pow(2, this.reconnectAttempts);
    if (delay > this.maxDelay) {
      delay = this.maxDelay;
    }

    // Jitter
    const jitter = Math.floor(Math.random() * 1000);
    const finalDelay = delay + jitter;

    logInfo(`Reconnecting in ${Math.round(finalDelay)}ms...`, {
      attempt: this.reconnectAttempts + 1,
    });

    setTimeout(() => {
      this.reconnectAttempts++;
      this.attemptConnection();
    }, finalDelay);
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === Link.OPEN) {
        this.ws.ping();
        logDebug("Sent ping");
      }
    }, this.pingIntervalMs);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public stop(): void {
    this.shouldReconnect = false;
    this.stopPing();
    if (this.connectionStableTimer) clearTimeout(this.connectionStableTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    logInfo("CustomWebSocketManager stopped.");
  }
}
