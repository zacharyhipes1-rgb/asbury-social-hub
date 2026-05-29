# /paid-handoff-creative-brief

## Scope

Two cross-functional additions that connect organic social to the paid media team and the creative production team:
1. Engagement-threshold paid amplification flag in /admin, with one-click export of caption, creative, audience seed, and UTM-ready link.
2. "Brief" field on /upload that captures campaign objective, audience, KPI, and optional paid budget so design/photo/video teams stop chasing scattered Asana/Slack threads.

Touches: /upload form (brief field), /admin queue (amp flag and export), submission model. Do not modify approval state machine.

## Context

- Today the hub has no bridge to paid media. High-performing organic posts that should be boosted are spotted by accident.
- Without a brief, every organic submission requires the design or video team to back into the marketer's intent. Time waste at scale.

## Required reading before any code change

1. Read /upload Step 5 to find the right place to add the brief panel.
2. Read /admin submission detail view layout.
3. Read the submission model.

## Implementation requirements

### Part 1 - Paid amplification flag and export

#### Engagement threshold rules

- Configurable per platform per dealership brand. Defaults (admins can override in /settings/paid-thresholds):
  - Instagram: engagement_rate > 5% in first 24h post-publish OR > 100 saves in first 48h
  - Facebook: engagement_rate > 3% in first 24h OR > 50 shares in first 48h
  - TikTok: > 50% completion rate AND > 1000 plays in first 24h
  - LinkedIn: > 2% engagement rate in first 48h
- A scheduled job runs hourly. For each post in `published` status within the threshold window, fetch latest insights from the relevant platform API. If thresholds met, set `paid_amp_eligible_at`.

#### Recommendation surfacing

- In /admin queue, filter `paid_amp_eligible`. Show a green "Amp eligible" pill on the row.
- Submission detail shows the engagement metrics that triggered eligibility and a "Recommend for paid amplification" button.

#### Export package

- Clicking the recommend button produces a CSV download AND posts to a configured paid-team Slack channel (uses /notifications-and-sla routing).
- CSV columns:
  - `submission_id`, `dealership_name`, `dealership_id`, `platform`, `creative_url` (Cloudinary), `creative_aspect_ratio`, `caption_resolved` (tokens resolved), `original_post_url`, `published_at`, `current_engagement_rate`, `current_impressions`, `current_clicks`
  - `recommended_audience_seed_url` (link to platform's Audience API JSON for the engaged-with audience over the past 30 days; described below)
  - `utm_template` (suggested UTM string for paid version: same as organic but `utm_medium = social-paid`)
- The "audience seed" is a generated JSON payload representing the people who engaged with this post (FB/IG Custom Audiences require this). For FB/IG: produce a Custom Audience seed via Marketing API based on `engagers_30d` of the page or post. For TikTok and LinkedIn: produce platform-specific equivalents.
- Persist the export event to the audit log.

#### Approval governance

- Recommendation does NOT automatically promote the post to paid. The paid team must manually create the campaign in their ad platform using the export.
- Add a `paid_amp_status` enum on the submission: `eligible`, `recommended`, `live`, `declined`, `expired`. Default `eligible` when threshold met. Set to `recommended` on export. The paid team can mark `live` or `declined` via /admin.

### Part 2 - Creative brief on submission

#### Form addition

- Add a collapsible "Brief" panel in /upload Step 5. Closed by default; expanded automatically when content_type is `event_promotion`, `new_model_launch`, `financing_offer`, `lease_special`.
- Fields (all optional except where noted):
  - `objective` enum (required when brief is expanded): `awareness`, `consideration`, `lead_generation`, `traffic_to_vdp`, `service_appointment`, `event_rsvp`, `inventory_movement`, `brand`
  - `target_audience` text (200 char max). Required for objectives other than `brand`.
  - `primary_kpi` enum: `reach`, `engagement_rate`, `clicks`, `leads`, `appointments_booked`, `vdp_views`, `event_rsvps`
  - `kpi_target_value` numeric (optional)
  - `paid_budget` numeric (optional; signals to paid team this post is pre-funded)
  - `paid_platform` multi-select (Meta, TikTok, LinkedIn, Google) - optional
  - `creative_notes` text (500 char max). Visible to design/video team.
  - `due_date` date (optional, for shoots/design dependencies)
  - `linked_campaign_id` (fk to campaigns table from /aeo-citation-and-branded-search; optional)

#### Brief visibility

- /admin submission detail shows the Brief panel below the caption.
- A new column `brief_complete` in /analytics scoreboard: % of submissions with a complete brief, per dealership.
- Posts without briefs are not blocked from approval but get a soft warning to the reviewer.

#### Creative team queue

- New `/briefs` route (Admin + Social Media + new role `Creative` if you choose to add one, but DO NOT add a new role in this command without explicit approval).
- For now, `Creative` access is granted via a per-user flag `can_access_briefs` settable in /users.
- /briefs lists submissions with a brief, filterable by `due_date`, `objective`, `dealership`, `assignee`. The team can comment on a brief (reuse the comments system from /permissions-queue-audit) without changing submission state.

#### Paid handoff connection

- When `paid_budget > 0` and `paid_platform` is set, the submission auto-tags `paid_amp_eligible_at = now()` at submit time (bypasses the engagement-threshold logic for pre-funded posts).
- The export package automatically uses the brief's `target_audience` text as a comment in the CSV for the paid team.

## Out of scope - do NOT

- Do NOT auto-create paid campaigns in any ad platform. Export only.
- Do NOT scrape engagement data; use official APIs.
- Do NOT add ad creative generation features.
- Do NOT change the existing role enum without an explicit user request.
- Do NOT modify the publish workflow timing.

## Acceptance criteria

- A published Instagram post with 6% engagement rate in 24h gets `paid_amp_eligible_at` set automatically.
- A user clicking "Recommend for paid amplification" downloads a CSV with the specified columns and posts a Slack notification.
- The CSV's `caption_resolved` field has all tokens resolved with the dealership's actual values.
- /upload Step 5 shows a Brief panel that expands automatically for `event_promotion` content type.
- Submitting a brief with `objective = lead_generation` but no `target_audience` is rejected.
- /briefs route lists submissions filtered by due_date and assignee.
- A post submitted with `paid_budget = 5000` is immediately `paid_amp_eligible`.
- Brief panel in /admin shows the captured fields read-only to reviewers and editable to the uploader before approval.

## Verification

- Mock Meta and TikTok engagement APIs in tests; assert threshold evaluation.
- Test CSV export shape against the spec column-by-column.
- Test audience seed generation produces valid JSON per platform.
- Manual smoke test: submit with a brief, verify it appears in /admin and /briefs.
