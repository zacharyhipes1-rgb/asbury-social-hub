# Asbury Social Hub - Claude Code Commands

Drop these `.md` files into `.claude/commands/` in the social hub repo. Each filename becomes a slash command (e.g. `upload-flow-overhaul.md` is invoked as `/upload-flow-overhaul`).

## Build order

Run in this order. Later commands assume earlier ones have shipped.

### Phase 1 - Foundation (do first)
1. `/upload-flow-overhaul` - UTM enforcement, localization tokens, platform-specific validation, inline tool integration
2. `/permissions-queue-audit` - Dealership-scoped user permissions, bulk queue actions, audit trail per post
3. `/compliance-precheck` - FTC + OEM advertising rule engine at submission

### Phase 2 - Content systems
4. `/content-templates-and-asset-library` - Reusable post templates by intent and OEM, structured asset library with rights metadata
5. `/gbp-and-inventory-integrations` - Google Business Profile posting + live inventory feed pull at submission
6. `/notifications-and-sla` - Slack and Teams webhooks, automated SLA escalation

### Phase 3 - SEO / AEO
7. `/seo-health-and-schema` - Per-dealership location page health dashboard, schema generator, /tools as plumbing
8. `/aeo-citation-and-branded-search` - Scheduled LLM query tracker, GSC branded search correlation
9. `/review-velocity-and-inbound-inbox` - GBP review velocity widget, unified inbound social inbox

### Phase 4 - Cross-role and UX
10. `/paid-handoff-creative-brief` - Engagement-threshold paid amp flag, creative brief field on submission
11. `/calendar-views-and-mobile-pwa` - Monthly/quarterly calendar with OEM tentpole overlay, mobile-first PWA conversion
12. `/localization-spanish-hashtags` - Spanish caption variant pipeline, per-DMA hashtag intelligence
13. `/competitor-watch` - Per-dealership DMA competitor handle tracking

### Phase 5 - Optional experiments
14. `/optional-experiments` - Caption A/B variants, monthly content shoot planner

## Guardrail conventions used in every command

- Every command starts with **Scope** so the agent does not scope-creep.
- Every command lists **Required reading** so the agent inspects existing patterns before writing code.
- Every command has an explicit **Out of scope - do NOT** list.
- Every command ends with **Acceptance criteria** that can be verified against the live site.
- The live reference URL `https://asbury-social-hub.vercel.app/` is the source of truth for current behavior.

## Tech stack assumption

These commands assume a Next.js (App Router) + React + TypeScript codebase with a relational DB (Postgres via Prisma or Drizzle is common for Vercel apps). The agent should inspect `package.json` first and adapt patterns to the actual stack. Commands tell the agent to do this explicitly.
