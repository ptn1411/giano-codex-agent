/**
 * Auto-Reply System - Reply Dispatcher
 * Based on OpenClaw auto-reply-blueprint
 */

import type {
  ReplyDispatcher,
  ReplyDispatcherOptions,
  ReplyDispatchKind,
  ReplyPayload,
} from "./types.js";

// ============================================================================
// Create Reply Dispatcher
// ============================================================================

export function createReplyDispatcher(
  options: ReplyDispatcherOptions
): ReplyDispatcher {
  let sendChain: Promise<void> = Promise.resolve();
  let pending = 0;
  let sentFirstBlock = false;

  const enqueue = (kind: ReplyDispatchKind, payload: ReplyPayload) => {
    // Skip silent replies
    if (payload.text?.trim() === "NO_REPLY") {
      return;
    }

    // Apply response prefix
    if (options.responsePrefix && payload.text) {
      payload.text = options.responsePrefix + payload.text;
    }

    pending++;

    // Human-like delay between block replies
    const shouldDelay = kind === "block" && sentFirstBlock;
    if (kind === "block") sentFirstBlock = true;

    sendChain = sendChain
      .then(async () => {
        if (shouldDelay && options.humanDelay) {
          const delayMs = getHumanDelay(options.humanDelay);
          if (delayMs > 0) await sleep(delayMs);
        }
        await options.deliver(payload, { kind });
      })
      .catch((err) => {
        options.onError?.(err instanceof Error ? err : new Error(String(err)), {
          kind,
        });
      })
      .finally(() => {
        pending--;
        if (pending === 0) options.onIdle?.();
      });
  };

  return {
    sendToolResult: (payload) => enqueue("tool", payload),
    sendBlockReply: (payload) => enqueue("block", payload),
    sendFinalReply: (payload) => enqueue("final", payload),
    waitForIdle: () => sendChain,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function getHumanDelay(delay: number | { min: number; max: number }): number {
  if (typeof delay === "number") return delay;
  return Math.floor(Math.random() * (delay.max - delay.min + 1)) + delay.min;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
