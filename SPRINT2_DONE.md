# Sprint 2 Definition of Done (DoD)

**Sprint Goal:** Enhance Safety (C), Stability (B), and Tools (A).

## 1. UX & Control (Task 40, 41)

- [ ] **Streaming Progress**
  - [ ] Agent emits `item.started`, `item.completed` events.
  - [ ] UI receives updates (via `progressHandler` in `src/bot/handlers/agent.ts`).
  - [ ] Updates are throttled (2s interval) to prevent spam.
  - [ ] Tool names are readable in updates.

- [ ] **Cancel / Resume**
  - [ ] `/cancel` or `/stop` immediately sets `isCancelled` flag.
  - [ ] Agent loop checks cancellation after every step.
  - [ ] `turn.cancelled` event is emitted.
  - [ ] `/resume` clears cancellation flag and restarts tool loop (if state persisted).

## 2. Tools (Task 42, 44)

- [ ] **HTTP Tool (`http_request`)**
  - [ ] **Allowed Domains**: Only requests to `HTTP_ALLOWLIST` succeed.
  - [ ] **Timeout**: Requests longer than `timeoutMs` (default 15s) abort.
  - [ ] **Response Limit**: Bodies > 1MB are truncated.
  - [ ] **Redaction**: Authorization headers are redacted in logs.
  - [ ] **Validation**: Invalid URLs or protocols (ftp://) are rejected.

- [ ] **Tool Catalog**
  - [ ] `TOOL_CATALOG.md` created with 11 tools.
  - [ ] Documentation accuracy verified against code (inputs, safety).
  - [ ] README updated with link.

## 3. Specifications & Task Format (Task 43)

- [ ] **Task Spec Schema**
  - [ ] Zod schema defined in `src/types/task.ts`.
  - [ ] Required fields: `objective`, `steps`.
  - [ ] Optional fields: `context`, `constraints`, `files`.

- [ ] **Parser Logic**
  - [ ] Detects ` ```yaml ` block in chat.
  - [ ] Parses Frontmatter in `.md` files.
  - [ ] Validates schema and returns friendly errors.

## 4. Quality Assurance

- [ ] **Build & Check**
  - [ ] `npm run check` passes (no TS errors, lint warnings acceptable).
  - [ ] `npm run build` succeeds (dist/ generated).

- [ ] **Manual Verification**
  - [ ] Run `scripts/test-task-parser.ts` -> Success.
  - [ ] Run Demo Script (`DEMO_SPRINT2.md`).
