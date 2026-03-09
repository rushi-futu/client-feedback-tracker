# K4: Organisational Context
# How this team works. Loaded by agents when working on deployment,
# CI/CD, or anything that touches team processes.
# CONFIGURE: Fill in all sections for this project.

## Team Structure
<!-- Who owns what -->

| Role | Person/Team | Responsible For |
|------|-------------|-----------------|
| Tech Lead | [name/team] | Architecture decisions, contract approval |
| Product Owner | [name] | Requirements, merge decisions |
| Platform/DevOps | [name/team] | CI/CD, infrastructure |
| Security | [name/team] | Auth patterns, compliance |

## Escalation Contacts
<!-- From config/harness.config.yaml escalation.routing — expanded here -->

| Type | Contact | Channel |
|------|---------|---------|
| Contract conflict | [tech lead] | [Slack #channel] |
| Architecture decision | [tech lead] | [Slack #channel] |
| Security concern | [security contact] | [Slack #channel] |
| Product ambiguity | [product owner] | [Slack #channel] |

## Deployment Process
<!-- How code gets to production -->

### Environments
| Env | URL | Deploys From | Auto/Manual |
|-----|-----|-------------|-------------|
| dev | [url] | any branch | auto |
| staging | [url] | main | auto |
| production | [url] | tags/releases | manual |

### Deployment Steps
```bash
# CONFIGURE: Actual deployment steps
# e.g. GitHub Actions workflow, Heroku, Vercel, etc.
```

### Deployment Constraints
<!-- Things agents must know to avoid breaking deployments -->
- [ ] No deployments on [days/times]
- [ ] Migrations deployed separately from application code
- [ ] Feature flags required for [conditions]
- [ ] [Other constraints]

## Architecture Decision Records (ADRs)
<!-- Key decisions already made — agents should not re-litigate these -->

| Date | Decision | Rationale | Status |
|------|----------|-----------|--------|
| [date] | [e.g. Use UUID for all IDs] | [Why] | Accepted |
| [date] | [decision] | [rationale] | Accepted/Superseded |

### ADR Location
<!-- Where full ADR documents live -->
`[docs/adr/ | Confluence link | Notion link]`

## Runbooks
<!-- Operational procedures agents should be aware of -->

| Situation | Runbook |
|-----------|---------|
| DB migration rollback | [link or inline steps] |
| Service restart | [steps] |
| Incident response | [link] |

## Branch Strategy
```
main          ← production
staging       ← pre-production integration
feat/[id]-[description]  ← feature branches (from main)
fix/[id]-[description]   ← bug fixes
```

## PR Process
1. Branch from `main`
2. Open PR against `main`
3. Reviewer agent report must be attached
4. [N] approvals required: [1 | 2]
5. All checks must pass (CI, lint, typecheck, tests)
6. Squash merge (keep history clean)

## CI/CD Pipeline
<!-- What runs on every PR -->

```yaml
# CONFIGURE: What your CI does
# e.g.:
# on: pull_request
# jobs:
#   typecheck, lint, test, security-scan, deploy-preview
```

## On-Call / Incident
<!-- Who to contact and how in case of production issues -->
- On-call rotation: [tool/schedule]
- Incident channel: [Slack #incidents]
- Severity levels: [P1/P2/P3 definitions]

## Promoted Patterns
<!-- Organisational patterns added via scripts/promote-pattern.sh -->
