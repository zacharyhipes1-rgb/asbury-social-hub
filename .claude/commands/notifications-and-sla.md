# /notifications-and-sla

## Scope

Replace the email-only notification system with multi-channel routing (Email via existing EmailJS, plus Slack and Microsoft Teams webhooks) and add automated SLA escalation against the 12h review target shown on the dashboard. Touches: /settings notification config, server-side event dispatcher, /admin queue (escalation badges). Do not change the underlying state transitions or audit log.

## Context

- Live reference: https://asbury-social-hub.vercel.app/settings shows EmailJS as the only notification channel ("Not configured") and a Notification Log full of `new_upload` events with no actual emails sent.
- Dashboard shows "11h Avg. Review Time, Target: < 12h" but nothing actively enforces or escalates against the target.
- The DSC team is small (3 admins, 2 social specialists, 2 viewers per /users); high-noise notifications will get ignored. Routing precision matters.

## Required reading before any code change

1. Read /settings page and the EmailJS config component.
2. Read the existing notification dispatcher (where `new_upload` events are written to the log). Identify the event types currently emitted.
3. Read the audit log table from `/permissions-queue-audit` - escalations should write there too.
4. Read the user role and dealership_access model.

## Implementation requirements

### 1. Channel configuration in /settings

- Keep EmailJS section as-is.
- Add "Slack Notifications" section: incoming webhook URL field, "Send test message" button.
- Add "Microsoft Teams Notifications" section: incoming webhook URL field, "Send test message" button.
- All three channels are optional. The dispatcher routes to whichever are configured.

### 2. Event types (closed list)

These are the events that can fire notifications. The dispatcher must check each user's `notification_preferences` per event type per channel.

- `submission.created` - someone uploaded a new post
- `submission.compliance_blocked` - compliance engine returned at least one block flag
- `submission.compliance_warned` - compliance engine returned only warn flags
- `submission.approved`
- `submission.flagged_for_revision` - includes the revision reason
- `submission.published`
- `submission.publish_failed` - platform API returned an error
- `submission.sla_warning` - submission pending > 8h
- `submission.sla_breach` - submission pending > 12h
- `submission.sla_critical` - submission pending > 18h
- `inventory_feed.sync_failed` (from /gbp-and-inventory-integrations)
- `gbp.token_expiring` - GBP OAuth token within 7 days of expiry
- `compliance.rule_disabled` - admin toggled a rule off (audit signal)

### 3. Per-user notification preferences

- New table `user_notification_preferences`:
  - `user_id`, `event_type`, `channel` (email | slack | teams | in_app), `enabled` boolean.
- Default routing matrix (seed this for existing users):
  - Admin role: in_app + email for all events except `submission.created` (in_app only).
  - Social Media role: in_app + email for `submission.flagged_for_revision`, `submission.published`, `submission.publish_failed` where they were the uploader.
  - View Only role: no notifications.
- Add a `/settings/notifications` subpage per user (not per dealership) where users edit their own preferences.

### 4. Routing rules

- Slack and Teams routing uses channels per dealership group, not per user. Add a `notification_routing` table:
  - `id`, `event_type`, `scope` (`all` | `brand` | `dealership`), `scope_value` (e.g. `BMW` or `coggin-bmw`), `channel`, `webhook_target_label` (free text for the destination channel name).
- Slack/Teams messages include the audit-safe summary (no PII beyond the user's name).
- In-app notifications appear in a bell icon dropdown in the header.

### 5. Message templates

- Create `/lib/notifications/templates/` with one file per event_type per channel. Templates use a minimal handlebars-style interpolation.
- Slack template example for `submission.flagged_for_revision`:
  ```
  :warning: *Revision requested*
  *Dealership:* {{dealership_name}}
  *Platform:* {{platform}}
  *Uploaded by:* {{uploader_name}}
  *Reason:* {{revision_reason}}
  <{{admin_url}}|View in queue>
  ```
- Email templates are HTML; keep them simple (no images, semantic HTML for accessibility).
- Teams uses Adaptive Cards JSON.
- Never include the full caption in notifications; link back instead. Caption text may contain compliance violations or PII.

### 6. SLA escalation

- A cron job runs every 15 minutes:
  - Find all submissions in `pending` status with `created_at + 8h < now` and no `sla_warning_sent_at` -> fire `submission.sla_warning`, set `sla_warning_sent_at`.
  - Find pending submissions where `created_at + 12h < now` and no `sla_breach_sent_at` -> fire `submission.sla_breach`, set `sla_breach_sent_at`.
  - Find pending submissions where `created_at + 18h < now` and no `sla_critical_sent_at` -> fire `submission.sla_critical`, set `sla_critical_sent_at`. The critical event escalates to ALL admins regardless of preferences.
- Escalations target: the dealership's assigned reviewers (users with `dealership_access` including that dealership and role Admin or Social Media). If no scoped reviewer exists, route to all Admins.
- In /admin queue, add a visual badge per row:
  - amber clock icon when `sla_warning_sent_at` is set
  - red clock when `sla_breach_sent_at` is set
  - red pulsing when `sla_critical_sent_at` is set
- Once a submission transitions out of pending, badges clear automatically.

### 7. Rate limiting / digest

- The same recipient cannot receive more than 1 Slack/Teams message per event_type per 5 minutes (prevent storms during bulk uploads).
- If more than 10 events of the same type fire within 5 minutes to the same channel, send a digest: "12 new submissions in the last 5 minutes. View queue."

### 8. Notification log

- Replace the current /settings notification log with a queryable view: filter by event_type, channel, status (sent/failed/logged-only), date range.
- Log every dispatch attempt (success and failure) including the response from Slack/Teams/EmailJS for debugging.

## Out of scope - do NOT

- Do NOT add SMS notifications.
- Do NOT add Discord, Mattermost, or other chat platforms beyond Slack and Teams.
- Do NOT add notification preferences per dealership per user (too granular; per user only).
- Do NOT auto-resolve SLA breaches via auto-approve; manual review only.
- Do NOT integrate with PagerDuty or incident management systems.
- Do NOT add a "Snooze" feature in this command.
- Do NOT modify the EmailJS template format that already exists.

## Acceptance criteria

- /settings shows Slack and Teams webhook fields with "Send test message" buttons that work.
- An admin user with default preferences receives email + in-app notification when a submission is flagged.
- A Social Media user uploading a post does NOT receive `submission.created` notifications about their own upload.
- A pending submission older than 8 hours triggers `submission.sla_warning` exactly once, fires to the right Slack channel, and shows amber badge in /admin.
- A pending submission older than 12 hours triggers `submission.sla_breach`.
- A pending submission older than 18 hours triggers `submission.sla_critical` to all Admins.
- 15 submissions uploaded within 1 minute trigger a digest message, not 15 individual messages.
- Notification log shows the full dispatch history with response payloads.
- A user can edit their own notification preferences in /settings/notifications and changes persist.

## Verification

- Mock Slack and Teams webhook endpoints in tests; assert correct payload structure.
- Time-travel tests for SLA escalation thresholds (use a frozen clock).
- Manual smoke test: create a submission, wait through threshold or fast-forward, verify each escalation fires once.
- Verify rate limiting by submitting 30 events in 1 minute; assert only 1 message per recipient per event_type plus 1 digest.
