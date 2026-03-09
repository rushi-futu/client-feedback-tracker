# harness-rules/

Structural rules for your project. These are **stubs** — configure them before the
enforcement hooks will do anything useful.

## What's here

**module-boundaries.json**
Defines which layers can import from which. Edit to match your actual folder structure.
Once configured, wire it into `.claude/hooks/post-tool-structural.sh` by uncommenting
the structural rules block.

**golden-principles.sh**
Project-wide rules checked during GC runs (`./scripts/run-gc.sh`).
Edit to encode your actual non-negotiables — the defaults are illustrative only.

## When to configure these

Not on day one. Add them when you notice a pattern of agent mistakes you want to prevent
mechanically. Each rule should be a response to something that actually happened, not
a precaution against something theoretical.
