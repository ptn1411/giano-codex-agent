# Tool Catalog

This document lists all tools available to the Giano Codex Agent, including their purpose, input schema, and usage examples.

## Table of Contents

- [File Operations](#file-operations)
  - [read_file](#read_file)
  - [write_file](#write_file)
  - [edit_file](#edit_file)
  - [list_dir](#list_dir)
- [Search](#search)
  - [grep_search](#grep_search)
- [Command Execution](#command-execution)
  - [exec_command](#exec_command)
- [Git Integration](#git-integration)
  - [git](#git)
  - [git_enhanced](#git_enhanced)
- [Memory](#memory)
  - [memory_search](#memory_search)
  - [memory_add](#memory_add)
- [Network](#network)
  - [http_request](#http_request)

---

## File Operations

### read_file

Read the contents of a file.

- **Inputs**:
  - `path` (string, required): Absolute path to the file.
- **Example**:
  ```javascript
  { "path": "/path/to/file.ts" }
  ```

### write_file

Create or overwrite a file with content.

- **Inputs**:
  - `path` (string, required): Absolute path to the file.
  - `content` (string, required): Content to write.
- **Example**:
  ```javascript
  { "path": "/path/to/new.ts", "content": "console.log('Hello');" }
  ```
- **Safety**: Requires approval if configured (default: workspace-write allowed).

### edit_file

Edit a file by replacing specific content.

- **Inputs**:
  - `path` (string, required): Absolute path to the file.
  - `search` (string, required): exact text to search for.
  - `replace` (string, required): text to replace with.
  - `all` (boolean, optional): replace all occurrences (default: false).
- **Example**:
  ```javascript
  { "path": "/a/b.ts", "search": "var x", "replace": "const x" }
  ```

### list_dir

List contents of a directory.

- **Inputs**:
  - `path` (string, optional): Directory path (default: ".").
  - `recursive` (boolean, optional): List recursively (default: false).
  - `maxDepth` (number, optional): Max recursion depth (default: 3).
- **Example**:
  ```javascript
  { "path": "src", "recursive": true }
  ```

---

## Search

### grep_search

Search for text patterns in files.

- **Inputs**:
  - `pattern` (string, required): Text or regex pattern.
  - `path` (string, optional): Directory to search (default: ".").
  - `filePattern` (string, optional): Glob pattern (e.g. "\*.ts").
  - `caseSensitive` (boolean, optional): Default: false.
  - `maxResults` (number, optional): Default: 50.
- **Example**:
  ```javascript
  { "pattern": "TODO:", "path": "src", "filePattern": "*.ts" }
  ```

---

## Command Execution

### exec_command

Execute a shell command.

- **Inputs**:
  - `command` (string, required): Command to run.
  - `timeout` (number, optional): Timeout in ms (default: 30000).
- **Example**:
  ```javascript
  { "command": "npm test" }
  ```
- **Safety**: **High Risk**. Requires approval explicitly unless in low-risk mode.

---

## Git Integration

### git

Run raw git commands.

- **Inputs**:
  - `args` (string[], required): Git arguments.
- **Example**:
  ```javascript
  { "args": ["status", "-s"] }
  ```

### git_enhanced

High-level git operations helper.

- **Inputs**:
  - `operation` (string, required): "auto_branch", "auto_commit", "status_summary", "diff_summary".
  - `branch_prefix` (string, optional): Prefix for auto_branch (default: "feature").
  - `description` (string, optional): Description for branch/commit.
- **Example**:
  ```javascript
  { "operation": "auto_commit", "description": "feat: add user login" }
  ```

---

## Memory

### memory_search

Search the agent's long-term memory.

- **Inputs**:
  - `query` (string, required): Search query.
  - `limit` (number, optional): Max results (default: 5).
  - `sources` (string[], optional): Filter by source.
- **Example**:
  ```javascript
  { "query": "coding standards" }
  ```

### memory_add

Add a new item to long-term memory.

- **Inputs**:
  - `text` (string, required): Content to remember.
  - `source` (string, optional): Source label (default: "manual").
- **Example**:
  ```javascript
  { "text": "User prefers tabs over spaces", "source": "preference" }
  ```

---

## Network

### http_request

Make an HTTP request to an allowed external API.

- **Inputs**:
  - `method` (string, required): GET, POST, PUT, DELETE, PATCH.
  - `url` (string, required): Target URL (must be allowed).
  - `headers` (object, optional): Request headers.
  - `query` (object, optional): Query parameters.
  - `jsonBody` (object, optional): JSON body.
  - `timeoutMs` (number, optional): Timeout (default: 15000).
- **Safety**:
  - **Allowlist**: Only domains in `HTTP_ALLOWLIST` are permitted.
  - **Redaction**: Sensitive headers are redacted in logs.
- **Example**:
  ```javascript
  {
    "method": "GET",
    "url": "https://api.example.com/data",
    "query": { "limit": 10 }
  }
  ```
