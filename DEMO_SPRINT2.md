# Demo Script - Sprint 2 (Safety, UX, Tools)

**Duration:** ~5 Minutes

## Scenario 1: Streaming & Cancellation (UX)

1.  **Start Long Task**:
    - Input: `@agent run a loop that prints "working..." 10 times with 1s delay`
    - _Observation_: See "▶️ Working..." updates appear periodically.
    - _Observation_: Updates are not every single line (throttled).

2.  **Cancel Mid-Task**:
    - Input: `/cancel` (while task is running).
    - _Observation_: Agent stops immediately. "⛔ Task cancelled by user."

3.  **Resume Task**:
    - Input: `/resume`
    - _Observation_: Agent picks up (or restarts turn). "▶️ Resuming..."

## Scenario 2: HTTP Request & Safety (Tools)

1.  **Allowed Request**:
    - Setup: Ensure `HTTP_ALLOWLIST=jsonplaceholder.typicode.com` in `.env`.
    - Input: `@agent call http_request to GET https://jsonplaceholder.typicode.com/todos/1`
    - _Observation_: Returns JSON body `{"userId": 1, ...}`.
    - _Observation_: Check logs -> No secrets leaked (if headers used).

2.  **Blocked Request**:
    - Input: `@agent call http_request to GET https://google.com`
    - _Observation_: Tool returns "Safety policy violation". Agent explains it can't access the domain.

## Scenario 3: Structured Task Input (Task Format)

1.  **YAML Input**:
    - Input:
      ```yaml
      objective: "Check Node version"
      steps:
        - "Run node --version"
        - "Run npm --version"
      ```
    - _Observation_: Agent parses task, "Received Task: Check Node version", and executes steps 1 & 2.

2.  **Invalid Input**:
    - Input:
      ```yaml
      steps: ["Just steps"]
      ```
    - _Observation_: Agent replies "Validation Error: objective: Required".

## Scenario 4: Tool Catalog

1.  **Help/Docs**:
    - Input: "Which tools do you have?"
    - _Observation_: Agent mentions `http_request`, `git`, `file` tools, referring to knowledge of `TOOL_CATALOG.md` (if ingested/read).
