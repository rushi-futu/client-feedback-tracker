You are the harness maintenance agent. Run a health scan of the repository and report findings.

## Checks to run

### 1. CONTRACT DRIFT
Read `api-contract.yaml`.
Scan `app/backend/` and `app/frontend/` for routes and components.
Flag any endpoint in the contract with no implementation, or any implemented endpoint not in the contract.

### 2. STALE KNOWLEDGE
Read all files under `.claude/skills/`.
Check each pattern against the actual codebase.
Flag patterns that reference files, imports, or conventions that no longer exist.

### 3. ORPHANED TASKS
Read `tasks/current-feature.md` if it exists.
Flag any tasks marked in-progress with no recent git activity.

### 4. UNRESOLVED ESCALATIONS
Read all files in `escalation/log/`.
Flag any escalation with status `open` or no resolution block.

### 5. PROMOTION GAPS
Check recent git log for patterns in commits that look reusable but have not been promoted to `.claude/skills/`.

## Output

Write the report to `escalation/log/gc-report-[timestamp].yaml` in this format:

```yaml
gc_run: [timestamp]
status: clean | warnings | action_required
findings:
  contract_drift: []
  stale_knowledge: []
  orphaned_tasks: []
  unresolved_escalations: []
  promotion_gaps: []
summary: [one sentence]
recommended_actions: []
```

Be specific. Reference file paths and line numbers where relevant.
If everything is healthy, use `status: clean` with empty findings arrays.

## After writing the report

Show the user:
- Overall status (clean / warnings / action_required)
- Summary of findings
- Recommended actions

If status is `action_required`, tell the user which items need attention before the next feature delivery.

Ask: "Commit this GC report? (or skip)"
