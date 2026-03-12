#!/bin/bash
# Full delivery pipeline — one command, end to end.
# Gates pause for human input. Everything else runs automatically.
#
# Usage:
#   ./run.sh "feature intent" https://www.figma.com/make/...   # with Figma prototype
#   ./run.sh "feature intent"                                   # intent-only (no prototype)

set -uo pipefail

INTENT="${1:?Usage: ./run.sh \"feature intent\" [figma-url]}"
PROTOTYPE_URL="${2:-}"
BRANCH="ai/feature-$(date +%Y%m%d-%H%M%S)"
TS=$(date +%Y%m%d-%H%M%S)

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

step()  { echo -e "\n${CYAN}═══════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}═══════════════════════════════════════${NC}\n"; }
gate()  { echo -e "\n${YELLOW}┌─────────────────────────────────────┐${NC}"; echo -e "${YELLOW}│  GATE: $1${NC}"; echo -e "${YELLOW}└─────────────────────────────────────┘${NC}"; }
ok()    { echo -e "${GREEN}✓ $1${NC}"; }
fail()  { echo -e "${RED}✗ $1${NC}"; exit 1; }
phase() { echo -e "\n${BOLD}${CYAN}▶ PHASE $1${NC}\n"; }

echo -e "${BOLD}"
echo "═══════════════════════════════════════════════════════════"
echo "  VIBE HARNESS — Full Delivery Pipeline"
echo "═══════════════════════════════════════════════════════════"
echo -e "${NC}"
echo "  Intent:    $INTENT"
echo "  Prototype: ${PROTOTYPE_URL:-none (intent-only mode)}"
echo "  Branch:    $BRANCH"
echo ""

# ═══════════════════════════════════════════════════════════════
# PHASE 1: VISUAL — Read prototype → ui-spec
# ═══════════════════════════════════════════════════════════════

if [ -n "$PROTOTYPE_URL" ]; then
  phase "1/9: VISUAL — Read prototype"

  SOURCE_PROMPT=""
  if [[ "$PROTOTYPE_URL" == *figma.com* ]]; then
    echo "Input: Figma URL (will use Figma MCP)"
    SOURCE_PROMPT="Figma design URL: ${PROTOTYPE_URL}

Use the Figma MCP tools to read this design directly.
Fetch the frame or page — read layout, components, text content, tokens, variants.
Text content reveals data fields the UI displays.
Component variants reveal different states (empty, loading, error, active).
Auto-layout properties reveal spacing and responsive behaviour.
This is structured data — much richer than screenshots."
  elif [[ "$PROTOTYPE_URL" == http* ]]; then
    echo "Input: URL (will try web fetch)"
    SOURCE_PROMPT="Prototype URL: ${PROTOTYPE_URL}
