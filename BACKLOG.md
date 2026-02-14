# Giano Codex Agent - Upgrade Backlog

Planned improvements for stability, safety, and developer experience.

## 1. Stability

| Priority | Item                             | Effort | Description                                                                          |
| -------- | -------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| P0       | **Retry/Backoff for LLM calls**  | S      | Implement exponential backoff for API rate limits and transient errors.              |
| P0       | **Tool Execution Timeout**       | M      | Add configurable timeouts and cancellation support for long-running tools.           |
| P1       | **User-Friendly Error Messages** | S      | Sanitize error outputs sent to chat to avoid leaking stack traces or internal paths. |
| P2       | **Graceful Shutdown**            | S      | Handle SIGTERM/SIGINT to clean up resources and finish pending tasks safely.         |

## 2. Safety

| Priority | Item                              | Effort | Description                                                                         |
| -------- | --------------------------------- | ------ | ----------------------------------------------------------------------------------- |
| P0       | **Strict Path Validation**        | S      | Enforce workspace confinement across all file operations (resolve/normalize paths). |
| P1       | **OS-Specific Command Allowlist** | M      | Define strict command allowlists tailored for Windows/Linux/macOS environments.     |
| P2       | **Command Audit Logging**         | M      | Log all executed commands with user ID, timestamp, and arguments for audit trails.  |
| P1       | **Input Sanitization**            | S      | Sanitize all tool arguments to prevent injection attacks or accidental execution.   |

## 3. Developer Experience (DevEx)

| Priority | Item                           | Effort | Description                                                                    |
| -------- | ------------------------------ | ------ | ------------------------------------------------------------------------------ |
| P2       | **Architecture Documentation** | M      | Create high-level architecture diagram and component overview.                 |
| P2       | **Tool Catalog Docs**          | M      | Document all available tools, their inputs, outputs, and usage examples.       |
| P1       | **Smoke Test Script**          | M      | Create a `npm run smoke` script to verify basic agent functionality (dry-run). |
| P2       | **Pre-commit Hooks**           | S      | Setup Husky to run lint/type-check automatically before commit.                |
