# Definition of Done
# What "done" means on this project.
# The reviewer agent checks every item.
# CONFIGURE: Remove items that don't apply, add project-specific requirements.

## Code Quality
- [ ] TypeScript: `tsc --noEmit` passes with zero errors
- [ ] Lint: `eslint` passes with zero warnings
- [ ] No `console.log` in production code
- [ ] No `TODO` or `FIXME` without a linked issue number
- [ ] No functions over 30 lines (decompose if needed)
- [ ] No `any` types without an explanatory comment
- [ ] No commented-out code

## Tests
- [ ] Unit tests written for all new business logic
- [ ] Integration tests for all new API endpoints
- [ ] All new tests pass
- [ ] No skipped tests (`xit`, `it.skip`) without explanation
- [ ] At least one unhappy path tested per endpoint (auth fail, validation fail)
- [ ] Contract tests present — response shapes validated

## API Contract
- [ ] All endpoints in `api-contract.yaml` are implemented
- [ ] No undocumented endpoints exist
- [ ] Response shapes match contract schemas
- [ ] All documented error codes are returned correctly

## Security
- [ ] Auth required on all endpoints that modify data
- [ ] All user inputs validated before business logic
- [ ] No secrets or credentials in code
- [ ] No sensitive data in logs or error responses
- [ ] K2 constraints respected (check `K2-system-context.md`)

## Documentation
- [ ] Non-obvious functions have JSDoc/TSDoc comments
- [ ] `api-contract.yaml` updated for any new/changed endpoints
- [ ] Migration files are named clearly and reversible

## Feature Completeness
- [ ] Loading states on all async UI operations
- [ ] Error states on all async UI operations
- [ ] Escalations: all are resolved (check `escalation/log/`)
- [ ] Agent assumptions: all reviewed and confirmed by human

## Delivery
- [ ] Conventional commit message used
- [ ] PR description explains *why*, not just what
- [ ] No unintended files in diff
- [ ] Reviewer agent report attached to PR (`escalation/log/review-*.md`)

## AI-Specific Checks
- [ ] Build and test agents were separate (no marking own homework)
- [ ] All done signal assumptions reviewed
- [ ] No contract drift — agents didn't improvise beyond the spec
- [ ] Escalation log reviewed — any open escalations are blockers
