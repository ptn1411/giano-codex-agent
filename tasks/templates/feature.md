---
name: Feature Implementation Template
description: Standard template for implementing new features
version: "1.0"
variables:
  feature_name: ""
  component: ""
  description: ""
tags:
  - feature
  - implementation
---

## Goal

Implement {{feature_name}} in {{component}}: {{description}}

## Context

- Feature: {{feature_name}}
- Component: {{component}}
- Description: {{description}}

## Affected Files

- `src/{{component}}/`

## Steps

- [ ] Create implementation plan
- [ ] Set up file structure
- [ ] Implement core logic
- [ ] Add error handling
- [ ] Write unit tests
- [ ] Add documentation
- [ ] Integration testing

## Success Criteria

- [ ] Feature works as described
- [ ] All tests pass
- [ ] Documentation is complete
- [ ] Code follows project conventions
- [ ] No performance regressions
