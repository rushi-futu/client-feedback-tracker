You are updating the harness knowledge base after a successful feature delivery.

## Step 1: Find the review report

Look in `escalation/log/` for the most recent `review-*.yaml` or `review-*.md` file.
If no review report exists, tell the user: "No review report found. Run /review first."

## Step 2: Extract promotable patterns

Read the review report. Find every item where `promote: true`.

If there are no `promote: true` items, tell the user: "No patterns to promote from this review."

## Step 3: For each promotable pattern

1. Determine which skill file it belongs to:
   - API/router patterns → `.claude/skills/codebase/api-patterns.md`
   - Frontend/component patterns → `.claude/skills/codebase/frontend-patterns.md`
   - Data/model patterns → `.claude/skills/codebase/data-patterns.md`
   - Test patterns → `.claude/skills/testing/test-patterns.md`
   - Architectural patterns → `.claude/skills/codebase/architecture.md`

2. Read the target skill file first.

3. Append the pattern at the end of the file, formatted as:

```markdown
---

## Pattern: [name]
<!-- Promoted: [today's date] -->
<!-- Source: [review report path] -->

[pattern content — reusable across future features, not one-off details]
```

4. Only add patterns that are genuinely reusable. Skip one-off implementation details.

## Step 4: Show the user what was promoted

List each pattern promoted, which skill file it was added to, and why it's reusable.

Ask: "Commit these promoted patterns? (or tell me what to change)"

If approved, commit with message: `learn: promote patterns from review`
Push to origin if the user confirms.
