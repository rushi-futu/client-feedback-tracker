# K2: System Context
# CONFIGURE: Describe the ecosystem this codebase lives in.
# This is the knowledge that prevents agents from breaking things outside this repo.
# In static mode, agents read this file directly.
# In mcp mode, they query the K2 MCP server instead.

## What This Service Is
<!-- What does this service do in the context of the wider system? -->
<!-- What does it produce? What does it consume? Who depends on it? -->

## Service Topology
<!-- Copy/summarise from mcp/knowledge/topology/services.yaml -->

```
[upstream-service] ──calls──> [THIS SERVICE] ──calls──> [downstream-service]
                                     │
                              publishes to
                                     │
                              [message-topic]
                                     │
                              consumed by
                                [consumer-service]
```

## Integration Contracts

### Upstream: [service-name]
- **What they send us**: [data/events]
- **Protocol**: [REST / events / etc]
- **Our obligation**: [what we must do with it]
- **Their SLA expectation**: [latency/reliability they expect from us]

### Downstream: [service-name]
- **What we send them**: [data/events]
- **Protocol**: [REST / events / etc]
- **Their SLA expectation**: [what they depend on us for]
- **Breaking this means**: [consequence of failure]

## Shared Infrastructure

### Shared Database: [name]
- **Also used by**: [other services]
- **Tables we own**: [list]
- **Tables we share**: [list — changes require coordination]
- **Tables we read but don't own**: [list — never write to these]

### Message Queue / Event Bus: [name]
| Topic | We are | Schema file |
|-------|--------|-------------|
| [topic] | producer | [path] |
| [topic] | consumer | [path] |

## Critical Constraints
<!-- Things that must not be violated — if you're unsure, escalate -->

1. **[Constraint]**: [What it is and why it exists]
2. **[Constraint]**: [What it is and why it exists]

## Known Failure Modes
<!-- What happens when things in the ecosystem go wrong? -->
<!-- How should this service behave when [service-x] is down? -->

- If [upstream-service] is unavailable: [expected behaviour]
- If [downstream-service] is unavailable: [expected behaviour]
- If [message-queue] is unavailable: [expected behaviour]

## Contact Points
<!-- Who to ask for questions about other services -->
| Service | Team | Slack |
|---------|------|-------|
| [service] | [team] | [#channel] |

---

## Example: Reuters Editorial Workflow

### Service Topology
```
content-ingestion ──wire-events──> editorial-workflow ──article-approved──> distribution
                                          │
                                   REST API
                                          │
                                   editorial-ui (frontend)
```

### Critical Constraints
1. **Embargoed content**: Articles with `embargoUntil` in the future must NEVER
   appear in any API response regardless of auth level. Filter at the query layer.
2. **Kill order propagation**: Setting status to "killed" must propagate to the
   distribution service within 60 seconds. This is a hard SLA.
3. **Article ID format**: Always UUID string. The distribution service expects UUID.
   Never use integer IDs in any public-facing context.

### Known Failure Modes
- If distribution is unavailable: queue the publish event, do not fail the approval
- If content-ingestion is unavailable: editorial workflow continues, new wire items
  simply won't appear until ingestion recovers
