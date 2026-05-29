# /upload-flow-overhaul

## Scope

Modify ONLY the `/upload` route (5-step submission wizard) and its supporting data layer. Add: (1) automatic UTM parameter generation on all links inside captions, (2) per-dealership token resolution at submit time, (3) platform-specific validation guardrails, (4) inline access to relevant /tools utilities at the right step. Do not touch /admin, /calendar, /analytics, /assets, /tools, /users, or /settings except where explicitly required for shared data structures.

## Context

- Live reference: https://asbury-social-hub.vercel.app/upload
- Current state: 5 steps (Dealership, Platform, Content Type, Upload, Details). Step 5 has a free-text caption field with no validation, no UTM handling, no token system.
- This is the highest-leverage change because every downstream measurement and personalization feature depends on it.

## Required reading before any code change

1. Read `package.json` to confirm framework (Next.js App Router assumed) and ORM.
2. Read the entire `/app/upload/` directory (or `/pages/upload/` if Pages Router). Identify each step component, the form state manager, and the submit handler.
3. Read the dealership data model. Confirm which fields exist per dealership (name, city, state, address, phone, hours, financing_partner, etc.). If any of the token fields below are missing from the schema, add them in a separate migration with sensible defaults pulled from `/upload` and `/settings` UI.
4. Read the submission data model. Confirm the caption field, scheduled_at, dealership_id, platform, content_type, asset URLs.
5. Inspect any existing utility helpers in `/lib/` or `/utils/` before writing new ones.

## Implementation requirements

### 1. UTM enforcement

- Create `lib/utm.ts` exporting `buildUtm({platform, dealershipSlug, scheduledAt, postId, paid})`.
- UTM rules (use these exact values, do not invent variants):
  - `utm_source` = `facebook` | `instagram` | `tiktok` | `linkedin` | `gbp`
  - `utm_medium` = `social-organic` (default) or `social-paid` (when `paid` is true)
  - `utm_campaign` = `{dealership_slug}_{YYYYMM}_{auto_theme_or_custom}` where `YYYYMM` is derived from `scheduledAt`. Theme defaults to `general` if not provided.
  - `utm_content` = the post UUID/ID
  - `utm_term` = leave empty
- On submission, the server-side handler must scan the caption for any URL (http/https), append the UTM string with `&` if a query exists or `?` if not, and idempotently re-apply (do not double-append on edit).
- Use the `URL` API for parsing. Do not use regex-only URL detection that breaks on trailing punctuation.
- If a link already contains a `utm_source` parameter, REPLACE the existing UTMs entirely rather than appending. Log the replacement to the audit trail (see `/permissions-queue-audit`).
- Add a `utm_preview` field to the submission detail view so the reviewer in /admin can see the resolved URL.

### 2. Localization tokens

- Supported tokens (closed list, do not add others without an additional command):
  - `{{dealership_name}}`
  - `{{city}}`
  - `{{state}}`
  - `{{phone}}`
  - `{{address}}`
  - `{{service_hours}}`
  - `{{financing_partner}}`
  - `{{brand}}` (Honda, BMW, Lexus, Acura, Toyota, Corporate)
- Resolution happens server-side at publish time, NOT at submit time. Store the unresolved caption with tokens intact so cloning across dealerships works correctly.
- Add a live preview panel in Step 5 that shows the resolved caption for the first selected dealership only.
- If a token is unknown or unresolved, fail validation at submit with a specific error pointing to the line. Do not silently strip.

### 3. Platform-specific validation (Step 5 client + server)

Validate both in the browser (instant feedback) AND on the server (authoritative). Use the actual platform limits below, do not round or guess.

| Platform | Caption max chars | Aspect ratios accepted | Video max length |
|---|---|---|---|
| Instagram Feed | 2,200 | 1:1, 4:5, 1.91:1 | 60s (Reel: 90s) |
| Instagram Reel | 2,200 | 9:16 | 90s |
| Instagram Carousel | 2,200 | 1:1 or 4:5 (all slides must match) | n/a |
| Facebook | 63,206 (recommend < 280) | 1:1, 4:5, 9:16, 16:9 | 240 min |
| Facebook Reel | 2,200 | 9:16 | 90s |
| TikTok | 2,200 | 9:16 | 600s (10 min) |
| LinkedIn Post | 3,000 | 1:1, 1.91:1, 9:16 | 10 min |
| LinkedIn Article | 110,000 | n/a | n/a |

- Show a live character counter per platform (when multiple platforms selected, show the most restrictive count).
- Reject upload at Step 4 if file dimensions do not match an accepted aspect ratio for the chosen platform/content type. Use `image-size` (npm) for images and `ffprobe-static` for video metadata. Run server-side; do not trust client.
- Require alt text for any Instagram image submission. Inline field appears at Step 5 when platform = instagram.
- For video submissions, generate and display a first-frame thumbnail in Step 5 so the uploader can confirm the hook frame. Use server-side ffmpeg via `fluent-ffmpeg`.

### 4. Inline tool integration (no new tool code, just routing)

- When a LinkedIn Article is detected at Step 3, expand a `SerpPreview` panel at Step 5 using the existing SERP Preview component from `/app/tools/`. Pass title + description fields.
- When the content type includes an Event (Step 3), expand a `SchemaGenerator` panel at Step 5 (created in `/seo-health-and-schema` command - if not yet built, render a placeholder with a comment `// TODO: wire after /schema-and-tools-integration ships`).
- When ANY caption contains a URL, run the UTM Builder utility automatically (no UI needed) and surface the result in `utm_preview`.

## Out of scope - do NOT

- Do NOT modify the calendar drag-and-drop logic in /calendar.
- Do NOT change the approval state machine in /admin.
- Do NOT add new platforms beyond Facebook, Instagram, TikTok, LinkedIn (GBP is added in `/gbp-and-inventory-integrations`).
- Do NOT introduce a new state management library (use whatever the project already uses).
- Do NOT add analytics events for now; that is a separate command.
- Do NOT change the dealership selection step 1 multi-select behavior.
- Do NOT add AI caption generation features.
- Do NOT change the database from its existing engine.

## Acceptance criteria

- Submitting a post with a URL in the caption results in the URL having all required UTM parameters when viewed in /admin.
- Editing a post with already-UTM'd URLs replaces the UTMs cleanly and logs the change.
- Submitting a post containing `{{dealership_name}}` to 3 dealerships at once produces 3 stored submissions, each with the token intact, and 3 published payloads with the token resolved per dealership.
- Uploading a 1080x1080 image with platform = Instagram Reel is rejected with a clear "Instagram Reel requires 9:16 aspect ratio" error.
- Uploading a 2:10 caption character count appears next to the field, decrementing live as the user types, and turns red when exceeded.
- Video submissions show a generated first-frame thumbnail before the user clicks Submit.
- An Instagram submission without alt text fails server-side validation with a 422 and a specific error message.
- An unknown token like `{{vehicle_special}}` fails validation at submit with "Unknown token: {{vehicle_special}}".

## Verification

- Add unit tests for `buildUtm` covering: no existing query, existing query, existing UTM (must replace), trailing punctuation, multiple URLs in one caption.
- Add an integration test that submits to 3 dealerships and asserts 3 distinct resolved captions on publish.
- Run `npm run build` and `npm run typecheck` before considering done.
