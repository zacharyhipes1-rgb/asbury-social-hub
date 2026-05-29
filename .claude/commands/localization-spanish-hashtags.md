# /localization-spanish-hashtags

## Scope

Two localization features:
1. Spanish caption variant pipeline for dealerships in heavily Hispanic markets.
2. Per-DMA hashtag intelligence that replaces the static /tools Hashtag Sets with data-driven suggestions.

Touches: /upload (Spanish toggle and hashtag suggester), /tools (replace Hashtag Sets implementation), submission model. Do not modify compliance engine, but ensure Spanish variants are also compliance-checked.

## Context

- Live reference: https://asbury-social-hub.vercel.app/tools has a static "Hashtag Sets" placeholder.
- Dealerships in scope for Spanish content (based on demo data):
  - David McDavid Honda (Irving, TX) - 43% Hispanic population per US Census 2024
  - David McDavid Acura (Irving, TX)
  - Coggin Honda (Jacksonville, FL) - significant Hispanic population
  - Coggin Toyota (Orange Park, FL)
  - Coggin BMW (Fort Lauderdale, FL) - 73% Hispanic in city per Census
  - Courtesy Acura (Scottsdale, AZ) - moderate Hispanic population
- Admins should be able to flag any dealership as Spanish-required regardless of geography.

## Required reading before any code change

1. Read /upload Step 5 caption field.
2. Read /tools Hashtag Sets component.
3. Read compliance engine from /compliance-precheck.
4. Read the dealership model.

## Implementation requirements

### Part 1 - Spanish caption variant

#### Dealership configuration

- Add field to Dealership model: `spanish_required` boolean (default false), `spanish_recommended` boolean.
- Auto-set `spanish_recommended = true` based on the dealership list above (one-time migration). `spanish_required` is admin-set only.
- /settings adds a checkbox per dealership for Admins to toggle.

#### Submission model extension

- Add fields: `caption_es` (text), `alt_text_es` (text, for IG), `spanish_skipped` boolean (when uploader chose to skip), `spanish_skip_reason` text.
- Submissions for Spanish-required dealerships cannot be submitted without either `caption_es` populated or `spanish_skipped = true` with a `spanish_skip_reason`.

#### /upload Step 5 Spanish panel

- For Spanish-required or Spanish-recommended dealerships, a Spanish panel appears below the primary caption field.
- Panel contains:
  - Spanish caption textarea with same character counters as primary
  - "Translate from English" button (uses DeepL API; falls back to OpenAI/Anthropic if DeepL unavailable). Auto-translation is a STARTING point only; the field stays editable and must be reviewed by a Spanish-speaking team member.
  - For Spanish-recommended (not required) dealerships, a "Skip Spanish" toggle with required reason text.
- Apply the same token resolution to caption_es (tokens are language-neutral).

#### Compliance for Spanish

- Extend compliance engine from /compliance-precheck:
  - Translate all rules' patterns to Spanish equivalents where applicable. Example: `apr-without-disclosure` matches Spanish "0% APR" + "para clientes calificados" required.
  - Add Spanish-specific rules: lease term disclosures in Spanish are commonly mistranslated; flag if "alquiler" is used (incorrect; "arrendamiento" is correct for vehicle lease).
  - Rules apply independently to caption and caption_es.

#### Publish behavior

- For platforms supporting multi-language posting (Facebook Page Multi-Language Composer): publish both languages in one post.
- For Instagram (no native multi-language): publish two separate posts to the dealership account with Spanish post scheduled 1 hour after English (to avoid algorithm penalty for duplicate-feel content). Use the same media. Tag posts in `submission.external_post_ids` separately.
- For TikTok: same as Instagram; sequential posts.
- For LinkedIn: native multi-language posting supported on company pages; use it.
- For GBP: publish two separate posts; English first, Spanish second.

#### Translator team review (optional governance)

- Add a per-dealership setting `requires_spanish_review_by`: user_id (nullable). If set, any submission with caption_es enters a `pending_translation_review` substate before regular review. The named reviewer must approve the translation; this approval is separate from the main approval and logged to audit.

