---
name: Bug Fix Template
description: Standard template for fixing bugs
version: "1.0"
variables:
  bug_id: ""
  component: ""
  description: ""
tags:
  - bug
  - fix
---

## Goal

Fix bug {{bug_id}} in {{component}}: {{description}}

## Context

- Bug ID: {{bug_id}}
- Component: {{component}}
- Description: {{description}}

## Affected Files

- `src/{{component}}/`

## Steps

- [ ] Reproduce the bug locally
- [ ] Identify root cause
- [ ] Implement fix
- [ ] Add/update tests
- [ ] Verify fix resolves the issue
- [ ] Run full test suite

## Success Criteria

- [ ] Bug is no longer reproducible
- [ ] All tests pass
- [ ] No regressions introduced
- [ ] Code is clean and well-documented
