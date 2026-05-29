# /competitor-watch

## Scope

Add per-dealership competitor handle tracking that surfaces nearby dealers' posting cadence and themes alongside our own dealership's analytics. Touches: /settings (competitor configuration), /analytics (sidebar widget), new `/competitors` route for management. Do not interact with competitor posts (no liking, commenting, or scraping anything beyond public posts).

## Context

- Dealers in the same DMA compete heavily for the same buyers. Knowing what they post and when is table-stakes competitive intel.
- Implementation must use only platform-public data (page-level public posts via official APIs). No scraping.

## Required reading before any code change

1. Read /settings social account configuration UI pattern.
2. Read /analytics dealership detail view layout.
3. Confirm available scopes for public page data: Facebook Page Public Content Access (PCA) requires App Review approval, document this in /settings.
4. Note that Instagram Business Discovery API allows querying competitor Instagram Business accounts for their public posts.

## Required reading before any code change

(none additional)

## Implementation requirements

### 1. Competitor configuration

- New table `competitor_handles`:
  - `id`, `dealership_id`, `competitor_name`, `platform`, `handle_or_url`, `is_active`, `created_by`, `notes`
- Per dealership, up to 5 active competitors per platform (configurable maximum).
- /settings new "Competitor Watch" subsection per dealership: add/remove competitor handles.
- Validation: handle format per platform (FB page slug, IG @handle, TikTok @handle, LinkedIn company URL).

### 2. Sync

- Cron job runs daily per competitor:
  - Facebook: Page Public Content Access endpoint for public page posts in last 24h. Requires app to have PCA approved (warn user during setup that PCA review is required).
  - Instagram: Business Discovery API. Returns recent media for a public IG Business account.
  - TikTok: official API limited to first-party data; for competitor monitoring use TikTok Research API (requires academic/research approval) OR document this limitation and skip TikTok competitor monitoring in v1.
  - LinkedIn: Company page posts via Marketing API for pages the user administers; competitor pages typically NOT accessible. Skip LinkedIn competitor monitoring in v1.
- New table `competitor_posts`:
  - `id`, `competitor_handle_id`, `platform`, `external_post_id`, `posted_at`, `media_type`, `caption_excerpt` (first 280 chars), `engagement_proxy` (likes + comments + shares; only if public), `post_url`
- Store maximum 90 days of history; prune older rows.

### 3. /analytics sidebar widget

- On the dealership detail view, add a "Competitor Activity (Last 7 Days)" panel:
  - Per competitor: post count, average engagement proxy, themes detected (basic keyword clustering: top 5 nouns/topics per competitor).
  - Comparison chart: our dealership's post count vs each competitor's, last 30 days.
- No detail view of competitor posts on /analytics (keep summary level here).

### 4. /competitors route

- New page for Social Media and Admin roles, scoped to their `dealership_access`.
- For each of the user's dealerships, list competitors and recent posts in a chronological feed.
- Each post card: competitor name, posted at, media thumbnail (proxied through our server to avoid hotlinking issues; cache 7 days), caption excerpt, engagement, link to view on platform.
- Filter: platform, date range, competitor.
- "Save as inspiration" button: stores post URL + screenshot to the asset library tagged `competitor_inspiration` with metadata (rights_status = restricted; cannot be republished, view-only reference). Reuse asset library from /content-templates-and-asset-library with appropriate rights tagging.

### 5. Theme detection

- Lightweight server-side keyword clustering on competitor caption text. Use a basic TF-IDF approach over the last 30 days per competitor; surface top 10 terms above a frequency threshold.
- Display as a tag cloud in /competitors detail.
- Do NOT use LLMs for theme detection in v1 (cost vs value not justified at this scale).

### 6. Alerts

- New notification `competitor.high_engagement_post`: when a competitor post's engagement proxy exceeds 3x their trailing 30-day average AND > 100 engagements absolute, alert the dealership's assigned Social Media users.
- New notification `competitor.cadence_shift`: if a competitor's weekly post count changes by > 50% vs trailing 4 weeks, alert weekly digest only (not real-time).

## Out of scope - do NOT

- Do NOT scrape any platform. Use only official APIs.
- Do NOT engage with competitor content (no liking, commenting, follows).
- Do NOT store competitor follower counts or audience demographics (privacy and TOS risk).
- Do NOT track private accounts.
- Do NOT track competitor paid ads in this command (separate ad-intel command if needed).
- Do NOT use LLMs for theme detection in v1.
- Do NOT alert on individual competitor posts unless thresholds are met (avoid notification fatigue).

## Acceptance criteria

- Admin can add up to 5 competitor handles per platform per dealership in /settings.
- Daily sync populates `competitor_posts` for FB and IG within 24h of the competitor publishing.
- /analytics dealership detail shows the Competitor Activity panel with 7-day summary.
- /competitors route shows chronological feed of recent competitor posts.
- Saving a competitor post as inspiration creates an asset library entry with `rights_status = restricted`.
- A competitor post with 3x normal engagement and 150 total engagements triggers the high_engagement alert to the dealership's Social Media users.
- TikTok and LinkedIn competitor monitoring is documented as not supported in v1.

## Verification

- Mock Page Public Content Access endpoint in tests; assert correct ingest.
- Mock IG Business Discovery API; assert correct upsert by external_post_id.
- Test theme detection on a sample corpus; assert top terms surface correctly.
- Manually verify in /settings that adding a competitor with bad handle format fails validation.
