# /aeo-citation-and-branded-search

## Scope

Two related SEO measurement features:
1. Scheduled tracker that runs a defined query set per dealership market across Perplexity, ChatGPT, Google AI Overviews, and Claude, logging which entities are cited.
2. Branded search correlation that pulls Google Search Console branded query data per dealership and correlates lift with published social campaigns.

Touches: new `/aeo` route, new `/aeo/queries` admin area, integration with /seo-health from `/seo-health-and-schema`. Do not modify the social submission flow.

## Context

- Live reference: https://asbury-social-hub.vercel.app/tools lists Perplexity, ChatGPT, Google AI Overviews, Claude as "AI Search & AEO" tools but the hub does not currently monitor anything.
- AI Overview citations are the fastest-growing source of branded discovery as of 2026. A multi-location group not tracking this is flying blind.
- Branded search lift is the cleanest signal for whether social campaigns are driving real demand.

## Required reading before any code change

1. Read /seo-health from `/seo-health-and-schema` to understand the SEO data model patterns.
2. Read Search Console API auth flow established in /seo-health-and-schema (reuse, do not duplicate).
3. Inventory existing API integrations to /lib/ for patterns.

## Implementation requirements

### Part 1 - AEO citation tracker

#### Query set per dealership

- New table `aeo_query_sets`:
  - `id`, `dealership_id`, `query`, `intent` enum (`brand_purchase`, `service`, `parts`, `lease`, `category_local`, `competitor_compare`), `is_active`, `priority` (1-5)
- Seed each dealership with 12 starter queries auto-derived from dealership name + city + brand:
  - `{brand} dealer near {city}`
  - `best {brand} dealer in {city}`
  - `{dealership_name} reviews`
  - `{dealership_name} service`
  - `{brand} lease deals {city}`
  - `where to buy a {brand} in {city}`
  - `{brand} service center {city}`
  - `certified pre owned {brand} {city}`
  - `best car dealer in {city}`
  - `{brand} financing {city}`
  - `{brand} oil change {city}`
  - `{competitor_brand} vs {brand}` (one competitor)
- Admins can add custom queries via /aeo/queries.

#### Sources to query

Closed list. The agent must NOT add others.

- `perplexity` - via Perplexity API (https://docs.perplexity.ai/)
- `openai_gpt_search` - via OpenAI API with web search tool enabled
- `google_ai_overviews` - via SerpAPI's AI Overview parser OR Bright Data SERP API (whichever has cleaner AIO extraction). Document the choice in code comments.
- `claude` - via Anthropic API with web search beta

For each source, the implementation must:
- Send the query
- Capture the full response text
- Extract cited sources/URLs (each source's API exposes these differently; handle each explicitly)
- Determine whether the dealership's own domain, GBP profile, or any Asbury-owned property is cited

#### Schedule

- Run weekly by default per query. Priority-1 queries run daily.
- Cron job processes the queue with backoff to respect each API's rate limits.

#### Storage

- New table `aeo_citation_results`:
  - `id`, `query_set_id`, `source`, `run_at`, `response_text` (truncated to 4000 chars), `cited_domains` (string[]), `self_cited` (bool: dealership URL appears), `competitor_cited` (string[] of competitor domains detected), `model_version` (track LLM version drift)

#### /aeo UI

- Dashboard: per-dealership scoreboard with columns:
  - Queries tracked
  - Self-citation rate this week (% of queries where own domain appears in any source)
  - Trend vs prior week (arrow + delta)
  - Top competitor cited
- Click row to drill into per-query detail: timeline of self-cited vs not across all 4 sources, response excerpts.
- Each query has a "Run now" button for ad-hoc testing.

#### Alerts

- When self-citation rate drops > 20% week-over-week, fire `aeo.self_citation_drop` notification (route via /notifications-and-sla).
- When a competitor's citation rate exceeds dealership's for a given query for 2 consecutive weeks, fire `aeo.competitor_overtaking`.

### Part 2 - Branded search correlation

#### Data source

- Reuse GSC OAuth from /seo-health-and-schema.
- Pull weekly data per dealership property. Query Search Console API for queries matching the dealership's branded patterns:
  - Exact dealership name
  - Dealership name + common variants (e.g. "Crown Honda" + "Crown Honda Dublin")
  - Brand + city (e.g. "Honda Dublin Ohio")

#### Storage

- New table `branded_search_metrics`:
  - `id`, `dealership_id`, `week_start_date`, `query_pattern` enum, `impressions`, `clicks`, `avg_position`

#### Campaign correlation

- New table `campaigns`:
  - `id`, `dealership_id`, `name`, `theme`, `start_date`, `end_date`, `expected_lift_pct` (optional admin input)
- When the user creates a campaign or tags submissions with a campaign, the system snapshots baseline branded search volume (4 weeks prior) and reports week-by-week lift during and after the campaign window.

#### /analytics integration

- Add a "Branded Search Lift" panel to /analytics per dealership detail view:
  - Sparkline of branded impressions/clicks over 16 weeks
  - Overlay markers for campaign start/end and high-engagement post publish dates
  - Lift % vs 4-week trailing baseline

### Part 3 - Admin tooling

- `/aeo/queries` page (Admin only): full CRUD on `aeo_query_sets`. Bulk import via CSV with columns `dealership_slug, query, intent, priority`.
- Each manual query addition logs to the audit trail.

## Out of scope - do NOT

- Do NOT scrape any LLM web UI; only use official APIs.
- Do NOT cache LLM responses beyond what the storage spec requires.
- Do NOT include user-identifying data in any LLM API call.
- Do NOT add competitor citation tracking from sources outside the 4 listed.
- Do NOT add YouTube/Bing/DuckDuckGo monitoring in this command.
- Do NOT attempt to write structured data fixes to the dealer websites.
- Do NOT auto-create campaigns; campaign creation is manual.

## Acceptance criteria

- /aeo route exists with scoreboard per dealership.
- After first weekly run, each dealership has results across all 4 sources for its 12 seeded queries.
- A query that returns the dealership domain in Perplexity citations is recorded with `self_cited = true`.
- A query where Coggin Honda is cited but Coggin BMW is not (for the BMW dealer) is recorded with `competitor_cited` populated.
- Self-citation rate drop triggers a notification as defined.
- GSC pull populates `branded_search_metrics` weekly.
- Creating a campaign and assigning submissions shows the lift overlay in /analytics.

## Verification

- Mock each LLM API in tests with realistic response shapes.
- Snapshot-test the citation extraction parsers (each source has a different format).
- Manual smoke test: run priority-1 queries for one dealership end to end, verify storage and UI.
- Test GSC API integration with a sandbox property.
