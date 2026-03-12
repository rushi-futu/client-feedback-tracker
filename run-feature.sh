#!/bin/bash
# Local feature delivery pipeline
# Mirrors ai-feature.yml but runs directly on your machine.
# Real-time logs, interactive gates, no Docker.
#
# Usage:
#   ./run-feature.sh "As a client success manager I want to log feedback..."

set -uo pipefail

INTENT="${1:?Usage: ./run-feature.sh \"feature intent\"}"
BRANCH="ai/feature-$(date +%Y%m%d-%H%M%S)"

# Colors for readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

step()  { echo -e "\n${CYAN}═══════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}═══════════════════════════════════════${NC}\n"; }
gate()  { echo -e "\n${YELLOW}┌─────────────────────────────────────┐${NC}"; echo -e "${YELLOW}│  GATE: $1${NC}"; echo -e "${YELLOW}└─────────────────────────────────────┘${NC}"; }
ok()    { echo -e "${GREEN}✓ $1${NC}"; }
fail()  { echo -e "${RED}✗ $1${NC}"; exit 1; }

# ── Bootstrap ──────────────────────────────────────────────────────
step "Bootstrap: creating branch $BRANCH"
git checkout -b "$BRANCH"
git push origin "$BRANCH"
ok "Branch created"

# ── Plan 1/2: API Contract ────────────────────────────────────────
step "Plan 1/2: API Contract"
AGENT=$(cat .claude/agents/architect.md)
claude \
  --system-prompt "$AGENT" \
  --dangerously-skip-permissions \
  -p "
## Phase 1: API Contract

Read in this order before doing anything:
- design/ui-spec.md (if it exists — it is PM-approved)
- config/harness.config.yaml
- .claude/skills/codebase/architecture.md
- .claude/skills/codebase/api-patterns.md
- .claude/skills/codebase/data-patterns.md
- api-contract.yaml (existing)
- escalation/log/ (recent resolutions)

Feature intent: ${INTENT}

Produce:
1. Append to api-contract.yaml — status: PENDING_APPROVAL
   Every endpoint must serve a component or interaction from the ui-spec.
2. Write tasks/current-feature.md — task breakdown per agent

Do not write any implementation plan or application code.
If design/ui-spec.md has unresolved ambiguities, escalate and stop.
Output your Phase 1 Done Signal when complete.
"

git add api-contract.yaml tasks/current-feature.md escalation/ 2>/dev/null || true
git diff --staged --quiet || git commit -m "plan(contract): API contract — PENDING_APPROVAL"
git push origin "$BRANCH"
ok "Contract committed"

# ── Gate 2: Approve contract ──────────────────────────────────────
gate "Approve API contract"
echo "Review api-contract.yaml and tasks/current-feature.md"
read -p "Approve? (y/n): " APPROVE
[[ "$APPROVE" == "y" ]] || fail "Contract rejected. Edit and re-run."

# Mark as approved
sed -i '' 's/Status: PENDING_APPROVAL/Status: APPROVED/g' api-contract.yaml
git add api-contract.yaml
git diff --staged --quiet || git commit -m "plan(contract): mark contract APPROVED"
git push origin "$BRANCH"
ok "Contract approved"

# ── Plan 2/2: Implementation Plan ─────────────────────────────────
step "Plan 2/2: Implementation Plan"
claude \
  --system-prompt "$AGENT" \
  --dangerously-skip-permissions \
  -p "
## Phase 2: Implementation Plan

The contract has been approved by humans.

Read in this order:
- api-contract.yaml (confirm status is APPROVED — stop if not)
- design/ui-spec.md (component inventory and component tree sections)
- tasks/current-feature.md
- .claude/skills/codebase/architecture.md
- .claude/skills/codebase/api-patterns.md
- .claude/skills/codebase/data-patterns.md
- .claude/skills/codebase/frontend-patterns.md

Produce tasks/implementation-plan.md — follow your Phase 2 output format exactly:
- Data model (tables, columns, types, constraints, migrations)
- Shared Types (Pydantic + TypeScript — both sides, verbatim)
- Backend files to create
- Backend service logic (pseudocode spec — no real code)
- Frontend files to create (with ui-spec reference for each component)
- Frontend component tree (annotated with server/client + API calls)
- Decisions made (with reasoning and rejected alternatives)
- Testability notes
- Open questions (with stated defaults)

Do not write any application code.
Output your Phase 2 Done Signal when complete.
"

git add tasks/implementation-plan.md escalation/ 2>/dev/null || true
git diff --staged --quiet || git commit -m "plan(impl): implementation plan — PENDING_APPROVAL"
git push origin "$BRANCH"
ok "Implementation plan committed"

# ── Gate 3: Approve implementation plan ───────────────────────────
gate "Approve implementation plan"
echo "Review tasks/implementation-plan.md"
read -p "Approve? (y/n): " APPROVE
[[ "$APPROVE" == "y" ]] || fail "Plan rejected. Edit and re-run."
ok "Plan approved"

# ── Build: Backend ────────────────────────────────────────────────
step "Build: Backend"
BE_AGENT=$(cat .claude/agents/backend.md)
claude \
  --system-prompt "$BE_AGENT" \
  --dangerously-skip-permissions \
  -p "
