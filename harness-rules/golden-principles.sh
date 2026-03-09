#!/bin/bash
# golden-principles.sh
# Called by maintenance-gc.sh during every maintenance run.
# These are non-negotiable rules for the entire codebase.
# Any violation is immediately flagged for remediation.
#
# Add your project's golden principles here.
# Each check should echo a violation message and exit non-zero if violated,
# or exit 0 silently if clean.

VIOLATIONS=()

# ── PRINCIPLE 1: No hand-rolled utilities when shared packages exist ──────────
# If a file defines a function that already exists in a utility package, flag it.
# Example: don't rewrite `formatDate` if date-fns is installed.
DUPE_UTILS=$(grep -rn "function formatDate\|function parseDate\|function capitalise\|function slugify" \
  src/ --include="*.ts" --include="*.js" 2>/dev/null | \
  grep -v "node_modules\|\.test\." || true)
if [[ -n "$DUPE_UTILS" ]]; then
  VIOLATIONS+=("Hand-rolled utility detected (prefer shared packages):\n$DUPE_UTILS")
fi

# ── PRINCIPLE 2: No untyped data shapes ──────────────────────────────────────
# Agents must not use `any` or untyped object shapes at module boundaries.
ANY_AT_BOUNDARY=$(grep -rn ": any\|as any" \
  src/api/ src/repository/ src/service/ 2>/dev/null \
  --include="*.ts" | grep -v "\.test\." || true)
if [[ -n "$ANY_AT_BOUNDARY" ]]; then
  VIOLATIONS+=("'any' type used at module boundary (use typed schemas):\n$ANY_AT_BOUNDARY")
fi

# ── PRINCIPLE 3: No TODO/FIXME left in implementation files ─────────────────
# TODOs are allowed in task files and docs, not in src/
TODOS_IN_SRC=$(grep -rn "TODO\|FIXME\|HACK\|XXX" src/ \
  --include="*.ts" --include="*.js" 2>/dev/null | \
  grep -v "\.test\." || true)
if [[ -n "$TODOS_IN_SRC" ]]; then
  VIOLATIONS+=("TODO/FIXME found in src/ (resolve or convert to escalation):\n$TODOS_IN_SRC")
fi

# ── PRINCIPLE 4: Test files must co-locate with implementation ────────────────
# Every src/ file should have a corresponding .test. file
while IFS= read -r src_file; do
  base="${src_file%.ts}"
  base="${base%.tsx}"
  if [[ ! -f "${base}.test.ts" && ! -f "${base}.test.tsx" && ! -f "${base}.spec.ts" ]]; then
    VIOLATIONS+=("Missing test file for: $src_file")
  fi
done < <(find src/ -name "*.ts" -not -name "*.test.*" -not -name "*.spec.*" \
  -not -name "*.d.ts" -not -path "*/types/*" 2>/dev/null || true)

# ── PRINT RESULTS ──────────────────────────────────────────────────
if [[ ${#VIOLATIONS[@]} -gt 0 ]]; then
  for v in "${VIOLATIONS[@]}"; do
    echo -e "$v"
  done
  exit 1
fi

exit 0
