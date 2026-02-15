import { Bot } from "gianobot";
import { CustomWebSocketManager } from "./bot/ws-manager.js";
import { config } from "./config.js";

// Mock Bot for testing
const mockBot = new Bot("fake-token", {
  mode: "websocket",
  apiBaseUrl: "http://localhost",
  wsUrl: "ws://localhost",
  retryAttempts: 0,
});

// Mock config
config.botToken = "fake-token";

async function testFailFast() {
  console.log("\n--- Testing Fail-Fast (Bad URL Syntax) ---");
  const badUrlManager = new CustomWebSocketManager(
    mockBot,
    "fake-token",
    "invalid-url"
  );
  try {
    await badUrlManager.connect();
  } catch (e: any) {
    if (e.code === "ERR_INVALID_URL" || e instanceof TypeError) {
      console.log("Caught expected error:", e.message);
    } else {
      console.error("Unexpected error:", e);
    }
  }
}

async function testBackoff() {
  console.log("\n--- Testing Backoff (Connection Refused) ---");
  // Use a port that is likely closed to simulate ECONNREFUSED
  const closedUrl = "ws://localhost:9999";
  const manager = new CustomWebSocketManager(mockBot, "fake-token", closedUrl);

  // Create a spy/mock on console.log/info to capture "Reconnecting in..." logs?
  // Or just let it log to stdout and we capture it.

  // We want to run it for a few seconds to see backoff increase
  try {
    manager.connect(); // Fire and forget, don't await because it retries
  } catch (e) {
    // Should not throw immediately
  }

  await new Promise((resolve) => setTimeout(resolve, 10000));
  manager.stop();
}

async function run() {
  await testFailFast();
  await testBackoff();
}

run().catch(console.error);
