#!/bin/bash
# pre-tool-boundary.sh
# Fires on every Write, Edit, MultiEdit before execution.
# Exit 2 = BLOCKED (Claude sees the stderr as an error message and cannot proceed).
# Exit 0 = allowed.
#
# This is the deterministic layer. Claude cannot override this with a prompt.

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""')

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# ── PROTECTED FILES ───────────────────────────────────────────────
# Agents must NEVER directly modify these — escalate instead.
# Add your project's critical files here.
PROTECTED_PATTERNS=(
  ".env"                            # Root .env file
  ".env.local"                      # Local env overrides
  ".env.production"                 # Production env
  ".env.production.*"               # Production env variants
  "prisma/schema.prisma"            # Schema changes need human review
  "src/auth/**"                     # Auth logic — human sign-off required
  "src/payments/**"                 # Payment logic — human sign-off required
  ".claude/settings.json"           # Agents cannot modify their own hooks
  "harness-rules/**"                # Agents cannot modify architectural rules
)
# NOTE: migrations/** removed — backend agent creates migrations as part of normal work.
# NOTE: *.env.* replaced with specific .env files — the glob was too broad,
# matching alembic/env.py, .env.example, and other legitimate files.

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  # Use bash glob matching
  if [[ "$FILE_PATH" == $pattern ]] || \
     echo "$FILE_PATH" | grep -qE "$(echo "$pattern" | sed 's/\*\*/.*/' | sed 's/\*/[^\/]*/')"; then
    echo "BOUNDARY VIOLATION: $FILE_PATH is a protected file." >&2
    echo "Raise an escalation of type 'risk' with blast_radius 'high' instead of modifying this directly." >&2
    echo "The human must approve any changes to: $FILE_PATH" >&2
    exit 2
  fi
done

# ── CONTRACT STATUS CHECK ─────────────────────────────────────────
# Block writes to implementation files if no APPROVED contract exists for the feature.
# Check api-contract.yaml for APPROVED status before allowing new endpoint/model files.
if [[ "$FILE_PATH" =~ src/(api|routes|controllers|services|models)/ ]]; then
  if [[ -f "api-contract.yaml" ]]; then
    APPROVED=$(grep -c "Status: APPROVED" api-contract.yaml 2>/dev/null || echo "0")
    PENDING=$(grep -c "Status: PENDING_APPROVAL" api-contract.yaml 2>/dev/null || echo "0")
    if [[ "$PENDING" -gt 0 && "$APPROVED" -eq 0 ]]; then
      echo "CONTRACT GATE: api-contract.yaml has PENDING_APPROVAL entries but no APPROVED entries." >&2
      echo "The human must approve the contract before implementation begins." >&2
      echo "File blocked: $FILE_PATH" >&2
      exit 2
    fi
  fi
fi

# ── MODULE BOUNDARY CHECK ─────────────────────────────────────────
# Prevent agents from creating circular imports or cross-layer violations.
# Reads harness-rules/module-boundaries.json if it exists.
if [[ -f "harness-rules/module-boundaries.json" && "$FILE_PATH" =~ \.(ts|js)$ ]]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // ""')
  if [[ -n "$CONTENT" ]]; then
    # Check for banned cross-layer imports (e.g. UI importing directly from DB layer)
    VIOLATIONS=$(cat harness-rules/module-boundaries.json | \
      jq -r '.forbidden_imports[] | "from ['\''\"]\(.from)['\''\""].*import.*\(.to)"' 2>/dev/null || true)
    while IFS= read -r pattern; do
      if echo "$CONTENT" | grep -qE "$pattern"; then
        echo "MODULE BOUNDARY VIOLATION: $FILE_PATH contains a forbidden import pattern." >&2
        echo "Pattern: $pattern" >&2
        echo "See harness-rules/module-boundaries.json for allowed dependency directions." >&2
        exit 2
      fi
    done <<< "$VIOLATIONS"
  fi
fi

exit 0
