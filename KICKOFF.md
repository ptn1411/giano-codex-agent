# Project Kickoff: Giano Codex Agent Upgrade

## Goal

Bring the repository to a "green" state (type-check, lint, build pass) and establish CI/CD readiness.

## Scope

**In Scope:**

- Fixing build errors (Regex in `safety.ts`).
- Fixing ESLint errors.
- Adding quality gate script (`npm run check`).
- Setting up GitHub Actions CI.
- Repository cleanup and standardization.
- Creating upgrade backlog for next sprint.

**Out of Scope:**

- Major feature implementation (deferred to next sprint).
- Architectural refactoring (deferred).

## Milestones & Status

1. **Stabilize**: Fix regex syntax in `safety.ts` to restore build. (Done)
2. **Lint**: Fix ESLint errors to achieve clean lint run. (Done)
3. **Quality Gate**: Add `check` script in `package.json`. (Done)
4. **Cleanup**: Standardize repo state and sync lockfiles. (Done)
5. **CI**: Setup GitHub Actions workflow. (Done)
6. **Next Steps**: Define backlog for Stability, Safety, DevEx upgrades. (Done)

## Definition of Done (DoD)

- `npm run type-check` passes (exit code 0).
- `npm run lint` passes (no errors).
- `npm run build` passes (exit code 0).
- `npm run check` executes all above successfully.
- CI workflow passes on PR/push.
- Documentation updated (README, BACKLOG).

## Risks

- **ESM/CJS Imports**: Potential conflicts with `require` vs `import` in some dependencies.
- **Bun vs NPM**: Project scripts use Bun, but some standard workflows expect NPM. Mitigated by using `bun install`/`bun run` in CI.
- **Regex Pitfalls**: Complex regex in security modules can break parsers or be vulnerable. Mitigated by careful escaping and testing.