Try to web fetch this URL. If it returns useful content, use it.
If the page is mostly empty JS scaffolding, say so."
  fi

  # Check for supplementary local files
  SCREENSHOTS=$(find design/prototype/screenshots -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.webp" \) 2>/dev/null | sort || true)
  CODE_FILES=$(find design/prototype/code -type f \( -name "*.tsx" -o -name "*.jsx" -o -name "*.ts" \) 2>/dev/null | sort || true)

  if [ -n "$SCREENSHOTS" ]; then
    COUNT=$(echo "$SCREENSHOTS" | wc -l | tr -d ' ')
    SOURCE_PROMPT="${SOURCE_PROMPT}

Also found ${COUNT} screenshot(s) — read as supplementary visual reference:
$(echo "$SCREENSHOTS" | sed 's/^/  - /')"
  fi

  if [ -n "$CODE_FILES" ]; then
    COUNT=$(echo "$CODE_FILES" | wc -l | tr -d ' ')
    SOURCE_PROMPT="${SOURCE_PROMPT}

Also found ${COUNT} exported code file(s) — read for component hierarchy reference:
$(echo "$CODE_FILES" | sed 's/^/  - /')
DO NOT copy this code. Read it as a design reference only."
  fi

  AGENT=$(cat .claude/agents/visual.md)
  claude \
    --system-prompt "$AGENT" \
    --dangerously-skip-permissions \
    -p "
Read the PM prototype and produce design/ui-spec.md.

${SOURCE_PROMPT}

Follow your output format exactly.
Output your Done Signal when complete.
"

  [ -f "design/ui-spec.md" ] || fail "ui-spec.md was not created"
  ok "ui-spec.md written"

  # ── Gate 1: PM approval ──
  gate "PM: review ui-spec.md"
  echo ""
  echo "  Review design/ui-spec.md for:"
  echo "    - Layout understood correctly?"
  echo "    - Data shapes right?"
  echo "    - Interactions complete?"
  echo "    - Answer any flagged ambiguities"
  echo ""
  read -p "Approve? (y to approve, n to edit manually first): " APPROVE
  if [[ "$APPROVE" == "y" ]]; then
    sed -i '' 's/Status: PENDING_PM_APPROVAL/Status: APPROVED/' design/ui-spec.md
    ok "UI spec approved"
  else
    echo "Edit design/ui-spec.md, then change Status to APPROVED and press Enter to continue."
    read -p "Press Enter when ready... "
    grep -q "APPROVED" design/ui-spec.md || fail "ui-spec.md not marked APPROVED"
    ok "UI spec approved (manually edited)"
  fi
else
  phase "1/9: VISUAL — Skipped (no prototype URL)"
  if [ -f "design/ui-spec.md" ] && grep -q "APPROVED" design/ui-spec.md; then
    ok "Existing approved ui-spec.md found"
  else
    echo "No prototype and no approved ui-spec.md — running in intent-only mode"
  fi
fi

# ═══════════════════════════════════════════════════════════════
# PHASE 2: BOOTSTRAP — Create branch
# ═══════════════════════════════════════════════════════════════

phase "2/9: BOOTSTRAP"
git checkout -b "$BRANCH"
git add design/ui-spec.md 2>/dev/null || true
git diff --staged --quiet || git commit -m "design: ui-spec — APPROVED"
git push origin "$BRANCH"
ok "Branch $BRANCH created"

# ═══════════════════════════════════════════════════════════════
# PHASE 3: PLAN — API Contract
# ═══════════════════════════════════════════════════════════════

phase "3/9: PLAN — API Contract"
ARCHITECT=$(cat .claude/agents/architect.md)
claude \
  --system-prompt "$ARCHITECT" \
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

# ── Gate 2: Approve contract ──
gate "Approve API contract"
echo "Review api-contract.yaml and tasks/current-feature.md"
read -p "Approve? (y/n): " APPROVE
[[ "$APPROVE" == "y" ]] || fail "Contract rejected. Edit and re-run."

sed -i '' 's/Status: PENDING_APPROVAL/Status: APPROVED/g' api-contract.yaml
git add api-contract.yaml
git diff --staged --quiet || git commit -m "plan(contract): mark contract APPROVED"
git push origin "$BRANCH"
ok "Contract approved"

# ═══════════════════════════════════════════════════════════════
# PHASE 4: PLAN — Implementation Plan
# ═══════════════════════════════════════════════════════════════

phase "4/9: PLAN — Implementation Plan"
claude \
  --system-prompt "$ARCHITECT" \
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

# ── Gate 3: Approve implementation plan ──
gate "Approve implementation plan"
echo "Review tasks/implementation-plan.md"
read -p "Approve? (y/n): " APPROVE
[[ "$APPROVE" == "y" ]] || fail "Plan rejected. Edit and re-run."
ok "Plan approved"

# ═══════════════════════════════════════════════════════════════
# PHASE 5: BUILD — Backend
# ═══════════════════════════════════════════════════════════════

phase "5/9: BUILD — Backend"
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

# ═══════════════════════════════════════════════════════════════
# PHASE 6: BUILD — Frontend
# ═══════════════════════════════════════════════════════════════

phase "6/9: BUILD — Frontend"
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

# ═══════════════════════════════════════════════════════════════
# PHASE 7: TEST — Adversarial Suite
# ═══════════════════════════════════════════════════════════════

phase "7/9: TEST — Adversarial Suite"
TEST_AGENT=$(cat .claude/agents/tester.md)
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

# ── Gate 4: Triage test findings ──
gate "Triage test findings"
echo "Review escalation/log/ for test findings"
read -p "Approve? (y/n): " APPROVE
[[ "$APPROVE" == "y" ]] || fail "Test findings block merge."
ok "Findings triaged"

# ═══════════════════════════════════════════════════════════════
# PHASE 8: REVIEW — DoD + Contract + Plan Compliance
# ═══════════════════════════════════════════════════════════════

phase "8/9: REVIEW"
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

# ── Gate 5: Approve merge ──
gate "Approve for merge"
echo "Review escalation/log/ for the review report"
read -p "Open PR? (y/n): " APPROVE
[[ "$APPROVE" == "y" ]] || fail "Merge rejected."

# ── Open PR ──
step "Opening PR"
PR_URL=$(gh pr create \
  --title "feat: ${INTENT:0:70}" \
  --body "$(cat <<EOF
## AI-Delivered Feature

**Intent**: \`${INTENT}\`
**Prototype**: \`${PROTOTYPE_URL:-none}\`

### Human Gates Passed
| Gate | Who | What was reviewed |
|------|-----|-------------------|
| ✅ Gate 1: UI Spec | PM | Visual agent understood the prototype correctly |
| ✅ Gate 2: Contract | PM + Eng | API surface, endpoint shapes, schemas |
| ✅ Gate 3: Impl Plan | Eng | Data model, shared types, file structure, decisions |
| ✅ Gate 4: Test findings | Eng | Adversarial test results triaged |
| ✅ Gate 5: Merge | Eng | DoD + plan + UI compliance reviewed |

### Artefacts
- UI spec: \`design/ui-spec.md\`
- Contract: \`api-contract.yaml\`
- Implementation plan: \`tasks/implementation-plan.md\`
- Test findings: \`escalation/log/test-findings-*.yaml\`
- Review report: \`escalation/log/review-*.yaml\`

---
*Delivered by vibe-harness. Merge when ready.*
EOF
)" \
  --base main \
  --head "$BRANCH" 2>&1)

echo "$PR_URL"
ok "PR created"

# ═══════════════════════════════════════════════════════════════
# PHASE 9: COMPOUND LOOP — Learn + Sync
# ═══════════════════════════════════════════════════════════════

phase "9/9: COMPOUND LOOP"
echo "  The PR is open. Run the compound loop now or after merge?"
echo ""
echo "  1) Run now (promote patterns + sync to Figma)"
echo "  2) Skip — I'll run ./run-compound.sh all after merge"
echo ""
read -p "Choice (1/2): " CHOICE

if [[ "$CHOICE" == "1" ]]; then
  step "Compound: Promote patterns"

  REVIEW_REPORT=$(ls -t escalation/log/review-*.yaml escalation/log/review-*.md 2>/dev/null | head -1 || echo "")

  if [ -n "$REVIEW_REPORT" ]; then
    claude \
      --dangerously-skip-permissions \
      -p "
You are updating the harness knowledge base after a successful feature delivery.

Read the reviewer report at: ${REVIEW_REPORT}
Find every item where promote: true

For each item marked promote: true:
1. Determine which skill file it belongs to (api-patterns, frontend-patterns,
   data-patterns, test-patterns, or architecture)
2. Append the pattern to the correct file under .claude/skills/
3. Format it as:
   ---
   ## Pattern: [name]
   <!-- Promoted: $(date +%Y-%m-%d) -->
   <!-- Source: ${REVIEW_REPORT} -->

   [pattern content]

Only add patterns that are genuinely reusable across future features.
Do not add one-off implementation details.
If there are no promote: true items, output: NO_PATTERNS_TO_PROMOTE and stop.
"

    git add .claude/skills/ 2>/dev/null || true
    if git diff --staged --quiet; then
      echo "No patterns promoted"
    else
      PATTERN_COUNT=$(git diff --staged --name-only | wc -l | tr -d ' ')
      git commit -m "learn: promote ${PATTERN_COUNT} pattern(s) from review"
      git push origin "$BRANCH"
      ok "$PATTERN_COUNT pattern(s) promoted"
    fi
  else
    echo "No review report found — skipping"
  fi

  # Sync to Figma
  SYNC_ENABLED=$(grep -A1 'figma_sync:' config/harness.config.yaml 2>/dev/null | grep 'enabled:' | awk '{print $2}' || echo "false")
  FIGMA_KEY=$(grep 'figma_file_key:' config/harness.config.yaml 2>/dev/null | awk '{print $2}' | tr -d '"' || echo "")

  if [ "$SYNC_ENABLED" = "true" ] && [ -n "$FIGMA_KEY" ]; then
    step "Compound: Sync to Figma"
    claude \
      --dangerously-skip-permissions \
      -p "
You are syncing the built application back to Figma as part of the compound loop.

Figma file key: ${FIGMA_KEY}

Read design/ui-spec.md to find the pages/routes to capture.
Read config/harness.config.yaml for the stack to determine the dev server command.

Your job:
1. Start the dev server in the background
2. Wait for it to be ready
3. For each page/route in the ui-spec:
   - Call generate_figma_design (Figma MCP) to capture the running page
   - Use outputMode: existingFile with fileKey: ${FIGMA_KEY}
   - Follow the capture instructions returned by the tool
   - Poll with captureId until completed
4. After all pages captured, use send_code_connect_mappings (Figma MCP) to link
   key components to their source files
5. Stop the dev server
6. Report what was captured and what was mapped
"
    ok "Figma sync complete"
  else
    echo "Figma sync disabled or no file key set — skipping"
  fi
else
  echo "Skipped. Run after merge: ./run-compound.sh all"
fi

# ═══════════════════════════════════════════════════════════════
# DONE
# ═══════════════════════════════════════════════════════════════

echo ""
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}  DELIVERY COMPLETE${NC}"
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "  PR: $PR_URL"
echo "  Branch: $BRANCH"
echo ""
echo "  All 5 gates passed. Merge when ready."
if [[ "${CHOICE:-2}" == "2" ]]; then
  echo "  After merge: ./run-compound.sh all"
fi
echo ""
