#!/bin/bash
# maintenance-gc.sh
# Triggered by: claude --maintenance
# This is the "garbage collection" pillar of harness engineering.
# Runs periodically (add to cron or run manually) to fight entropy and drift.
#
# What it does:
# 1. Checks contract vs implementation drift
# 2. Finds documentation that no longer matches code
# 3. Detects orphaned tasks (tasks without corresponding implementations)
# 4. Flags knowledge files that may be stale
# 5. Writes a GC report to escalation/log/ for agent/human review

set -uo pipefail

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
LOG_DIR="escalation/log"
REPORT="$LOG_DIR/${TIMESTAMP}-gc-report.md"
mkdir -p "$LOG_DIR"

ISSUES=()

echo "Running harness GC scan..."

# ── 1. CONTRACT DRIFT ──────────────────────────────────────────────
# Find endpoints in api-contract.yaml that have no corresponding implementation file
if [[ -f "api-contract.yaml" ]]; then
  ENDPOINTS=$(grep -E "^\s+path:" api-contract.yaml | awk '{print $2}' | tr -d '"' || true)
  while IFS= read -r endpoint; do
    if [[ -z "$endpoint" ]]; then continue; fi
    # Rough check: does any src file reference this path?
    ROUTE_SEGMENT=$(echo "$endpoint" | sed 's|/||; s|/.*||')
    if [[ -n "$ROUTE_SEGMENT" ]]; then
      FOUND=$(grep -rl "$ROUTE_SEGMENT" src/ 2>/dev/null | wc -l || echo "0")
      if [[ "$FOUND" -eq 0 ]]; then
        ISSUES+=("CONTRACT DRIFT: Endpoint '$endpoint' in api-contract.yaml has no matching implementation in src/")
      fi
    fi
  done <<< "$ENDPOINTS"
fi

# ── 2. ORPHANED TASKS ─────────────────────────────────────────────
# Find task files with no corresponding feature branch or recent commit
if [[ -d "tasks" ]]; then
  while IFS= read -r task_file; do
    FEATURE=$(basename "$task_file" .md)
    if [[ "$FEATURE" == "README" ]]; then continue; fi
    # Check if there's a git branch for this feature
    BRANCH=$(git branch -a 2>/dev/null | grep "$FEATURE" | head -1 || true)
    if [[ -z "$BRANCH" ]]; then
      # Check if the task has a completion signal
      DONE=$(grep -c "DONE\|COMPLETE\|SHIPPED" "$task_file" 2>/dev/null || echo "0")
      if [[ "$DONE" -eq 0 ]]; then
        ISSUES+=("ORPHANED TASK: tasks/$FEATURE.md has no branch and no completion signal")
      fi
    fi
  done < <(find tasks -name "*.md" 2>/dev/null)
fi

# ── 3. KNOWLEDGE STALENESS ────────────────────────────────────────
# Flag K1-K4 files that haven't been updated in the configured refresh window
REFRESH_DAYS=7
if [[ -f "config/harness.config.yaml" ]]; then
  CONFIGURED=$(grep "k2_refresh_days:" config/harness.config.yaml | awk '{print $2}' || echo "")
  if [[ -n "$CONFIGURED" ]]; then
    REFRESH_DAYS=$CONFIGURED
  fi
fi

KNOWLEDGE_FILES=(
  ".claude/skills/codebase/architecture.md"
  ".claude/skills/codebase/K2-system-context.md"
  ".claude/skills/delivery/K4-org-context.md"
)

for kfile in "${KNOWLEDGE_FILES[@]}"; do
  if [[ -f "$kfile" ]]; then
    # Days since last modification
    if [[ "$(uname)" == "Darwin" ]]; then
      LAST_MOD=$(stat -f %m "$kfile")
    else
      LAST_MOD=$(stat -c %Y "$kfile")
    fi
    NOW=$(date +%s)
    DAYS_OLD=$(( (NOW - LAST_MOD) / 86400 ))
    if [[ $DAYS_OLD -gt $REFRESH_DAYS ]]; then
      ISSUES+=("STALE KNOWLEDGE: $kfile is ${DAYS_OLD} days old (threshold: ${REFRESH_DAYS} days)")
    fi
  fi
done

# ── 4. UNRESOLVED ESCALATIONS ────────────────────────────────────
# Find escalation files that have been open > 48 hours
if [[ -d "$LOG_DIR" ]]; then
  while IFS= read -r esc_file; do
    if [[ "$esc_file" == *"gc-report"* || "$esc_file" == *"EXAMPLE"* ]]; then continue; fi
    HAS_RESOLUTION=$(grep -c "^resolution:" "$esc_file" 2>/dev/null || echo "0")
    if [[ "$HAS_RESOLUTION" -eq 0 ]]; then
      if [[ "$(uname)" == "Darwin" ]]; then
        CREATED=$(stat -f %m "$esc_file")
      else
        CREATED=$(stat -c %Y "$esc_file")
      fi
      NOW=$(date +%s)
      HOURS_OPEN=$(( (NOW - CREATED) / 3600 ))
      if [[ $HOURS_OPEN -gt 48 ]]; then
        ISSUES+=("STALE ESCALATION: $esc_file has been unresolved for ${HOURS_OPEN} hours")
      fi
    fi
  done < <(find "$LOG_DIR" -name "*.yaml" -o -name "*.md" 2>/dev/null)
fi

# ── 5. GOLDEN PRINCIPLES VIOLATIONS ─────────────────────────────
# Check for patterns the harness has banned (defined in harness-rules/golden-principles.sh)
if [[ -f "harness-rules/golden-principles.sh" ]]; then
  PRINCIPLE_VIOLATIONS=$(bash harness-rules/golden-principles.sh 2>&1 || true)
  if [[ -n "$PRINCIPLE_VIOLATIONS" ]]; then
    ISSUES+=("GOLDEN PRINCIPLES VIOLATED:\n$PRINCIPLE_VIOLATIONS")
  fi
fi

# ── WRITE REPORT ──────────────────────────────────────────────────
{
  echo "# Harness GC Report"
  echo "**Run**: $TIMESTAMP"
  echo "**Issues found**: ${#ISSUES[@]}"
  echo ""

  if [[ ${#ISSUES[@]} -eq 0 ]]; then
    echo "✓ No drift detected. Harness is clean."
  else
    echo "## Issues Requiring Attention"
    echo ""
    echo "These are not suggestions. Address or explicitly accept each one."
    echo ""
    for issue in "${ISSUES[@]}"; do
      echo -e "- $issue"
    done
    echo ""
    echo "## Remediation"
    echo ""
    echo "For each issue:"
    echo "- CONTRACT DRIFT → run /plan to update contract, or mark endpoint deprecated"
    echo "- ORPHANED TASK → complete, delete, or mark explicitly deferred"
    echo "- STALE KNOWLEDGE → run ./scripts/generate-knowledge.sh or manually update"
    echo "- STALE ESCALATION → resolve or explicitly close with reasoning"
    echo "- GOLDEN PRINCIPLES → fix immediately, these are non-negotiable"
  fi
} > "$REPORT"

echo "GC scan complete. ${#ISSUES[@]} issues found."
echo "Report: $REPORT"

# Pass report content back as context for the maintenance session
cat "$REPORT"
