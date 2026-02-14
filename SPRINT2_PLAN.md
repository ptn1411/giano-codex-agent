# Sprint 2 Implementation Plan

**Objective:** Enhance Giano Codex Agent capabilities (Tooling) and User Experience (Control/Visibility) while maintaining strict safety.

## Milestones

### Milestone 1: Foundation, Safety & UX (Priority B + C)

**Goal:** Agent is stable, configurable, and transparent to the user.

1. **Safety Foundation**: `gca-config-zod-29` (P0)
   - [ ] Implement Zod schema for config.
   - [ ] Redact secrets in logs.
2. **Task Standard**: `gca-task-format-30` (P0)
   - [ ] Define standardized Task Spec (YAML/MD).
   - [ ] Robust parsers with clear error messages.
3. **User Experience**: `gca-streaming-ux-27` (P1)
   - [ ] Streaming progress updates (Started -> Running -> Done).
   - [ ] Tool execution visualization in chat.
4. **Control**: `gca-cancel-resume-28` (P1)
   - [ ] Implement `/cancel` and `/stop` commands.
   - [ ] Implement `/resume` logic.

### Milestone 2: Capabilities & Tooling (Priority A)

**Goal:** Agent can interact with the outside world and manage code more effectively.

1. **Connectivity**: `gca-tool-http-25` (P2)
   - [ ] Safe HTTP Client (GET/POST).
   - [ ] Allowlist domain configuration.
2. **Git Enhancements**: `gca-tool-git-upgrade-26` (P2)
   - [ ] Safer Git wrapper (log, diff, status).
   - [ ] Guardrails for push/reset.

## Definition of Done (DoD)

- **Code:** Type-check pass, Lint pass (0 errors), Build pass.
- **Tests:** `npm run check` passes.
- **Docs:** Updated `README.md` or `backend-docs` if features require configuration.
- **Manual Verification:** Verified via Giano Chat (simulated locally if needed).

## Risks & Mitigation

- **HTTP Security:** Risk of SSRF. Mitigation: Strict allowlist in `.env` (default empty).
- **Infinite Loops:** Risk of agent getting stuck. Mitigation: `/cancel` command (Step 4 M1) MUST work within 1 loop iteration.
- **Secret Leaks:** Risk of logging tokens. Mitigation: Zod validation + custom logger redaction (Step 1 M1).
