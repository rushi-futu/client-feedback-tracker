#!/usr/bin/env bash
# pre-task.sh — runs before every Claude Code task
# Reads config, detects risk, injects warnings, runs the router.

set -euo pipefail

PROMPT="${CLAUDE_PROMPT:-}"
CONFIG="config/harness.config.yaml"

echo "🪝 Pre-task"

# ── Read risk flags from config ──────────────────────────────────────
HIGH_RISK_PATTERNS=("shared schema" "auth" "login" "password" "payment" "billing" "delete" "drop table" "public api" "truncate")

RISK_LEVEL="low"
FLAGGED=()

for pattern in "${HIGH_RISK_PATTERNS[@]}"; do
  if echo "$PROMPT" | grep -qi "$pattern"; then
    FLAGGED+=("$pattern")
    RISK_LEVEL="high"
  fi
done

# ── Output risk assessment ────────────────────────────────────────────
if [ ${#FLAGGED[@]} -gt 0 ]; then
  echo ""
  echo "⚠️  HIGH RISK SIGNAL DETECTED"
  echo "   Matched patterns: ${FLAGGED[*]}"
  echo ""
  echo "   Before proceeding:"
  echo "   1. Read .claude/skills/codebase/K2-system-context.md"
  echo "   2. Check mcp/knowledge/topology/safety-rules.md"
  echo "   3. If blast radius is high → write escalation BEFORE making changes"
  echo ""
fi

# ── Check for open escalations ───────────────────────────────────────
ESCALATION_DIR="escalation/log"
if [ -d "$ESCALATION_DIR" ]; then
  OPEN=$(grep -rl "status: open" "$ESCALATION_DIR" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$OPEN" -gt 0 ]; then
    echo "⚠️  $OPEN OPEN ESCALATION(S) — resolve before starting new tasks"
    grep -rl "status: open" "$ESCALATION_DIR" 2>/dev/null | while read -r f; do
      echo "   → $f"
    done
    echo ""
  fi
fi

# ── Check agent teams config ─────────────────────────────────────────
if [ "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-0}" != "1" ]; then
  if grep -q "use_agent_teams: true" "$CONFIG" 2>/dev/null; then
    echo "ℹ️  Agent Teams configured but not enabled."
    echo "   To enable: export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1"
    echo "   Or run: source scripts/enable-agent-teams.sh"
    echo ""
  fi
fi

echo "✅ Pre-task complete (risk: $RISK_LEVEL)"
