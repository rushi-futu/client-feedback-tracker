# Quickstart

Get running in 15 minutes.

---

## 1. Copy the harness into your repo

```bash
# From the zip — copy contents directly into your project root
unzip vibe-engineering-harness.zip -d /tmp/harness
cp -r /tmp/harness/vibe-harness/. your-project/
```

---

## 2. Configure for your project

Edit `config/harness.config.yaml` — set your stack, team, repo details.
Edit `CLAUDE.md` top section — describe your project, stack, domain concepts.

---

## 3. Fill in the knowledge layer

These four files are the most important thing to get right.
Agents read them before every task.

```
.claude/skills/codebase/architecture.md   ← directory structure, conventions
.claude/skills/codebase/api-patterns.md   ← backend code conventions + examples
.claude/skills/codebase/frontend-patterns.md ← frontend code conventions + examples
.claude/skills/codebase/data-patterns.md  ← data model conventions + examples
```

For a new project: pre-filled patterns for your stack are already in these files.
For an existing project: replace with patterns from your actual codebase.

---

## 4. Set up GitHub

**Environments** (Settings → Environments — create all five):

| Environment | Required Reviewers |
|-------------|-------------------|
| `pm-gate` | PM |
| `plan-gate` | PM + Lead Eng |
| `impl-gate` | Lead Eng |
| `test-gate` | Lead Eng |
| `merge-gate` | Lead Eng |

**Permissions** (Settings → Actions → General):
- Workflow permissions → Read and write permissions ✓

**Secret** (Settings → Secrets → Actions):
- `ANTHROPIC_API_KEY` → your Anthropic API key

---

## 5. Run your first feature

```bash
# With PM prototype (recommended)
gh workflow run ai-feature.yml \
  -f intent="describe what you want to build" \
  -f prototype_url="https://v0.dev/chat/your-project-url"

# Intent only — skips visual step
gh workflow run ai-feature.yml \
  -f intent="describe what you want to build"
```

Then watch GitHub Actions. You'll be notified at each gate.

---

## What Happens At Each Gate

**Gate 1 — UI Spec (PM)**
- Open: `design/ui-spec.md` artifact
- Check: did the agent correctly understand the prototype?
- Action: answer any ambiguities flagged in the spec before approving

**Gate 2 — Contract (PM + Eng)**
- Open: `api-contract.yaml` artifact
- Check: is this the right API surface? Are the schemas correct?
- Action: approve or reject. If rejecting, add a comment explaining why.

**Gate 3 — Implementation Plan (Eng)**
- Open: `tasks/implementation-plan.md` artifact
- Check: data model, shared types, file structure, architectural decisions
- Action: edit the file to override any open question defaults, then approve

**Gate 4 — Test Findings (Eng)**
- Open: `escalation/log/test-findings-*.yaml` artifact
- Check: what did the tester find? Which findings block merge?
- Action: approve to continue (you'll make merge decisions at gate 5)

**Gate 5 — Merge (Eng)**
- Open: `escalation/log/review-*.yaml` artifact
- Check: does the reviewer report show anything that blocks merge?
- Action: approve to open PR, reject to request fixes

---

## Maintenance

GC runs automatically every Monday at 9am.
It checks for contract drift, stale knowledge, orphaned tasks.
If action is required it opens a GitHub issue.

Run it manually anytime:
```bash
gh workflow run ai-gc.yml
```

---

## Running Locally (without GHA)

For local development with Claude Code:

```bash
cd your-project
claude
```

Use slash commands:
- `/plan "intent"` — architect phase 1 (contract)
- `/plan-impl` — architect phase 2 (implementation plan) — run after approving contract
- `/build` — build phase (runs both agents)
- `/test` — tester agent
- `/review` — reviewer agent

---

## Docker Sandboxes (unattended runs)

For fully autonomous agent runs with no human in the loop:

```bash
docker sandbox run --workspace . -- \
  claude --dangerously-skip-permissions -p "/build"
```

Use this for build and test phases only — never for plan phases.
Planning requires human gates.
