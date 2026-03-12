# Feature Workflow
# The AI-native delivery process. Agents read this to understand the full flow.

## Core Principle
Agents execute. Humans referee.

Humans are not gates at every step — they're called in when agents surface
something that needs a decision. Between escalations, agents run.

## The Workflow

```
1. HUMAN writes intent
   "As a user I want to reset my password"
        ↓
2. ROUTER (subagent, haiku)
   Classifies task, selects knowledge slices
   Fast and cheap — runs automatically
        ↓
3. ARCHITECT (subagent, opus)
   /plan "[intent]"
   → reads architecture + domain knowledge
   → produces API contract delta (status: PENDING_APPROVAL)
   → produces task list for FE + BE + tests
   → surfaces any anticipated ambiguities
        ↓
4. HUMAN approves contract ← DECISION POINT
   Edit api-contract.yaml: change PENDING_APPROVAL → APPROVED
   Modify anything that's wrong before approving
        ↓
5. AGENT TEAM (parallel, sonnet × 2)
   /build "[feature-slug]"
   → frontend teammate + backend teammate run simultaneously
   → both read the same approved contract
   → they message each other directly for coordination
   → they escalate jointly when human input needed
        ↓
   [if escalation raised]
   HUMAN resolves ← DECISION POINT (demand-driven, not scheduled)
   → edit escalation/log/[id].yaml, add resolution block
   → agents continue
        ↓
6. HUMAN reviews diff ← DECISION POINT (advisory)
   Quick sanity check — looking for contract drift, obvious issues
   Not a line-by-line review — that's the reviewer agent's job
        ↓
7. TESTER (subagent, sonnet)
   /test "[feature-slug]"
   → adversarial — tests contract, not implementation
   → reports bugs found (does NOT fix them)
        ↓
   [if bugs found]
   HUMAN triages ← DECISION POINT
   → BLOCKER: send back to build agent with specific description
   → WARNING: accept or reject
   → re-test after fix
        ↓
8. REVIEWER (subagent, opus)
   /review "[feature-slug]"
   → checks DoD, contract compliance, code quality
   → produces structured report in escalation/log/
        ↓
9. HUMAN decides ← DECISION POINT
   MERGE / REWORK / MERGE WITH CONDITIONS
        ↓
10. COMPOUND LOOP (post-merge)
    /promote-patterns — promotes reusable patterns to knowledge base
    /sync-to-figma   — captures built UI, pushes back to Figma prototype
    → PM can now use Figma Make to iterate on the updated design
    → next feature starts from what was shipped, not from scratch
```

## Human Decision Points: When and Why

| Point | Type | What you're deciding |
|-------|------|---------------------|
| Post-plan | Mandatory | Is this the right contract? |
| Escalation | Demand-driven | Resolve agent uncertainty |
| Post-build diff | Advisory | Obvious issues before testing |
| Post-test triage | Mandatory | Which bugs are blockers |
| Post-review | Mandatory | Merge or rework |

## Escalations Mid-Build

Escalations are demand-driven — they interrupt you when needed, not on a schedule.

When you see an escalation in `escalation/log/`:
1. Read the escalation file
2. Understand the options and agent default
3. Add a `resolution` block with your choice and reasoning
4. If `promote_to_knowledge: true`, run `./scripts/promote-pattern.sh`
5. The waiting agent(s) can now continue

## What Changes For Different Team Setups

### Small team / single developer
- Human does all decision points
- FE and BE tasks may be done sequentially (disable agent teams)
- Set `use_agent_teams: false` in config

### Standard engineering team
- Tech lead approves contracts and resolves escalations
- Developer reviews diffs
- Anyone can triage test findings with common sense

### Client engagement (Futurice + client)
- Futurice: architect agent setup, contract approval, escalation resolution
- Client: requirements input, final merge decisions
- Domain pack authored from client discovery documents
