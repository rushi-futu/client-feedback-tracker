# Escalation Protocol

Escalations are how agents communicate uncertainty to humans.
They are NOT errors. They are the mechanism that keeps humans as referees
without requiring them to watch every step.

## When To Escalate

Escalate immediately when you hit ANY of these:

| Trigger | Type | Example |
|---------|------|---------|
| Two agents interpret the contract differently | `contract_conflict` | FE expects string, BE sends integer |
| Feature request has two valid implementations | `ambiguity` | "fast" could mean latency or throughput |
| Action affects shared/critical infrastructure | `risk` | Changing a shared DB schema |
| No existing pattern covers this situation | `novel_pattern` | First time using a new third-party service |
| Test finding could be a bug or intentional | `test_finding` | Auth returns 403 — is that right? |

## How To Escalate

Write a file to `escalation/log/[timestamp]-[type].yaml` using this schema:

```yaml
# escalation/log/2026-03-08T14-32-00-contract_conflict.yaml

id: "[timestamp]-[type]"
timestamp: "2026-03-08T14:32:00Z"
type: contract_conflict        # contract_conflict | ambiguity | risk | novel_pattern | test_finding
raised_by: ["frontend_teammate", "backend_teammate"]   # which agent(s)
status: open                   # open | resolved

# What is the uncertainty?
description: |
  Frontend teammate is treating userId as a string (UUID format) based on the
  existing user profile endpoints. Backend teammate has implemented it as an
  integer (auto-increment) to match the database schema. Contract is ambiguous —
  it says "userId" with no type specified.

# What are the options? (always provide at least 2)
options:
  - id: A
    label: "String (UUID)"
    description: "Change BE to use UUID. Align with profile endpoints."
    implication: "Requires migration. Breaking change if other services consume this."
    agent_preference: false

  - id: B
    label: "Integer (auto-increment)"
    description: "FE adapts to cast/handle integer. No migration needed."
    implication: "FE must handle type coercion. Inconsistent with profile endpoints."
    agent_preference: true

# What would the agent do if not interrupted?
agent_default:
  choice: B
  reasoning: "Matches current DB schema, no migration required"

# How bad is it if the agent gets this wrong?
blast_radius: medium    # low | medium | high
blast_reasoning: "Would require a migration to fix later if wrong choice made"

# Who should resolve this?
waiting_on: tech_lead   # from config/harness.config.yaml escalation.routing

# Context for the human
context_files:
  - "api-contract.yaml"
  - "src/models/user.ts"
  - ".claude/skills/codebase/K2-system-context.md"
```

Then **stop working on the affected task** and wait.

## How Humans Resolve

Edit the escalation file, add a `resolution` block:

```yaml
resolution:
  timestamp: "2026-03-08T14:45:00Z"
  resolved_by: "tech_lead"
  choice: A
  reasoning: "UUID aligns with our auth service. Accept the migration cost."
  promote_to_knowledge: true   # should this decision become a pattern?
  knowledge_note: "userId is always UUID string across all services. See K2."
```

Then signal the waiting agents to continue. If `promote_to_knowledge: true`,
run `./scripts/promote-pattern.sh` to capture it.

## Escalation Log

All escalations and resolutions are logged permanently in `escalation/log/`.
This is your audit trail and your learning signal.
Review it periodically — patterns of repeated escalations mean a gap in the
knowledge layer that should be filled.
