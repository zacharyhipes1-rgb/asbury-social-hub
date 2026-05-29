# /review-velocity-and-inbound-inbox

## Scope

Two reactive/response capabilities:
1. GBP review velocity widget on /analytics per dealership.
2. Unified inbound inbox covering Facebook comments, Instagram comments and DMs, Google reviews, and TikTok comments.

Touches: /analytics (add review widget), new `/inbox` route, /settings (add per-dealership review response routing). Do not modify the submission/approval flow.

## Context

- Currently the hub is one-way (outbound only). 175+ dealerships need centralized triage of inbound social signals.
- Review response speed is a confirmed local pack ranking factor (Whitespark Local Search Ranking Factors 2024) and affects CSI scores tracked by OEMs.
- This command assumes GBP OAuth from /gbp-and-inventory-integrations is in place; Facebook and Instagram OAuth scopes will be added here.

## Required reading before any code change

1. Read /analytics page to understand the scoreboard component pattern.
2. Read /settings social account connection UI.
3. Read /gbp-and-inventory-integrations command output for GBP OAuth implementation.
4. Confirm Facebook and Instagram permissions needed: `pages_read_engagement`, `pages_manage_engagement`, `instagram_basic`, `instagram_manage_comments`.

## Implementation requirements

### Part 1 - GBP review velocity widget

#### Data model

- New table `gbp_reviews`:
  - `id`, `dealership_id`, `gbp_review_id`, `reviewer_name`, `star_rating` (1-5), `review_text` (nullable), `created_at`, `updated_at`, `replied_at`, `reply_text`, `replied_by_user_id`
- New table `gbp_review_metrics_snapshots` (weekly rollup): `dealership_id`, `week_start`, `new_reviews_count`, `avg_rating_30d`, `avg_rating_90d`, `response_rate_30d`, `avg_response_time_hours_30d`

#### Sync

- Cron job pulls each dealership's GBP reviews via Business Profile API every 30 minutes.
- Upsert by `gbp_review_id`. Detect new reviews (insert) and updated reviews (e.g. owner reply added externally).

#### /analytics widget

- New column block in the dealership scoreboard:
  - `NEW REVIEWS (7d)`
  - `AVG RATING TREND (30d)` - shows current avg and delta vs prior 30 days
  - `RESPONSE RATE (30d)`
  - `AVG RESPONSE TIME (30d)`
- Color coding: response rate < 80% amber, < 50% red; avg response time > 24h amber, > 48h red.
- Click a cell to open the dealership's review list inside /inbox (filtered).

### Part 2 - Unified inbound inbox

#### Data model

- New table `inbox_items`:
  - `id`, `dealership_id`, `source` enum (`facebook_comment`, `facebook_message`, `instagram_comment`, `instagram_dm`, `gbp_review`, `tiktok_comment`), `external_id`, `author_name`, `author_external_id`, `body`, `attachments` jsonb, `received_at`, `parent_post_external_id` (nullable; for comments)
  - `status` enum (`unread`, `read`, `replied`, `archived`, `escalated`)
  - `assigned_to_user_id` (nullable)
  - `sentiment` enum (`positive`, `neutral`, `negative`, `unknown`) - populated by a simple model server-side
  - `replied_at`, `reply_body`, `replied_by_user_id`, `reply_external_id`
- New table `inbox_threads` for grouping conversation context where applicable (DMs, comment threads).

#### Polling and sync

- FB/IG comments: poll page-level Graph API every 5 minutes per connected dealership. Filter to comments on posts owned by the page.
- IG DMs: poll every 5 minutes. Requires Instagram Business account; warn if dealership has a Creator account (which lacks DM API access).
- GBP reviews: reuse the 30-minute sync from Part 1; also populate inbox_items.
- TikTok comments: poll Business API every 15 minutes per connected dealership.
- All sync errors logged; consecutive failures trigger `inbox.sync_failed` notification.

#### Sentiment classification

- Use a lightweight server-side classifier. Options in priority order:
  - Local model via `@xenova/transformers` running DistilBERT sentiment (no API cost, fast)
  - Fallback to OpenAI/Anthropic if local model fails to load
- Run on insert. Re-classify on edit only if body changed.
- Sentiment is advisory; do not auto-action based on it.

#### /inbox UI

- Three-pane layout (desktop): filter sidebar / item list / detail+reply.
- Filters:
  - Dealership (multi-select, scoped to user's `dealership_access`)
  - Source (multi-select)
  - Status (default: unread)
  - Sentiment
  - Assigned to (me, unassigned, anyone)
  - Date range
- Item card shows: source icon, dealership badge, author name + avatar, body excerpt, received time relative, sentiment pill, parent post link if applicable.
- Detail pane: full body, attachments, conversation history if thread, parent post preview, suggested replies (rule-based templates only; no AI generation in v1).
- Reply box: rich text disabled (platforms strip it anyway), character counter per platform's limit, "Send" requires confirmation if reply contains numbers (prevent accidental phone/price typos).
- Mark as: replied (auto on send), archived, escalated (sets status and notifies assigned manager).

#### Reply governance

- Replies for GBP reviews must follow a per-OEM playbook (some OEMs require approved language for service issues). Add `requires_review` flag per source; when true, the reply is queued in /admin for second-eye approval before sending to the platform.
- Configurable per dealership in /settings: which sources require review.
- All replies are logged to the audit trail.

#### Assignment and SLA

- New incoming items default to unassigned.
- Admins can assign items to specific Social Media users (scoped to that user's dealership_access).
- SLA per source (default, configurable in /settings):
  - GBP review: 4h response target
  - Facebook/Instagram comment: 8h
  - DM: 2h
  - TikTok comment: 12h
- SLA breaches trigger `inbox.sla_breach` (route via /notifications-and-sla).

#### /inbox bulk operations

- Mark multiple items as read, archived, or assigned.
- Bulk reply with template (template library reuses /content-templates-and-asset-library schema, restricted to `intent = response`).

## Out of scope - do NOT

- Do NOT use AI to auto-generate replies in this command.
- Do NOT add Twitter/X or YouTube inbox in v1.
- Do NOT add deletion of inbound items.
- Do NOT add bulk delete of platform comments (governance risk).
- Do NOT include private message attachments larger than 10 MB in storage; reference platform URLs.
- Do NOT scrape any platform; only use official APIs.

## Acceptance criteria

- /analytics scoreboard shows the four new review metrics per dealership.
- A new GBP review appears in /inbox within 5 minutes of being posted (sync interval).
- An IG comment on a dealership-owned post appears in /inbox within 10 minutes.
- Replying to a GBP review from /inbox publishes the reply to GBP via API and records `replied_at`, `reply_body`, `replied_by_user_id`.
- Items with `requires_review = true` queue for second-eye approval before publish.
- A 5h unaddressed GBP review fires `inbox.sla_breach` to the assigned reviewer.
- A Social Media user with `dealership_access = ['nalley-honda']` only sees Nalley Honda items in /inbox.
- Bulk archive of 10 items moves all 10 to archived status.

## Verification

- Mock FB/IG/GBP/TikTok APIs in tests; assert correct sync upsert behavior.
- Integration test for SLA escalation timing.
- Manual smoke test: post a test review on a sandbox GBP location, verify ingest and reply round-trip.
- Verify dealership scoping in /inbox.
