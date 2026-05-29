# /permissions-queue-audit

## Scope

Modify ONLY (1) the User model and `/users` admin page, (2) the `/admin` approval queue, and (3) add an immutable audit log table. Add dealership-scoped permissions, working bulk operations in the queue, and a complete edit/state-change history per submission. Do not change the submission upload flow, calendar, or settings.

## Context

- Live references: https://asbury-social-hub.vercel.app/users and https://asbury-social-hub.vercel.app/admin
- Current /users shows 3 roles (Admin, Social Media, View Only) with no dealership scoping. Rikki Niblett and Ben Mcdaniel are listed as "DSC Social Specialist" but have access to all 15 demo dealerships.
- Current /admin has checkboxes on each row but no visible bulk action bar.
- There is no edit history view today.

## Required reading before any code change

1. Read the User model and any related auth middleware. Identify where role checks happen today.
2. Read `/app/admin/page.tsx` and any sub-components for the queue table.
3. Read the Submission model and its state transitions (pending, approved, flagged, published, deleted).
4. Inspect any existing logging or activity tables. If none exist, you will create one.

## Implementation requirements

### 1. Dealership-scoped permissions

- Add to User model:
  - `dealership_access: string[]` (array of dealership IDs/slugs). NULL or empty array means "no scope set yet".
  - `dealership_scope_mode: 'all' | 'specific'` (default `'specific'` for new users, `'all'` for Admin).
- Update auth middleware so every read/write to a Submission checks the requester's `dealership_access` against the submission's `dealership_id`. Admin role bypasses scope check ONLY if `dealership_scope_mode = 'all'`.
- /upload Step 1 must filter the dealership selector to the user's scoped list. If scope is empty and user is not Admin, show a clear "No dealerships assigned. Contact your admin." message and disable submit.
- /admin queue must filter to scoped dealerships server-side, not client-side. Do not return out-of-scope rows.
- /analytics must filter the scoreboard to scoped dealerships.
- /calendar must filter rows to scoped dealerships.
- /users page UI: add a dealership multi-select on each user row, gated to Admins only.

### 2. Bulk operations in /admin queue

- Render a sticky action bar at the top of the table that appears when 1+ checkbox is selected. Bar shows: count selected, "Bulk Approve", "Bulk Flag", "Bulk Schedule", "Bulk Clone", "Bulk Delete".
- Bulk Approve: requires a single confirmation modal. Applies the approve transition to all selected. Logs each transition individually to the audit table.
- Bulk Flag: opens a modal requiring a `revision_reason` text field (min 10 chars). The same reason applies to all selected.
- Bulk Schedule: opens a date+time picker. Sets `scheduled_at` for all selected. Validate that the chosen time is in the future.
- Bulk Clone: opens a dealership multi-select (scoped to user's accessible dealerships). Creates N new submissions per source, copying caption (tokens intact), platform, content_type, asset URLs, scheduled_at. Resets status to `pending`. Sets `cloned_from_id` on each new submission.
- Bulk Delete: requires typed confirmation ("DELETE" must be typed). Soft-delete only; flip `deleted_at` rather than removing rows.
- Disable any action that is invalid for the current selection (e.g. cannot Approve already-published items). Show a tooltip explaining why.

### 3. Audit trail

- Create table `submission_audit_log`:
  - `id` (uuid)
  - `submission_id` (fk)
  - `actor_user_id` (fk)
  - `event_type` enum: `created`, `edited`, `state_changed`, `bulk_cloned`, `bulk_deleted`, `utm_replaced`, `compliance_flagged`, `comment_added`
  - `before` jsonb (diff target state, nullable for `created`)
  - `after` jsonb (diff resulting state, nullable for `bulk_deleted`)
  - `metadata` jsonb (e.g. revision_reason, source IP, user agent)
  - `created_at` timestamp
- Every state transition, edit, or bulk action MUST insert a row. No exceptions.
- Audit rows are append-only. Never UPDATE or DELETE.
- Add a "History" tab to the submission detail view in /admin. Render a chronological timeline: actor avatar/name, event type, human-readable diff (use a diff library like `deep-diff`), timestamp with relative time + absolute hover.
- Permissions: only Admin role can view audit history. Social Media and View Only do not see the History tab.

### 4. Inline review notes (lightweight, in scope)

- Add a `comments` table tied to submission_id. Each comment: actor, body, created_at, optional `field_anchor` (e.g. "caption", "scheduled_at") so reviewers can leave specific feedback.
- Render comments in the submission detail view above the History tab.
- Posting a comment also writes to the audit log as `comment_added`.

## Out of scope - do NOT

- Do NOT change the existing approve/flag/publish state machine logic; only wrap it with audit logging.
- Do NOT add real-time presence indicators or live cursors.
- Do NOT add notifications here (that ships in `/notifications-and-sla`).
- Do NOT add a custom permission system beyond the three existing roles plus dealership scoping. No new roles.
- Do NOT touch the EmailJS or Cloudinary config in /settings.
- Do NOT add hard deletes anywhere.

## Acceptance criteria

- A user with `dealership_access = ['nalley-honda']` and `dealership_scope_mode = 'specific'` cannot see Coggin BMW submissions in /admin, /analytics, or /calendar.
- The /upload dealership picker for the same user shows only Nalley Honda.
- Selecting 5 pending submissions in /admin and clicking Bulk Approve transitions all 5 and creates 5 audit log rows with `event_type = state_changed`.
- Bulk Clone selecting 3 source submissions and 4 target dealerships creates 12 new pending submissions.
- Bulk Delete requires typing "DELETE" and uses soft-delete (`deleted_at` set, row preserved).
- The History tab on a submission detail shows every prior change with actor, timestamp, and a readable diff.
- An attempt to UPDATE a row in `submission_audit_log` from the application code fails (DB-level constraint or repo-level guard).
- A Social Media user viewing a submission detail does NOT see the History tab.

## Verification

- Write integration tests for the auth scope filter at the queue, calendar, and analytics endpoints.
- Write tests asserting audit log rows on each state transition.
- Manually verify the bulk action bar appearance and disabled states by selecting various combinations of statuses.
