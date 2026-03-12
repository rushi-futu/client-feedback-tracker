# Design

The design layer — the bridge between PM prototype and engineering.

## Files

| File | Created by | Read by | Purpose |
|------|-----------|---------|---------|
| `ui-spec.md` | visual agent | architect, frontend agent | Structured translation of the PM design |
| `prototype/screenshots/` | PM (fallback) | visual agent | Screenshots if Figma MCP unavailable |
| `prototype/code/` | PM (optional) | visual agent | Exported code as supplementary reference |

## Figma MCP (Recommended)

The visual agent reads Figma designs directly via MCP — no screenshots, no exporting.

### One-time setup

```bash
# Add Figma MCP server to Claude Code
claude mcp add --transport http figma https://mcp.figma.com/mcp

# Authenticate
# In Claude Code: /mcp → select figma → Authenticate → Allow Access
```

### PM workflow

1. Design in Figma (use Figma Make to generate from prompts if you like)
2. Copy the Figma frame/page URL
3. Run:

```bash
./run-visual.sh https://www.figma.com/design/abc123/My-Project?node-id=1-2
```

Or in Claude Code:
```
/read-prototype https://www.figma.com/design/abc123/My-Project?node-id=1-2
```

That's it. The visual agent reads the design via MCP and produces `ui-spec.md`.

### What Figma MCP gives the agents

| Data | Used by | For what |
|------|---------|----------|
| Component hierarchy | visual, architect | Component inventory, API surface |
| Text content | visual | Reveals data fields the UI displays |
| Component variants | visual | Different states (empty, loading, error) |
| Auto-layout properties | frontend | Spacing, responsive behaviour |
| Design tokens | frontend | Colors, typography, spacing — match design exactly |
| Code Connect snippets | frontend | Keep generated code consistent with design system |

### Two-way flow (the compounding loop)

**Design → Code** (delivery):
PM creates in Figma Make → visual agent reads via MCP → ui-spec.md → architect plans → agents build

**Code → Design** (compound loop, post-merge):
Built app → `generate_figma_design` captures running UI → pushes back to the same Figma file
→ `send_code_connect_mappings` links each component to its source file
→ Figma prototype now reflects what was actually shipped

**Next iteration** (compounding):
PM opens updated Figma file → uses Figma Make to iterate on top of what shipped
→ visual agent reads the updated design → delivery repeats
→ each cycle starts from where the last one ended, not from scratch

Run `/sync-to-figma` after merge, or let `/deliver-feature` run it automatically in Phase 9.

Configure in `config/harness.config.yaml` → `compound_loop.figma_sync`.

## Fallback: Screenshots + Exported Code

If Figma MCP is not configured, export manually:

### Screenshots

Take screenshots of every page and state:
```
design/prototype/screenshots/
  01-feedback-list.png
  02-feedback-list-filtered.png
  03-new-feedback-form.png
```

### Code export (optional)

Copy component code from v0 or Figma Dev Mode:
```
design/prototype/code/
  FeedbackList.tsx
  FeedbackForm.tsx
```

Then run `./run-visual.sh` with no arguments — it picks up local files automatically.

## The Design → Build Contract

The PM design is the design truth.
The visual agent reads it and produces `ui-spec.md`.
The architect reads `ui-spec.md` to ground the API contract in real UI.
The frontend agent reads `ui-spec.md` as a layout reference during build.

**Nobody copies prototype code into production.**
The production frontend is built from scratch against the harness patterns.

## No Prototype? (Intent-Only Mode)

If there's no Figma design, the PM writes `ui-spec.md` by hand.
Set `Status: APPROVED` and skip Gate 1. The architect plans from the hand-written spec.
