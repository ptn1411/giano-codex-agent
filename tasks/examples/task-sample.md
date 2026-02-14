---
objective: "Analyze and Refactor User Login"
context: "The current login function is monolithic and hard to test."
constraints:
  - "Do not break existing session handling"
  - "Must use existing AuthProvider"
steps:
  - "Extract validation logic to separate function"
  - "Create unit tests for validation"
  - "Refactor login handler to use new validation"
files:
  - "src/auth/login.ts"
  - "src/auth/types.ts"
commandsAllowed:
  - "npm run test"
  - "npm run lint"
---

# Optional Markdown Content

This text is ignored by the task parser but useful for human readability.
