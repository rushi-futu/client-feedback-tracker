#!/usr/bin/env bash
# post-task.sh — runs after every Claude Code task
# Quality gates: typecheck, lint, tests.
# Pattern detection: flags patterns worth promoting.

set -euo pipefail

echo "🪝 Post-task"
EXIT_CODE=0

# ── TypeScript ────────────────────────────────────────────────────────
if [ -f "tsconfig.json" ] && command -v npx &>/dev/null; then
  echo "  📘 TypeScript..."
  if npx --yes tsc --noEmit 2>&1 | grep -q "error TS"; then
    echo "  ❌ TypeScript errors — fix before /test or /review"
    npx tsc --noEmit 2>&1 | grep "error TS" | head -10
    EXIT_CODE=1
  else
    echo "  ✅ TypeScript clean"
  fi
fi

# ── Lint ──────────────────────────────────────────────────────────────
ESLINT_CONFIG=$(find . -maxdepth 2 -name ".eslintrc*" -o -name "eslint.config.*" 2>/dev/null | head -1)
if [ -n "$ESLINT_CONFIG" ] && command -v npx &>/dev/null; then
  echo "  🧹 ESLint..."
  if ! npx eslint src --max-warnings 0 --quiet 2>&1; then
    echo "  ❌ Lint errors"
    EXIT_CODE=1
  else
    echo "  ✅ Lint clean"
  fi
fi

# ── Tests (changed files only) ────────────────────────────────────────
CHANGED=$(git diff --name-only HEAD 2>/dev/null || echo "")
CHANGED_TESTS=$(echo "$CHANGED" | grep -E "\.(test|spec)\." || true)

if [ -n "$CHANGED_TESTS" ]; then
  echo "  🧪 Running changed tests..."
  if command -v npx &>/dev/null; then
    if ! npx vitest run --reporter=verbose 2>&1 | tail -20; then
      echo "  ❌ Tests failing"
      EXIT_CODE=1
    else
      echo "  ✅ Tests passing"
    fi
  fi
fi

# ── Escalation check ─────────────────────────────────────────────────
OPEN_ESCALATIONS=$(grep -rl "status: open" escalation/log/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$OPEN_ESCALATIONS" -gt 0 ]; then
  echo ""
  echo "  ⚠️  $OPEN_ESCALATIONS open escalation(s) — resolve before /review"
fi

# ── Pattern detection ─────────────────────────────────────────────────
if [ $EXIT_CODE -eq 0 ] && [ -n "$CHANGED" ]; then
  # Check if this task introduced patterns not in the knowledge layer
  NEW_PATTERNS=$(echo "$CHANGED" | grep -v "test\|spec\|\.md" | wc -l | tr -d ' ')
  if [ "$NEW_PATTERNS" -gt 3 ]; then
    echo ""
    echo "  💡 Substantial changes detected ($NEW_PATTERNS files)."
    echo "     If a reusable pattern was introduced, run:"
    echo "     ./scripts/promote-pattern.sh"
  fi
fi

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Post-task: all gates passed"
else
  echo "❌ Post-task: quality gates failed — do not proceed"
fi

exit $EXIT_CODE