Read in this order before writing any code:
1. tasks/implementation-plan.md — primary source of truth
2. api-contract.yaml — confirm APPROVED
3. .claude/skills/codebase/api-patterns.md
4. .claude/skills/codebase/data-patterns.md
5. tasks/current-feature.md — mark backend tasks done as you go

Build the complete backend implementation.
Implement exactly what the plan describes — no more, no less.
All code in app/backend/.
Output your Done Signal when complete.
"

git add app/backend/ tasks/ escalation/ 2>/dev/null || true
git diff --staged --quiet || git commit -m "build(backend): implement per approved plan"
git push origin "$BRANCH"
ok "Backend committed"

# ── Build: Frontend ───────────────────────────────────────────────
step "Build: Frontend"
FE_AGENT=$(cat .claude/agents/frontend.md)
claude \
  --system-prompt "$FE_AGENT" \
  --dangerously-skip-permissions \
  -p "
Read in this order before writing any code:
1. tasks/implementation-plan.md — primary source of truth
2. design/ui-spec.md — layout and interaction reference (do not copy code)
3. Read the backend code already built:
   - app/backend/app/schemas/ — actual Pydantic schemas
   - app/backend/app/routers/ — actual endpoints and query params
4. api-contract.yaml — confirm APPROVED
5. .claude/skills/codebase/frontend-patterns.md
6. .claude/skills/codebase/architecture.md
7. tasks/current-feature.md — mark frontend tasks done as you go

Build the complete frontend implementation from scratch.
The backend is already built — read it.
Use the ui-spec for what to build and how it should look.
Use the patterns for how to build it.
All code in app/frontend/.
Output your Done Signal when complete.
"

git add app/frontend/ tasks/ escalation/ 2>/dev/null || true
git diff --staged --quiet || git commit -m "build(frontend): implement per approved plan"
git push origin "$BRANCH"
ok "Frontend committed"

# ── Test ──────────────────────────────────────────────────────────
step "Test: Adversarial Suite"
TEST_AGENT=$(cat .claude/agents/tester.md)
TS=$(date +%Y%m%d-%H%M%S)
claude \
  --system-prompt "$TEST_AGENT" \
  --dangerously-skip-permissions \
  -p "
Read:
- .claude/skills/testing/test-patterns.md
- api-contract.yaml
- tasks/implementation-plan.md (use decisions + service logic for adversarial coverage)

Write adversarial tests for everything in app/backend/ and app/frontend/.
Run all tests.
Document findings in escalation/log/test-findings-${TS}.yaml

Do not fix anything. Find and document only.
"

git add app/backend/tests/ app/frontend/src/ escalation/log/ 2>/dev/null || true
git diff --staged --quiet || git commit -m "test: adversarial suite"
git push origin "$BRANCH"
ok "Tests committed"

# ── Gate 4: Triage test findings ──────────────────────────────────
gate "Triage test findings"
echo "Review escalation/log/ for test findings"
read -p "Approve? (y/n): " APPROVE
[[ "$APPROVE" == "y" ]] || fail "Test findings block merge."
ok "Findings triaged"

# ── Review ────────────────────────────────────────────────────────
step "Review: DoD + Contract + Plan Compliance"
REV_AGENT=$(cat .claude/agents/reviewer.md)
claude \
  --system-prompt "$REV_AGENT" \
  --dangerously-skip-permissions \
  -p "
Read:
- .claude/skills/delivery/definition-of-done.md
- .claude/skills/codebase/api-patterns.md
- .claude/skills/codebase/frontend-patterns.md
- api-contract.yaml
- tasks/implementation-plan.md
- design/ui-spec.md (if present — verify UI matches spec intent)

Review the full implementation against:
1. The approved contract — every endpoint, every schema
2. The approved implementation plan — every file, every decision
3. The definition of done
4. All code patterns
5. The ui-spec — does the frontend match what the PM designed?

Also check: did build agents deviate from the plan?
If so, was it justified by an escalation, or undocumented?

Write your full report to escalation/log/review-${TS}.yaml
Mark any pattern worth keeping as promote: true
"

git add escalation/log/ 2>/dev/null || true
git diff --staged --quiet || git commit -m "review: DoD + plan + ui compliance report"
git push origin "$BRANCH"
ok "Review committed"

# ── Gate 5: Approve merge ─────────────────────────────────────────
gate "Approve for merge"
echo "Review escalation/log/ for the review report"
read -p "Open PR? (y/n): " APPROVE
[[ "$APPROVE" == "y" ]] || fail "Merge rejected."

# ── Open PR ───────────────────────────────────────────────────────
step "Opening PR"
gh pr create \
  --title "feat: ${INTENT:0:70}" \
  --body "$(cat <<EOF
## AI-Delivered Feature

**Intent**: \`${INTENT}\`

### Human Gates Passed
| Gate | Who | What was reviewed |
|------|-----|-------------------|
| Gate 2: Contract | PM + Eng | API surface, endpoint shapes, schemas |
| Gate 3: Impl Plan | Eng | Data model, shared types, file structure, decisions |
| Gate 4: Test findings | Eng | Adversarial test results triaged |
| Gate 5: Merge | Eng | DoD + plan + UI compliance reviewed |

---
*Delivered by vibe-harness. Merge when ready.*
EOF
)" \
  --base main \
  --head "$BRANCH"

ok "Done! PR created."
