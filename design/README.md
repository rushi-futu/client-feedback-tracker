# Design

This directory contains the design layer — the bridge between PM prototype and engineering.

## Files

| File | Created by | Read by | Purpose |
|------|-----------|---------|---------|
| `ui-spec.md` | visual agent | architect, frontend agent | Structured translation of the PM prototype |
| `prototype/` | PM (optional) | visual agent | Exported prototype files if not using a URL |

## The Design → Build Contract

The PM prototype (v0 or similar) is the design truth.
The visual agent reads it and produces `ui-spec.md`.
The architect reads `ui-spec.md` to ground the API contract in real UI.
The frontend agent reads `ui-spec.md` as a layout reference during build.

**Nobody reads the prototype's generated code.**
The prototype code is throwaway — it exists to communicate design, not implementation.
The production frontend is built from scratch against the harness patterns.

## Workflow

1. PM builds prototype in v0 (or exports to `design/prototype/`)
2. Trigger `ai-feature.yml` with the prototype URL (or leave blank if using exported files)
3. Visual agent runs, produces `design/ui-spec.md`
4. PM reviews `ui-spec.md` — "did the agent understand my design correctly?"
5. PM answers any ambiguities flagged in the spec by editing the file
6. PM approves Gate 1 — architect begins planning

## Updating the Spec

If the PM changes the prototype mid-feature:
- Re-run the visual agent manually: trigger `ai-feature.yml` with `visual_only: true` (if configured)
- Or edit `ui-spec.md` directly and commit — the architect re-reads it on next run
- Flag the change as an escalation if build has already started
