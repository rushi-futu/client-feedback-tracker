#!/bin/bash
# Local compound learning + GC pipeline
# Mirrors ai-compound.yml and ai-gc.yml but runs directly on your machine.
#
# Usage:
#   ./run-compound.sh promote    # Extract patterns from latest review report
#   ./run-compound.sh sync       # Capture built UI → push back to Figma prototype
#   ./run-compound.sh gc         # Run harness health scan
#   ./run-compound.sh all        # All three in sequence

set -uo pipefail

MODE="${1:?Usage: ./run-compound.sh [promote|sync|gc|all]}"

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

# ── Promote Patterns ─────────────────────────────────────────────
run_promote() {
  step "Compound: Extract & promote patterns"

  REVIEW_REPORT=$(ls -t escalation/log/review-*.yaml escalation/log/review-*.md 2>/dev/null | head -1 || echo "")

  if [ -z "$REVIEW_REPORT" ]; then
    echo "No review report found in escalation/log/ — skipping pattern extraction"
    return 0
  fi

  echo "Processing review report: $REVIEW_REPORT"

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
    echo "No patterns promoted — skills unchanged"
  else
    PATTERN_COUNT=$(git diff --staged --name-only | wc -l | tr -d ' ')
    gate "Review promoted patterns"
    git diff --staged --stat
    echo ""
    read -p "Commit $PATTERN_COUNT promoted pattern(s)? (y/n): " APPROVE
    if [[ "$APPROVE" == "y" ]]; then
      git commit -m "learn: promote ${PATTERN_COUNT} pattern(s) from review"
      git push origin "$(git branch --show-current)"
      ok "Patterns promoted and pushed"
    else
      git reset HEAD .claude/skills/ >/dev/null 2>&1
      echo "Patterns discarded"
    fi
  fi
}

# ── Sync to Figma ────────────────────────────────────────────────
run_sync() {
  step "Compound: Sync built UI → Figma prototype"

  # Read figma_file_key from config
  FIGMA_KEY=$(grep 'figma_file_key:' config/harness.config.yaml 2>/dev/null | awk '{print $2}' | tr -d '"' || echo "")
  SYNC_ENABLED=$(grep -A1 'figma_sync:' config/harness.config.yaml 2>/dev/null | grep 'enabled:' | awk '{print $2}' || echo "false")

  if [ "$SYNC_ENABLED" != "true" ]; then
    echo "Figma sync is disabled in config/harness.config.yaml → compound_loop.figma_sync.enabled"
    echo "Set to true to enable."
    return 0
  fi

  if [ -z "$FIGMA_KEY" ]; then
    echo "No figma_file_key set in config/harness.config.yaml"
    echo ""
    read -p "Paste the Figma file URL (or press Enter to skip): " FIGMA_URL
    if [ -z "$FIGMA_URL" ]; then
      echo "Skipping Figma sync"
      return 0
    fi
    # Extract file key from URL: figma.com/design/:fileKey/... or figma.com/make/:fileKey/...
    FIGMA_KEY=$(echo "$FIGMA_URL" | sed -E 's|.*figma\.com/(design|make)/([^/]+).*|\2|')
    if [ -z "$FIGMA_KEY" ]; then
      echo "Could not extract file key from URL"
      return 1
    fi
    echo "Extracted file key: $FIGMA_KEY"
  fi

  # Check ui-spec exists for page list
  if [ ! -f "design/ui-spec.md" ]; then
    echo "No design/ui-spec.md found — cannot determine which pages to capture"
    return 1
  fi

  claude \
    --dangerously-skip-permissions \
    -p "
You are syncing the built application back to Figma as part of the compound loop.

Figma file key: ${FIGMA_KEY}

Read design/ui-spec.md to find the pages/routes to capture.
Read config/harness.config.yaml for the stack (framework, runtime) to determine the dev server command.

Your job:
1. Start the dev server in the background
2. Wait for it to be ready
3. For each page/route in the ui-spec:
   - Call generate_figma_design (Figma MCP) to capture the running page
   - Use outputMode: existingFile with fileKey: ${FIGMA_KEY}
   - Follow the capture instructions returned by the tool
   - Poll with captureId until completed
4. After all pages are captured, use send_code_connect_mappings (Figma MCP) to link
   key components to their source files (read app/frontend/src/ for component paths)
5. Stop the dev server

If the dev server fails to start, tell the user to start it manually and provide the URL.
If Figma MCP is not authenticated, tell the user to run /mcp in Claude Code.
Report what was captured and what was mapped.
"

  ok "Figma sync complete"

  gate "Review Figma sync"
  echo "  Check the Figma file to verify the captured UI looks correct."
  echo "  Figma file key: $FIGMA_KEY"
  echo ""
  read -p "Looks good? (y/n): " APPROVE
  if [[ "$APPROVE" == "y" ]]; then
    ok "Figma prototype updated — PM can iterate with Figma Make"
  else
    echo "Note: you can re-run ./run-compound.sh sync to try again"
  fi
}

