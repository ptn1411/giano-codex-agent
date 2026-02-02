---
name: Refactoring Template
description: Standard template for code refactoring
version: "1.0"
variables:
  target: ""
  goal: ""
tags:
  - refactor
  - cleanup
---

## Goal

Refactor {{target}}: {{goal}}

## Context

- Target: {{target}}
- Goal: {{goal}}

## Affected Files

- `{{target}}`

## Steps

- [ ] Analyze current code structure
- [ ] Identify refactoring opportunities
- [ ] Create backup/snapshot
- [ ] Apply refactoring changes
- [ ] Update affected tests
- [ ] Verify functionality unchanged
- [ ] Run full test suite

## Success Criteria

- [ ] Code is cleaner and more maintainable
- [ ] All existing tests pass
- [ ] No functionality changes
- [ ] Performance is equal or better
- [ ] Code follows best practices
