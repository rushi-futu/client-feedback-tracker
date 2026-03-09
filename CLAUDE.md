# Project: Client Feedback Tracker
A tool for client success managers to log feedback from clients,
tag it by theme (e.g. UX, Performance, Support), and track whether
each item has been actioned. Feedback can be filtered by client,
theme, and status.


# Vibe Engineering Harness
# Agents execute. Humans referee.

## What This Is

A structured AI-native delivery environment for shipping features from PM prototype
to merge-ready PR — with humans called in at the right moments, not every moment.

See `config/harness.config.yaml` for project settings. Read it before any task.

---

## The Delivery Flow

```
PM builds prototype (v0 or similar)
  ↓
visual agent — reads prototype, produces design/ui-spec.md
  ↓
GATE: PM approves — "yes, you understood my design"
  ↓
architect (phase 1) — reads ui-spec, produces api-contract.yaml
  ↓
GATE: PM + Eng approve — "yes, this is the right API surface"
  ↓
architect (phase 2) — reads contract + ui-spec, produces implementation-plan.md
  ↓
GATE: Eng approves — "yes, build it this way"
  ↓
backend + frontend build in parallel (both read the implementation plan)
  ↓
tester — adversarial tests, findings logged
  ↓
GATE: Eng triages findings — "these block merge, these don't"
  ↓
reviewer — DoD + contract + plan compliance report
  ↓
GATE: Eng approves merge
  ↓
PR opened — merge when ready
```

---

## Agent Roster

| Agent | Model | Role |
|-------|-------|------|
| visual | opus | Reads PM prototype → produces design/ui-spec.md |
| architect | opus | Two-phase: contract → implementation plan |
| backend | sonnet | Implements API + data against the plan |
| frontend | sonnet | Implements UI against the plan, uses ui-spec as layout reference |
| tester | sonnet | Adversarial tests — separate from build agents |
| reviewer | opus | DoD + contract + plan compliance |
| router | haiku | Knowledge slice selection for ad-hoc tasks |

---

## Knowledge Loading Order

Before any task, load in this order:
1. `config/harness.config.yaml` — project settings
2. `.claude/skills/codebase/architecture.md` — always
3. `.claude/skills/codebase/K2-system-context.md` — if touching integrations
4. Relevant task-type skill (see Skills Index below)
5. `design/ui-spec.md` — if building or planning UI

## Skills Index

| Task | Load |
|------|------|
| Reading a prototype | `.claude/agents/visual.md` |
| Planning a feature | `.claude/skills/delivery/feature-workflow.md` |
| API endpoint | `.claude/skills/codebase/api-patterns.md` |
| Frontend component | `.claude/skills/codebase/frontend-patterns.md` |
| Database / data model | `.claude/skills/codebase/data-patterns.md` |
| Writing tests | `.claude/skills/testing/test-patterns.md` |
| PR / review | `.claude/skills/delivery/definition-of-done.md` |
| Domain logic | `.claude/skills/domain/[domain-pack].md` |
| System integrations | `.claude/skills/codebase/K2-system-context.md` |
| **Any phase** | **`.claude/tools-registry.md` — check required tools first** |

---

## Design Layer

`design/ui-spec.md` — produced by the visual agent, approved by the PM.
This is the bridge between PM prototype and engineering.

The architect reads it to ground the contract in real UI.
The frontend agent reads it as a layout reference during build.
Nobody reads or copies the prototype's generated code.

See `design/README.md` for full details.

---

## Escalation Protocol

When you hit genuine uncertainty — stop. Do not guess.

Read `escalation/PROTOCOL.md` and write a structured escalation to `escalation/log/`.

Escalation triggers:
- `design/ui-spec.md` has unresolved ambiguities
- Contract conflict between agents
- Ambiguous requirements with two valid interpretations
- High blast-radius action (shared schema, auth, public API)
- No knowledge pattern exists for this situation
- Any deviation from the approved implementation plan

---

## Non-Negotiables

1. `design/ui-spec.md` must be PM-approved before the architect plans
2. `api-contract.yaml` must be human-approved before any code is written
3. `tasks/implementation-plan.md` must be human-approved before any code is written
4. Never copy prototype code into production — build from scratch against patterns
5. Never write tests for code you just wrote — tester agent is separate
6. Never proceed through an escalation trigger — always surface it
7. Conventional commits: `feat:` `fix:` `test:` `refactor:` `docs:`
