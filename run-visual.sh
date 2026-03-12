#!/bin/bash
# Read a PM prototype and produce design/ui-spec.md
# Supports: Figma URL (via MCP), screenshots, exported code, v0 URL
#
# Usage:
#   ./run-visual.sh https://www.figma.com/design/...   # Figma link (best)
#   ./run-visual.sh                                     # reads design/prototype/ (screenshots + code)
#   ./run-visual.sh https://v0.dev/chat/...             # v0 URL (unreliable)

set -uo pipefail

INPUT="${1:-}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

step()  { echo -e "\n${CYAN}═══════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}═══════════════════════════════════════${NC}\n"; }
gate()  { echo -e "\n${YELLOW}┌─────────────────────────────────────┐${NC}"; echo -e "${YELLOW}│  GATE: $1${NC}"; echo -e "${YELLOW}└─────────────────────────────────────┘${NC}"; }
ok()    { echo -e "${GREEN}✓ $1${NC}"; }
fail()  { echo -e "${RED}✗ $1${NC}"; exit 1; }

# ── Determine input source ───────────────────────────────────────
SOURCE_PROMPT=""

if [ -n "$INPUT" ] && [[ "$INPUT" == *figma.com* ]]; then
  echo "Input: Figma URL (will use Figma MCP)"
  SOURCE_PROMPT="Figma design URL: ${INPUT}

Use the Figma MCP tools to read this design directly.
Fetch the frame or page — read layout, components, text content, tokens, variants.
Text content reveals data fields the UI displays.
Component variants reveal different states (empty, loading, error, active).
Auto-layout properties reveal spacing and responsive behaviour.
This is structured data — much richer than screenshots."

elif [ -n "$INPUT" ] && [[ "$INPUT" == http* ]]; then
  echo "Input: URL (will try web fetch)"
  SOURCE_PROMPT="Prototype URL: ${INPUT}
Try to web fetch this URL. If it returns useful content, use it.
If the page is mostly empty JS scaffolding, say so."
fi

# Check for local fallback files
SCREENSHOTS=$(find design/prototype/screenshots -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.webp" \) 2>/dev/null | sort)
CODE_FILES=$(find design/prototype/code -type f \( -name "*.tsx" -o -name "*.jsx" -o -name "*.ts" \) 2>/dev/null | sort)

if [ -z "$SOURCE_PROMPT" ] && [ -z "$SCREENSHOTS" ] && [ -z "$CODE_FILES" ]; then
  echo ""
  echo "No prototype input found. Provide one of:"
  echo "  1. Figma URL:    ./run-visual.sh https://www.figma.com/design/..."
  echo "  2. Screenshots:  design/prototype/screenshots/*.png"
  echo "  3. Code export:  design/prototype/code/*.tsx"
  echo "  4. v0 URL:       ./run-visual.sh https://v0.dev/chat/..."
  echo ""
  echo "Figma URL is recommended — uses MCP for the richest data."
  echo "See design/README.md for details."
  fail "No prototype input"
fi

if [ -n "$SCREENSHOTS" ]; then
  COUNT=$(echo "$SCREENSHOTS" | wc -l | tr -d ' ')
  SOURCE_PROMPT="${SOURCE_PROMPT}

Also found ${COUNT} screenshot(s) — read as supplementary visual reference:
$(echo "$SCREENSHOTS" | sed 's/^/  - /')"
  echo "Found $COUNT screenshot(s) as supplementary input"
fi

if [ -n "$CODE_FILES" ]; then
  COUNT=$(echo "$CODE_FILES" | wc -l | tr -d ' ')
  SOURCE_PROMPT="${SOURCE_PROMPT}

Also found ${COUNT} exported code file(s) — read for component hierarchy reference:
$(echo "$CODE_FILES" | sed 's/^/  - /')
DO NOT copy this code. Read it as a design reference only."
  echo "Found $COUNT code file(s) as supplementary input"
fi

# ── Run visual agent ─────────────────────────────────────────────
step "Visual: reading prototype → ui-spec"

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

if [ ! -f "design/ui-spec.md" ]; then
  fail "ui-spec.md was not created"
fi

ok "ui-spec.md written"

# ── Gate: PM approval ────────────────────────────────────────────
gate "PM: review ui-spec.md"
echo ""
echo "  The visual agent has produced design/ui-spec.md"
echo "  Review it for:"
echo "    - Did it understand the layout correctly?"
echo "    - Are the data shapes right?"
echo "    - Are the interactions complete?"
echo "    - Answer any ambiguities it flagged"
echo ""
read -p "Approve? (y to approve, n to edit manually first): " APPROVE

if [[ "$APPROVE" == "y" ]]; then
  sed -i '' 's/Status: PENDING_PM_APPROVAL/Status: APPROVED/' design/ui-spec.md
  git add design/ui-spec.md
  git diff --staged --quiet || git commit -m "design: ui-spec — APPROVED"
  ok "UI spec approved. Run ./run-feature.sh to start planning."
else
  echo ""
  echo "Edit design/ui-spec.md, then run:"
  echo "  sed -i '' 's/PENDING_PM_APPROVAL/APPROVED/' design/ui-spec.md"
  echo "  git add design/ui-spec.md && git commit -m 'design: ui-spec — APPROVED'"
  echo ""
  echo "Then continue with ./run-feature.sh to start planning."
fi
