/**
 * Auto-Reply System - Types
 * Based on OpenClaw auto-reply-blueprint
 *
 * Simplified version for MVP
 */

// ============================================================================
// Reply Payload
// ============================================================================

export interface ReplyPayload {
  text?: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  replyToId?: string;
  isError?: boolean;
  channelData?: Record<string, unknown>;
}

// ============================================================================
// Message Context
// ============================================================================

export interface MsgContext {
  // Identity
  from?: string;
  to?: string;
  sessionKey?: string;

  // Message content
  body?: string;
  rawBody?: string;

  // Metadata
  provider?: string;
  timestamp?: number;
  messageId?: string;
  threadId?: string | number;
  chatType?: "direct" | "group" | "channel";

  // Media
  images?: ImageContent[];
  attachments?: Attachment[];
}

export interface ImageContent {
  url?: string;
  base64?: string;
  mimeType?: string;
  caption?: string;
}

export interface Attachment {
  type: string;
  url?: string;
  filename?: string;
  size?: number;
}

// ============================================================================
// Reply Options
// ============================================================================

export interface GetReplyOptions {
  runId?: string;
  abortSignal?: AbortSignal;
  images?: ImageContent[];
  isHeartbeat?: boolean;
  disableBlockStreaming?: boolean;

  // Callbacks
  onReplyStart?: () => Promise<void> | void;
  onPartialReply?: (payload: ReplyPayload) => Promise<void> | void;
  onBlockReply?: (payload: ReplyPayload) => Promise<void> | void;
  onToolResult?: (payload: ReplyPayload) => Promise<void> | void;
}

// ============================================================================
// Command Types
// ============================================================================

export interface ChatCommand {
  name: string;
  aliases?: string[];
  description: string;
  handler: CommandHandler;
  requiresAuth?: boolean;
}

export type CommandHandler = (
  ctx: MsgContext,
  args: string
) => Promise<ReplyPayload | ReplyPayload[] | undefined>;

export interface CommandParseResult {
  command?: string;
  args?: string;
  isCommand: boolean;
}

// ============================================================================
// Dispatcher Types
// ============================================================================

export type ReplyDispatchKind = "tool" | "block" | "final";

export interface ReplyDispatcher {
  sendToolResult(payload: ReplyPayload): void;
  sendBlockReply(payload: ReplyPayload): void;
  sendFinalReply(payload: ReplyPayload): void;
  waitForIdle(): Promise<void>;
}

export interface ReplyDispatcherOptions {
  deliver: (
    payload: ReplyPayload,
    meta: { kind: ReplyDispatchKind }
  ) => Promise<void>;
  onReplyStart?: () => Promise<void> | void;
  onError?: (error: Error, meta: { kind: ReplyDispatchKind }) => void;
  onIdle?: () => void;
  humanDelay?: number | { min: number; max: number };
  responsePrefix?: string;
}

// ============================================================================
// Special Tokens
// ============================================================================

export const SILENT_REPLY_TOKEN = "NO_REPLY";
export const HEARTBEAT_OK_TOKEN = "HEARTBEAT_OK";
