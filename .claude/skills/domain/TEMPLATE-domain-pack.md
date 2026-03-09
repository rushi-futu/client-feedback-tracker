# Domain Knowledge Pack: [CLIENT / DOMAIN NAME]
# CONFIGURE: Fill in for your specific client or domain.
# Copy this template to .claude/skills/domain/[client-name].md
# Reference it in config/harness.config.yaml under knowledge.domain_pack
#
# Good domain packs give agents the context a new engineer would get
# in their first two weeks: terminology, business rules, key entities,
# and the "why" behind things that look weird in the code.

## What This Business Does
<!-- 3-5 sentences. What problem does the client solve? Who are their users? -->

## Key Terminology
<!-- Words that mean something specific in this domain -->
<!-- Include: the term, what it means, how it maps to code -->

| Term | Meaning | In Code |
|------|---------|---------|
| [Term] | [Domain meaning] | `[src/path/file.ts]` |

## Business Rules
<!-- Rules that must never be violated. The "why is this code doing this weird thing" answers. -->
<!-- Each rule: what it is, why it exists, what breaks if violated -->

1. **[Rule name]**: [Description] — *consequence of violation: [X]*
2. **[Rule name]**: [Description] — *consequence of violation: [X]*

## Key Entities
<!-- The main things the system deals with and how they relate -->

```
[Entity A]
  ├── has many [Entity B]
  └── belongs to [Entity C]

[Entity B]
  └── lifecycle: [state1] → [state2] → [state3]
```

### [Entity Name]
- **What it is**: [plain English]
- **Key fields**: [the ones that matter for business logic]
- **Lifecycle**: [states it moves through, if any]
- **Business rules that apply**: [ref to rules above]
- **In code**: `[src/models/...]`

## User Roles
| Role | Who they are | What they can do |
|------|-------------|-----------------|
| [Role] | [Description] | [Key permissions] |

## Regulatory / Compliance Context
<!-- Anything the code must do for legal or compliance reasons -->
<!-- Especially important for media (copyright), finance (FCA), healthcare (GDPR) -->

## Quirks
<!-- Things that will confuse a developer if they don't know -->
<!-- "Why does it do X?" — because [reason] -->

1. **[Quirk]**: [Explanation and what to watch for]

---

## Example: Reuters Editorial Workflow

### What This Business Does
Reuters is a global news agency. The editorial workflow service manages the
lifecycle of news articles from wire ingestion through editorial review to
distribution. Speed and accuracy are both critical — a wrong story published
fast is worse than a slow correct one.

### Key Terminology
| Term | Meaning | In Code |
|------|---------|---------|
| Wire | Raw news feed from a source agency | `src/ingestion/wire.ts` |
| Slug | Unique short identifier for a story (URL-safe) | `article.slug` |
| Embargo | Article must not publish until a specific timestamp | `article.embargoUntil` |
| Kill | Retract a published article immediately | `src/services/kill-order.ts` |
| Byline | Author credit | `article.byline` / `Contributor` model |
| Dateline | Where and when the story originated | `article.dateline` |

### Business Rules
1. **Embargo is absolute**: `embargoUntil` in the future = never expose, no exceptions,
   regardless of auth level — *consequence: legal liability, client contract breach*
2. **Kills are immediate**: status "killed" must reach distribution within 60s —
   *consequence: reputational damage, potential legal issues*
3. **Wire deduplication**: same story from multiple wires must deduplicate on
   `externalId` before ingestion — *consequence: duplicate articles distributed*

### Quirks
1. **Why is there both `status` and `publishedAt`?** Status drives the workflow.
   `publishedAt` is the timestamp for editorial records. They can diverge — a
   killed article has `publishedAt` set but status "killed".