# ── GC Scan ──────────────────────────────────────────────────────
run_gc() {
  step "GC: Harness health scan"

  TS=$(date +%Y%m%d-%H%M%S)
  REPORT="escalation/log/gc-report-${TS}.yaml"

  claude \
    --dangerously-skip-permissions \
    -p "
You are the harness maintenance agent. Scan the repository and produce
a health report at ${REPORT}.

Check each of the following:

1. CONTRACT DRIFT
   Read api-contract.yaml.
   Scan app/backend/ and app/frontend/ for routes and components.
   Flag any endpoint in the contract with no implementation, or
   any implemented endpoint not in the contract.

2. STALE KNOWLEDGE
   Read all files under .claude/skills/.
   Check each pattern against the actual codebase.
   Flag patterns that reference files, imports, or conventions
   that no longer exist.

3. ORPHANED TASKS
   Read tasks/current-feature.md if it exists.
   Flag any tasks marked in-progress with no recent git activity.

4. UNRESOLVED ESCALATIONS
   Read all files in escalation/log/.
   Flag any escalation with no resolution block that is older than 7 days.

5. PROMOTION GAPS
   Scan git log for patterns in recent commits that look reusable
   but have not been promoted to .claude/skills/.

Write the report in this format:
---
gc_run: ${TS}
status: clean | warnings | action_required
findings:
  contract_drift: []
  stale_knowledge: []
  orphaned_tasks: []
  unresolved_escalations: []
  promotion_gaps: []
summary: one sentence
recommended_actions: []

Be specific. Reference file paths and line numbers where relevant.
If everything is healthy, status: clean and empty findings arrays.
"

  if [ ! -f "$REPORT" ]; then
    echo "GC report not generated"
    return 1
  fi

  STATUS=$(grep "^status:" "$REPORT" 2>/dev/null | awk '{print $2}' || echo "unknown")
  SUMMARY=$(grep "^summary:" "$REPORT" 2>/dev/null | cut -d: -f2- | xargs || echo "See report")

  echo ""
  echo "Status:  $STATUS"
  echo "Summary: $SUMMARY"
  echo "Report:  $REPORT"
  echo ""

  if [ "$STATUS" = "action_required" ]; then
    echo -e "${RED}⚠️  Action required — resolve before next feature delivery${NC}"
  elif [ "$STATUS" = "warnings" ]; then
    echo -e "${YELLOW}⚠️  Warnings found — not blocking${NC}"
  else
    ok "Harness healthy"
  fi

  gate "Commit GC report"
  read -p "Commit this report? (y/n): " APPROVE
  if [[ "$APPROVE" == "y" ]]; then
    git add escalation/log/ 2>/dev/null || true
    git diff --staged --quiet || git commit -m "chore: GC scan — ${STATUS}"
    git push origin "$(git branch --show-current)"
    ok "GC report committed"
  else
    echo "Report kept locally but not committed"
  fi
}

# ── Main ─────────────────────────────────────────────────────────
case "$MODE" in
  promote)
    run_promote
    ;;
  sync)
    run_sync
    ;;
  gc)
    run_gc
    ;;
  all)
    run_promote
    run_sync
    run_gc
    ;;
  *)
    fail "Unknown mode: $MODE. Use: promote | sync | gc | all"
    ;;
esac

ok "Done!"