### Part 2 - Per-DMA hashtag intelligence

#### Data sources

- Hashtag performance comes from connected social accounts' insights:
  - Instagram Business Insights API: top-performing hashtags by reach over trailing 90 days per connected account.
  - TikTok: hashtag impressions per video.
  - Facebook: hashtag reach.
- For dealerships not yet connected to insights APIs, fall back to a curated regional default list seeded for major DMAs.

#### Data model

- New table `hashtag_performance`:
  - `id`, `dealership_id`, `platform`, `hashtag` (lowercase, no `#`), `posts_used_count`, `total_reach`, `total_engagement`, `avg_engagement_rate`, `period_start`, `period_end`
- Rebuild weekly per dealership per platform.
- New table `hashtag_regional_defaults`:
  - `dma_code`, `platform`, `hashtag`, `category` (`local`, `automotive`, `lifestyle`, `seasonal`), `notes`
- Seed for the demo dealership DMAs:
  - Atlanta (Nalley): #ATL, #Atlanta, #ATLAuto, #DriveATL
  - Jacksonville: #Jax, #DuvalCounty, #JaxCars
  - Fort Lauderdale: #FTL, #BrowardCounty, #LuxuryLife
  - Irving/Dallas: #DFW, #DallasAuto, #IrvingTX
  - Scottsdale: #ScottsdaleAZ, #PHX, #DesertDrives
  - Kansas City: #KC, #KansasCity, #KCAuto
  - Dublin OH: #DublinOH, #ColumbusOH, #614
  - Alpharetta: #Alpharetta, #Roswell, #NorthFulton
  - Stone Mountain GA: #StoneMountain, #DeKalbCounty
  - Marietta: #Marietta, #EastCobb
  - Union City GA: #UnionCity, #SouthFulton
  - College Park GA: #CollegePark, #FultonCounty
  - Orange Park FL: #OrangePark, #ClayCounty
- Always blacklist banned/restricted hashtags per platform; check Instagram's shadow-banned list weekly via a maintained source.

#### /upload hashtag panel

- Replace static /tools Hashtag Sets with a contextual suggester in /upload Step 5.
- Suggestions ranked by: (1) performance in trailing 90d for this dealership, (2) regional defaults for the DMA, (3) hashtags used in `content_type` peers across similar dealerships.
- One-click append to caption. Max 30 hashtags per Instagram post (platform limit); enforce client-side and warn.
- Show a per-hashtag pill with: hashtag text, recent reach per use (when data exists), shadow-ban warning if applicable.

#### /tools update

- The static "Hashtag Sets" tool is replaced with a per-dealership performance viewer:
  - Table: hashtag, posts used, total reach, total engagement, avg engagement rate, trend arrow vs prior 90d.
  - Sort and filter by category.
  - Export to CSV.

## Out of scope - do NOT

- Do NOT auto-translate published posts retroactively.
- Do NOT support languages beyond English and Spanish in this command.
- Do NOT integrate with paid translation services (Lionbridge, etc.) here.
- Do NOT auto-apply hashtags; suggestions only.
- Do NOT generate hashtags via LLM; use only platform insights and curated regional defaults.

## Acceptance criteria

- David McDavid Honda has `spanish_recommended = true` after migration.
- Submitting a post for David McDavid Honda without caption_es shows the Spanish panel and either requires text or a skip reason.
- "Translate from English" button populates caption_es with a draft translation that the user can edit.
- Compliance rules applied to caption_es catch a Spanish APR violation.
- Publishing a multi-language IG post creates two scheduled posts 1 hour apart.
- /upload hashtag suggester for a Coggin BMW Instagram post shows DMA-specific tags (FTL, BrowardCounty) and dealership performance data if available.
- /tools hashtag viewer shows performance data with sortable columns and CSV export.

## Verification

- Mock DeepL API in tests; assert translation flow.
- Mock IG/TikTok/FB Insights APIs in tests; assert hashtag_performance population.
- Manual test: submit a Spanish-required post with both languages, verify both publish.
