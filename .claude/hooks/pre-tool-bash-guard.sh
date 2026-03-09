#!/bin/bash
# pre-tool-bash-guard.sh
# Fires before every Bash tool call.
# Blocks destructive commands that agents should never run autonomously.

set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# ── HARD BLOCKS ───────────────────────────────────────────────────
# These patterns are never allowed from agents. No exceptions.
BLOCKED_PATTERNS=(
  "rm -rf /"
  "rm -rf ~"
  "rm -rf \$HOME"
  "chmod -R 777"
  "chown -R"
  "DROP TABLE"
  "DROP DATABASE"
  "TRUNCATE"
  "git push --force"
  "git push -f"
  "git reset --hard HEAD"    # Can lose untracked work
  "npx --yes"                # Arbitrary remote package execution
  "curl.*|.*sh"              # Pipe-to-shell pattern
  "wget.*|.*sh"
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qiE "$pattern"; then
    echo "BLOCKED: Destructive command pattern detected." >&2
    echo "Command: $COMMAND" >&2
    echo "Pattern matched: $pattern" >&2
    echo "Raise an escalation if this operation is genuinely required." >&2
    exit 2
  fi
done

# ── PRODUCTION TARGET CHECK ───────────────────────────────────────
# Block any command targeting a production environment variable or URL.
if echo "$COMMAND" | grep -qiE "(production|prod\.|prod-|\.prod)"; then
  # Allow read-only checks
  if ! echo "$COMMAND" | grep -qiE "^(echo|cat|grep|ls|curl -X GET|curl --get)"; then
    echo "BLOCKED: Command appears to target production environment." >&2
    echo "Command: $COMMAND" >&2
    echo "Agents cannot execute write operations against production." >&2
    exit 2
  fi
fi

exit 0
