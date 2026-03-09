# Workflow Definitions

Workflows are declarative YAML files that define how the harness drives an SDLC task end-to-end.
The GitHub Actions pipeline in `.github/workflows/` reads these definitions and executes them.

## Available Workflows

| Workflow | GHA File | When to Use |
|----------|----------|-------------|
| `feature.yaml` | `ai-feature.yml` | New features — full plan → build → test → review cycle |
| `hotfix.yaml` | `ai-hotfix.yml` | Small scoped fixes — skip planning, straight to fix + review |

## How to Run

```bash
# Feature
gh workflow run ai-feature.yml -f intent="editor can create a story brief with priority"

# Hotfix
gh workflow run ai-hotfix.yml -f description="assignment confidence score returns null when reporter has no history"
```

Or: GitHub Actions tab → select workflow → Run workflow → fill in the form.

## Human Gates

Gates pause the pipeline and send a notification to required reviewers.
You approve or reject directly in the GitHub Actions UI (or via email link).

| Gate | Appears After | What You're Deciding |
|------|--------------|---------------------|
| `plan-gate` | Architect finishes | Is the API contract right before code is written? |
| `test-gate` | Tester finishes | Which findings block merge? |
| `merge-gate` | Reviewer finishes | Is this ready to merge? |

## Workflow Definition Format

```yaml
workflow: name          # identifier
description: string     # human-readable purpose

inputs:
  intent:
    description: string
    required: true
  branch:
    description: string
    default: "ai/feature-{{timestamp}}"

steps:
  - id: string                    # unique step identifier
    name: string                  # display name in GHA
    agent: string                 # which .claude/agents/ file to use
    depends_on: step_id           # run after this step (omit = run first)
    parallel: true                # run alongside sibling steps (default: false)
    prompt: |                     # what to tell the agent
      multiline string
      {{inputs.intent}} interpolated
    outputs:                      # what the agent is expected to produce
      - path/glob/**
    gate:
      type: none | human_approval | human_triage | human_merge
      environment: env-name       # must match a GitHub Environment with required reviewers
      message: string             # shown to the reviewer in the gate UI
```

## Adding a New Workflow

1. Create `.claude/workflows/your-workflow.yaml`
2. Create `.github/workflows/ai-your-workflow.yml` following the pattern in `ai-feature.yml`
3. Map each `gate.environment` to a GitHub Environment in repo Settings
4. Test with `gh workflow run`
