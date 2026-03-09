# Tools Registry

This file tells you what external tools are available, which agents can use them, and when they are required. Read this file before starting any phase.

## How to know which tools apply to you

Check `config/harness.config.yaml` → `tools:` section. Each entry has:
- `available_to` — which agents can call it
- `required_before` — which phases require it to be called first
- `optional` — if false, you must call it before proceeding

---

## Required vs Optional

**Required** (`optional: false`) means: do not proceed with your phase until you have called this tool and incorporated the result. If the tool is unreachable, raise an escalation of type `risk` with blast_radius `high` — do not guess.

**Optional** (`optional: true`) means: call it if it would improve your output. Prefer to call it. If unreachable, note it and continue.

---

## Tools Reference

### k2-system-context (MCP)
**Available to**: architect, backend, reviewer  
**Required before**: plan  
**What it gives you**: live service topology, inter-service contracts, safety rules  
**How to use**: call `list_services` first, then `get_service_contract` for any service you'll touch, then `check_safety` for your proposed action  
**If unreachable**: raise escalation type `risk`, blast_radius `high` — the static K2-system-context.md may be stale

---

### figma (MCP) — if configured
**Available to**: frontend, architect  
**Required before**: build (UI features only)  
**What it gives you**: component specs, design tokens, layout decisions, interaction states  
**How to use**: fetch the specific frame or component URL from the ticket/task, not the whole file  
**If unreachable**: raise escalation type `ambiguity` — do not guess at design decisions

---

### github (MCP) — if configured
**Available to**: architect, reviewer  
**Required before**: plan  
**What it gives you**: existing code patterns, open PRs that might conflict, recent changes to affected files  
**How to use**: search for existing implementations of similar patterns before planning new ones  
**If unreachable**: fall back to local file search (Grep, Glob) — note the limitation

---

### linear / jira (MCP) — if configured
**Available to**: architect, router  
**Required before**: plan  
**What it gives you**: acceptance criteria, linked specs, stakeholder notes on the ticket  
**How to use**: fetch the ticket ID provided in the task description  
**If unreachable**: work from the feature description provided — note missing context in task file

---

### sentry (MCP) — if configured
**Available to**: tester  
**Required before**: test (optional)  
**What it gives you**: existing error patterns, recent production incidents in affected areas  
**How to use**: query errors in the endpoint or component you're testing  
**If unreachable**: proceed with test generation from code alone

---

### confluence / notion (MCP) — if configured
**Available to**: architect, reviewer  
**Required before**: nothing required  
**What it gives you**: runbooks, ADRs, historical decisions  
**How to use**: search by topic when planning in an unfamiliar area  
**If unreachable**: proceed — use escalation if a critical decision needs org context

---

## Tool call sequence by phase

### /plan (architect)
```
1. k2-system-context: list_services → check_safety        [required if k2_mode=mcp]
2. github: search existing patterns                        [required if configured]
3. linear: fetch ticket                                    [required if configured]
4. confluence: search relevant ADRs                        [optional]
5. → produce API contract and task list
```

### /build (frontend)
```
1. figma: fetch component specs for this feature           [required if configured]
2. → implement against approved API contract
```

### /build (backend)
```
1. k2-system-context: get_service_contract for dependencies [required if k2_mode=mcp]
2. → implement against approved API contract
```

### /test (tester)
```
1. sentry: check existing errors in affected area          [optional]
2. → write adversarial tests
```

### /review (reviewer)
```
1. k2-system-context: check_safety on the diff            [required if k2_mode=mcp]
2. github: check for conflicting open PRs                  [optional if configured]
3. → produce review report
```

---

## Adding a new tool

1. Add the MCP server to `.claude/settings.json`
2. Add an entry to `config/harness.config.yaml` → `tools:`
3. Add a section to this file (tools-registry.md) with usage instructions
4. Update any agent definition files (`.claude/agents/*.md`) if the agent needs explicit instruction on when to call it

---

## visual agent tools

### web-fetch
- available_to: visual
- required_before: read-prototype
- optional: false (when prototype_url is provided)
- purpose: Fetch the prototype URL to read the rendered component structure
- usage: Use web fetch on the prototype URL. Read the HTML/JSX structure. Do not execute JavaScript.

### design/prototype/ directory
- available_to: visual
- required_before: read-prototype
- optional: true
- purpose: Read exported prototype files if no URL is provided
- usage: Read all .tsx/.jsx files. Extract component hierarchy and data shapes.
