# Sprint 2: Feature Scope & Roadmap

**Theme:** Safety, Stability, UX, and Tools (Option A + B + C)

## North Star Goals

1. **Reliability**: Zero crashes due to invalid config or bad task inputs.
2. **Responsiveness**: User sees "Processing..." or progress within 2s of command.
3. **Safety**: Zero secret leaks in logs and strict path containment.

## Feature Backlog

### 1. Code Quality & Safety (Priority P0)

| ID                   | Feature                | Priority | Effort | Description                                                                      |
| -------------------- | ---------------------- | -------- | ------ | -------------------------------------------------------------------------------- |
| `gca-config-zod-29`  | **Config Validation**  | **P0**   | S      | Validate ENV vars with Zod. Redact secrets in logs. Fail fast on missing config. |
| `gca-task-format-30` | **Task Spec Standard** | **P0**   | M      | Standardize Markdown/YAML task input. Strict schema validation.                  |
| `gca-safe-paths`     | **Path Guardrails**    | **P0**   | S      | Enforce rigorous path normalization to prevent traversal.                        |

### 2. Agent UX (Priority P1)

| ID                     | Feature                | Priority | Effort | Description                                                              |
| ---------------------- | ---------------------- | -------- | ------ | ------------------------------------------------------------------------ |
| `gca-streaming-ux-27`  | **Progress Streaming** | **P1**   | M      | Stream step execution status to Giano chat (Started -> Running -> Done). |
| `gca-cancel-resume-28` | **Cancel & Resume**    | **P1**   | M      | Allow `/cancel` to stop loop and `/resume` to continue.                  |

### 3. Tooling (Priority P2)

| ID                        | Feature             | Priority | Effort | Description                                                   |
| ------------------------- | ------------------- | -------- | ------ | ------------------------------------------------------------- |
| `gca-tool-http-25`        | **HTTP Client**     | **P2**   | M      | Safe HTTP GET/POST tool with allowlist domains.               |
| `gca-tool-git-upgrade-26` | **Git Power Tools** | **P2**   | M      | Safer Git wrapper (status, log, diff) with strict boundaries. |

### 4. Observability (Priority P3)

| ID            | Feature           | Priority | Effort | Description                                    |
| ------------- | ----------------- | -------- | ------ | ---------------------------------------------- |
| `gca-metrics` | **Basic Metrics** | **P3**   | S      | Track token usage and execution time per task. |

## Out of Scope (Sprint 2)

- Docker containerization (Sprint 3)
- Multi-agent orchestration
- Database integrations
