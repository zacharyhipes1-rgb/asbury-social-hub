# /optional-experiments

## Scope

Two lower-priority experiments grouped for batched implementation:
1. Caption A/B variants at submission time.
2. Monthly content shoot planner.

Both are optional and should be implemented after all other commands ship. Do not bundle either with required functionality.

## Context

- A/B testing captions is a workaround for the lack of native social A/B on most platforms.
- A shoot planner closes the loop between marketing intent and creative production for groups operating photographers/videographers across many locations.

## Required reading before any code change

1. Read /upload Step 5 caption field.
2. Read submission state machine and publish workflow.
3. Read /content-templates-and-asset-library output for asset metadata patterns.

## Implementation requirements

### Part 1 - Caption A/B variants

#### Submission model

- Add fields:
  - `caption_b` text (nullable)
  - `ab_test_enabled` boolean (default false)
  - `ab_test_mode` enum: `random_assignment` (each impression sees A or B 50/50; not possible on most platforms, used only for GBP), `sequential` (publish A first, B second after delay), `disabled`
  - `ab_test_winner` enum: `a`, `b`, `inconclusive`, `pending` (auto-determined after the test window)
- Only one variant field; no support for 3+ variants in v1.

#### /upload UI

- Add "Test caption variant" toggle in Step 5.
- When enabled: a second caption field appears. Both must pass compliance and validation. Both share the same tokens.
- Mode selection radio:
  - `sequential` (default): A publishes at scheduled time, B publishes 7 days later to the same audience. Comparison after 7 days post-B.
  - `random_assignment`: available only when platform = GBP (which supports separate posts with random distribution; or simulate via the platform's own A/B if supported).
- Show a small note: "A/B sequential testing is best for evergreen content; do not use for time-sensitive offers."

#### Publish workflow

- For `sequential`: schedule A at original time, queue B at `scheduled_at + 7 days`. Persist both in submission record.
- Each variant publishes independently and stores its own `external_post_ids`.
- Both variants link back to the parent submission for analytics.

#### Winner determination

- 7 days after B publishes, compare engagement rate (engagements / impressions) using each platform's insights API.
- Statistical significance: require min 1000 impressions per variant AND > 20% relative difference to declare winner. Else mark `inconclusive`.
- Store winner in `ab_test_winner`. Surface in /analytics under "A/B Test Results" view.

#### Analytics

- New page `/analytics/ab-tests`: list all tests with: dealership, platform, A vs B captions excerpt, A engagement rate, B engagement rate, winner, significance.
- Aggregate "Winning caption patterns" panel: group winners by caption length bucket, emoji presence, CTA style, and surface insights ("Captions under 80 chars win 67% of tests").

### Part 2 - Monthly content shoot planner

#### Data model

- New table `shoots`:
  - `id`, `dealership_id`, `scheduled_date`, `time_window`, `photographer_user_id` (or external contact ID), `videographer_user_id`, `status` enum (`requested`, `scheduled`, `completed`, `canceled`), `notes`
- New table `shot_list_items`:
  - `id`, `shoot_id`, `intent` (matches content template intent enum), `description`, `required_assets` (e.g. "10 photos of red 2026 Civic LX, exterior + interior + dashboard"), `status` (`pending`, `captured`, `delivered`), `linked_asset_ids` (asset library IDs after delivery)
- New table `external_contacts`:
  - `id`, `name`, `email`, `phone`, `role` (`photographer`, `videographer`, `editor`), `company`, `notes`, `is_active`

#### /shoots route

- Admin and users with `can_access_briefs` flag (from /paid-handoff-creative-brief) can view.
- Calendar view of upcoming shoots per dealership.
- List view: filter by date range, dealership, status.

#### Request a shoot flow

- "Request shoot" button in /shoots and on each dealership detail.
- Form fields: dealership (auto if from detail view), desired date range, intent, shot list (multi-add), notes, suggested photographer/videographer.
- On submit, status = `requested`. Notification to Admin role for scheduling.

#### Scheduling

- Admin can edit a requested shoot to set `scheduled_date`, assign photographer/videographer (from external_contacts), and confirm. Status moves to `scheduled`.
- Sync to a calendar feed (ICS export per dealership) for the assigned photographer.

#### Delivery flow

- After shoot, photographer/videographer (or Admin on their behalf) uploads assets via existing /assets upload flow, tagging the shoot_id.
- Shot list items auto-link to delivered assets via tag match. Manual override available.
- When all shot list items have `status = delivered`, shoot status auto-moves to `completed`.

#### Recurring shoots

- Optional "Make recurring monthly" toggle. Generates a request 30 days out, repeats indefinitely until canceled.

## Out of scope - do NOT

- Do NOT integrate with external scheduling tools (Calendly, Acuity) in v1.
- Do NOT integrate with photographer's CRM/billing.
- Do NOT auto-generate A/B caption variants via LLM.
- Do NOT support more than two A/B variants.
- Do NOT push A/B insights as auto-applied rules; surface as analytics only.

## Acceptance criteria

- A/B: submitting a post with `ab_test_enabled = true` and mode `sequential` schedules two publishes 7 days apart.
- After 7 days post-B, winner is determined per criteria and stored.
- /analytics/ab-tests lists tests with both variants visible.
- Shoots: requesting a shoot from a dealership detail page creates a row with status `requested` and notifies Admins.
- Admin can convert requested to scheduled by setting date and photographer; ICS export contains the event.
- Uploading an asset tagged with a shoot_id auto-links to a matching shot list item.
- Shoot status auto-completes when all shot list items deliver.

## Verification

- Mock platform insights APIs for A/B winner determination.
- Test sequential publish scheduling produces correct future dates.
- Test ICS export validity using an ICS parser library.
- Manual test of full shoot lifecycle: request -> schedule -> deliver -> complete.
