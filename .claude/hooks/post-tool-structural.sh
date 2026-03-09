#!/bin/bash
# post-tool-structural.sh
# Fires after every Write, Edit, MultiEdit.
# Runs structural checks on the changed file.
# Runs async (non-blocking) — violations are written to escalation log
# and fed back to Claude as context, not hard blocks.
#
# This is the structural test layer — equivalent to ArchUnit in Java.

set -uo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""')

if [[ -z "$FILE_PATH" || ! -f "$FILE_PATH" ]]; then
  exit 0
fi

VIOLATIONS=()
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
LOG_DIR="escalation/log"

# ── TYPESCRIPT TYPE CHECK ─────────────────────────────────────────
if [[ "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
  if command -v tsc &>/dev/null && [[ -f "tsconfig.json" ]]; then
    TSC_OUT=$(tsc --noEmit --skipLibCheck 2>&1 | head -20 || true)
    if [[ -n "$TSC_OUT" ]]; then
      VIOLATIONS+=("TypeScript errors:\n$TSC_OUT")
    fi
  fi
fi

# ── IMPORT BOUNDARIES (configure before enabling) ─────────────────
# Uncomment and configure harness-rules/structural-rules.sh for your project
# before wiring this up. See harness-rules/module-boundaries.json for the
# boundary definitions to encode.
#
# if [[ -f "harness-rules/structural-rules.sh" ]]; then
#   STRUCT_OUT=$(bash harness-rules/structural-rules.sh "$FILE_PATH" 2>&1 || true)
#   if [[ -n "$STRUCT_OUT" ]]; then
#     VIOLATIONS+=("Structural rule violations:\n$STRUCT_OUT")
#   fi
# fi

# ── WRITE VIOLATION REPORT ────────────────────────────────────────
if [[ ${#VIOLATIONS[@]} -gt 0 ]]; then
  mkdir -p "$LOG_DIR"
  REPORT="$LOG_DIR/${TIMESTAMP}-structural.md"

  {
    echo "# Structural Violation Report"
    echo "**File**: $FILE_PATH"
    echo "**Time**: $TIMESTAMP"
    echo "**Type**: post-write structural check"
    echo ""
    echo "## Violations Found"
    echo ""
    for v in "${VIOLATIONS[@]}"; do
      echo -e "### Violation\n$v\n"
    done
    echo "## Required Action"
    echo ""
    echo "Fix these violations before marking the task complete."
    echo "These are not warnings — they are structural failures."
  } > "$REPORT"

  # Feed back to Claude as additional context (stdout on exit 0)
  echo '{"decision": "continue", "additionalContext": "Structural violations detected in '"$FILE_PATH"'. See '"$REPORT"' for details. Fix before marking task complete."}'
fi

exit 0
