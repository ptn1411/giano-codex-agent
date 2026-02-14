# Implementation Plan - Task Format (gca-task-format-30v2)

**Goal:** Standardize how tasks are defined and input into the agent using YAML/Markdown and Zod validation.

## Proposed Changes

### 1. **Types (`src/types/task.ts`)**

- Create new file.
- Define `TaskSpecSchema` using Zod:
  - `objective`: string (required)
  - `context`: string (optional)
  - `constraints`: string[] (optional)
  - `steps`: string[] (required, min 1)
  - `files`: string[] (optional)
  - `commandsAllowed`: string[] (optional)
- Export `TaskSpec` type (inferred).

### 2. **Parser (`src/tasks/parser.ts`)**

- Create new file.
- Implement `parseTask(input: string): TaskSpec`:
  - **YAML Block Detection**: Regex to find ` ```yaml ... ``` `.
  - **Frontmatter Parsing**: Use `gray-matter` if no explicit YAML block.
  - **Validation**: Use `TaskSpecSchema.safeParse`.
  - **Error Handling**: Format Zod errors into readable messages (e.g., "Missing required field: steps").

### 3. **Executor (`src/tasks/executor.ts`)**

- Create new file.
- Implement `formatTaskPrompt(task: TaskSpec): string`.
  - Converts the structured task into the string prompt format expected by `AgentEngine`.

### 4. **Example (`tasks/examples/task-sample.md`)**

- Create directory `tasks/examples`.
- Add a sample task file demonstrating the format.

## Verification Plan

### Manual Verification

1. **YAML Chat Input**:
   - Send a message with a YAML block.
   - Requires hooking up parser to bot handler? (Not explicitly in scope, but implied "Parse được 1 YAML block từ chat").
   - I will add a temporary bot command `/test-parser` or just unit test script if bot integration is out of scope.
   - The task description says "Agent nhận task spec...".
   - I will add a script `scripts/test-task-parser.ts` to manually run and verify.

2. **Markdown File Input**:
   - Run parser script on `tasks/examples/task-sample.md`.

### Automated Tests

- `npm run check` (Type check).
- `scripts/test-task-parser.ts` (Manual run).

## Deployment

- No deployment needed, just code changes.
