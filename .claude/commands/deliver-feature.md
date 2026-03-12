You are orchestrating a full feature delivery. Follow each phase in order.
At each gate, stop and ask the user to approve before continuing.
If any hook blocks a file, ask the user to resolve it before continuing.
If any escalation is needed, present it to the user and wait for their decision.

The feature intent is: $ARGUMENTS

## Phase 1: Bootstrap

1. Create a new branch: `ai/feature-{timestamp}`
2. Push it to origin

Then proceed to Phase 2.

## Phase 2: API Contract

Read and follow `.claude/agents/architect.md` — Phase 1 section only.

Read in this order before doing anything:
- design/ui-spec.md (if it exists — it is PM-approved)
- config/harness.config.yaml
- .claude/skills/codebase/architecture.md
- .claude/skills/codebase/api-patterns.md
- .claude/skills/codebase/data-patterns.md
- api-contract.yaml (existing)
- escalation/log/ (recent resolutions)

Produce:
1. api-contract.yaml — status: PENDING_APPROVAL
2. tasks/current-feature.md — task breakdown per agent

Commit and push with message: `plan(contract): API contract — PENDING_APPROVAL`

## GATE 2: Ask user to approve the contract

Show the user what endpoints and schemas you produced.
Ask: "Approve this contract? (or tell me what to change)"
Wait for their response. If they want changes, make them and ask again.
Once approved, update api-contract.yaml status to APPROVED, commit and push.

## Phase 3: Implementation Plan

Read and follow `.claude/agents/architect.md` — Phase 2 section only.

Read the approved contract and all skill files listed in the architect instructions.
Produce tasks/implementation-plan.md.

Commit and push with message: `plan(impl): implementation plan — PENDING_APPROVAL`

## GATE 3: Ask user to approve the implementation plan

Show a summary of the plan: data model, files to create, key decisions, open questions.
Ask: "Approve this plan? (or tell me what to change)"
Wait for their response. Make changes if requested.

## Phase 4: Build Backend

Read and follow `.claude/agents/backend.md`.

Read in order:
1. tasks/implementation-plan.md
2. api-contract.yaml
3. .claude/skills/codebase/api-patterns.md
4. .claude/skills/codebase/data-patterns.md
5. tasks/current-feature.md

Build the complete backend. All code in app/backend/.
If a hook blocks a file, tell the user and ask them to create it or approve the change.

Commit and push with message: `build(backend): implement per approved plan`

## Phase 5: Build Frontend

Read and follow `.claude/agents/frontend.md`.

Read in order:
1. tasks/implementation-plan.md
2. design/ui-spec.md
3. The actual backend code you just wrote (app/backend/app/schemas/, app/backend/app/routers/)
4. api-contract.yaml
5. .claude/skills/codebase/frontend-patterns.md
6. .claude/skills/codebase/architecture.md
7. tasks/current-feature.md

Build the complete frontend. All code in app/frontend/.

Commit and push with message: `build(frontend): implement per approved plan`

## Phase 6: Test

Read and follow `.claude/agents/tester.md`.

Write adversarial tests. Run them. Document findings in escalation/log/.
Do not fix bugs — only find and document.

Commit and push with message: `test: adversarial suite`

## GATE 4: Ask user to triage test findings

Show the findings. Ask: "Which findings block merge? (or approve all)"

## Phase 7: Review

Read and follow `.claude/agents/reviewer.md`.

Review against contract, plan, DoD, patterns, ui-spec.
Write report to escalation/log/.

Commit and push with message: `review: DoD + plan + ui compliance report`

## GATE 5: Ask user to approve merge

Show the review summary. Ask: "Open PR? (or tell me what needs fixing)"

## Phase 8: Open PR

Create a PR with `gh pr create` targeting main. Include a summary of all gates passed.

Tell the user the PR URL.
