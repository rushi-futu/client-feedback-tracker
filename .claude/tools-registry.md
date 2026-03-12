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

### figma (MCP)
**Available to**: visual, frontend, architect
**Required before**: read-prototype (visual), build (frontend — UI features only)
**What it gives you**: component hierarchy, layout properties, text content (reveals data fields), design tokens (colors, typography, spacing), component variants (states), auto-layout
**How to use**:
- Visual agent: pass the Figma file/frame URL from the task → read design structure → produce ui-spec.md
- Frontend agent: pass specific component URLs → read tokens, spacing, typography → match implementation to design
- Architect: pass page-level frames → read component inventory → ground contract in real UI
- Always fetch specific frames or components, not the entire file
- Use node URLs (with `?node-id=...`) for precision
**If unreachable**: fall back to screenshots in `design/prototype/screenshots/`. If no screenshots either, raise escalation type `ambiguity` — do not guess at design decisions

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

### /read-prototype (visual)
```
1. figma: fetch frame/page URL from task                   [required if configured]
2. → read component hierarchy, text, tokens, variants
3. → produce design/ui-spec.md
```

### /plan (architect)
```
1. figma: fetch page-level frames for component inventory  [optional — supplements ui-spec]
2. k2-system-context: list_services → check_safety         [required if k2_mode=mcp]
3. github: search existing patterns                        [required if configured]
4. linear: fetch ticket                                    [required if configured]
5. confluence: search relevant ADRs                        [optional]
6. → produce API contract and task list
```

### /build (frontend)
```
1. figma: fetch component specs for this feature           [required if configured]
2. → implement against approved API contract + design tokens
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

### /sync-to-figma (compound loop)
```
1. figma: generate_figma_design — capture running app      [required]
   → outputMode: "existingFile", push to same Figma file
   → one capture per page/route from ui-spec.md
2. figma: send_code_connect_mappings — link components     [optional]
   → maps each built component to its source file
3. → prototype updated, PM can iterate with Figma Make
```

---

## Adding a new tool

1. Add the MCP server to `.claude/settings.json`
2. Add an entry to `config/harness.config.yaml` → `tools:`
3. Add a section to this file (tools-registry.md) with usage instructions
4. Update any agent definition files (`.claude/agents/*.md`) if the agent needs explicit instruction on when to call it

---

## visual agent tools

### figma (MCP) — primary
- available_to: visual, frontend, architect
- required_before: read-prototype
- optional: false (when figma_url is provided)
- purpose: Read Figma frames directly — layout, components, text, tokens, variants
- usage: Pass the Figma frame/page URL. Read component hierarchy and data shapes from structured MCP response. Check for variants (represent states). Read text content (reveals data fields displayed).

### design/prototype/screenshots/ — fallback
- available_to: visual
- required_before: read-prototype (if no Figma MCP)
- optional: true
- purpose: Screenshots of the prototype when Figma MCP is not available
- usage: Read every image. Claude sees images natively. Extract layout, components, data fields.

### design/prototype/code/ — supplementary
- available_to: visual
- required_before: nothing
- optional: true
- purpose: Exported prototype code for component hierarchy reference
- usage: Read JSX/TSX structure. Extract component names, props, data shapes. Do not copy code.

### web-fetch — last resort
- available_to: visual
- required_before: nothing
- optional: true
- purpose: Fetch a v0 or prototype URL (unreliable for JS SPAs)
- usage: Try web fetch. If it returns empty scaffolding, fall back to screenshots or Figma.
