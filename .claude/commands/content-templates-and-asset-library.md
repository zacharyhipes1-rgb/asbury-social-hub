# /content-templates-and-asset-library

## Scope

Two related changes that share the same content infrastructure:
1. Add a `/templates` section with reusable caption templates by intent and OEM.
2. Add structure to the existing empty `/assets` library (tags, rights metadata, search).

Do not touch /upload form logic beyond surfacing template selection and asset insertion. Do not modify the approval queue.

## Context

- Live references: https://asbury-social-hub.vercel.app/assets (currently empty) and there is no /templates route yet.
- 175+ dealerships need swipe files; without templates the same captions get reinvented daily.
- An asset library without metadata becomes a dumping ground in 90 days.

## Required reading before any code change

1. Read `/app/assets/` to understand the current asset upload component (it references Cloudinary).
2. Read `/app/upload/` Step 5 (Details) to find where to insert template selector and asset picker.
3. Confirm Cloudinary upload is wired in `/settings` page logic.

## Implementation requirements

### Part 1 - Content templates

#### Data model

- New table `caption_templates`:
  - `id`, `name`, `intent` (enum), `brand` (enum or null for all), `body` (text with token support), `platform_recommendations` (string[]), `recommended_aspect_ratio`, `required_disclosures` (string[]), `created_by`, `updated_at`, `is_active`.
- Intent enum (closed list):
  - `new_model_launch`
  - `service_promotion`
  - `used_inventory_feature`
  - `holiday_seasonal`
  - `employee_spotlight`
  - `customer_delivery`
  - `financing_offer`
  - `certified_pre_owned`
  - `event_promotion`
  - `community_local`
- Brand enum matches existing dealership brands (Honda, BMW, Lexus, Acura, Toyota, Corporate).

#### Seed data

Ship a starter set of 30 templates (3 per intent x 10 intents). Use real automotive copy patterns. Tokens from `/upload-flow-overhaul` must be used (e.g. `{{dealership_name}}`, `{{city}}`). Required disclosures must reference compliance rules (e.g. financing templates include "for qualified buyers" placeholder).

Example seed for `financing_offer` x BMW:
```
"Drive home in a new {{brand}} from {{dealership_name}} with special financing for qualified buyers. Visit us in {{city}} or schedule online at {{address}}. *See dealer for complete details."
```

#### /templates route

- Admin role can CRUD templates. Social Media role can read and use. View Only sees nothing.
- List view: filter by intent, brand, platform. Search by name or body text.
- Detail view: edit body with token autocomplete. Show character count for each recommended platform.
- "Use this template" button on each template: opens `/upload` pre-filled with the template body, recommended platforms, and required disclosures injected as placeholder text.

#### Upload Step 5 integration

- Add a "Start from template" dropdown at the top of Step 5. Filters templates by the dealership brand selected in Step 1 and the platform from Step 2.
- Selecting a template fills the caption field. The reviewer can edit freely; the chosen template_id is stored on the submission for analytics.

#### Analytics integration

- Add a "Template Performance" widget to /analytics. Top 10 templates by submission count last 30 days, with approval rate column.

### Part 2 - Asset library structure

#### Data model

- Extend the existing assets table (or create one if it does not yet exist):
  - `id`, `cloudinary_url`, `cloudinary_public_id`, `mime_type`, `width`, `height`, `duration_seconds` (null for images), `file_size_bytes`
  - `tags` (string[]) - free-form
  - `controlled_tags` (jsonb): `{ brand?: string, vehicle_type?: string, season?: string, intent?: string, content_type?: string }` (intent matches the same enum as templates)
  - `rights_status` enum: `cleared`, `pending_release`, `restricted`, `unknown`
  - `model_release_on_file` boolean
  - `oem_approved` boolean
  - `usage_expires_at` timestamp (nullable; for licensed stock images or talent agreements)
  - `source_dealership_id` (fk, nullable for corporate assets)
  - `vehicle_vin` (nullable, used when asset is of a specific vehicle in inventory)
  - `uploaded_by`, `uploaded_at`, `description`

#### Vehicle type closed list

`sedan`, `coupe`, `suv`, `crossover`, `truck`, `hatchback`, `convertible`, `wagon`, `minivan`, `ev`, `hybrid`

#### Season closed list

`spring`, `summer`, `fall`, `winter`, `holiday`, `back_to_school`, `tax_refund`, `model_year_end`

#### Upload UX (modify existing /assets upload)

- Required fields at upload time: `rights_status`, `controlled_tags.brand`, and `description`.
- If `rights_status = cleared` and the asset contains people (user-declared checkbox), require `model_release_on_file = true` to be checked.
- Cloudinary upload is unchanged; only the metadata form expands.

#### Browse UX

- Replace the empty state with a filterable grid.
- Filters: brand, vehicle_type, season, intent, rights_status, has_vin, source_dealership.
- Search box queries: description (full-text), tags (array contains), filename.
- Each asset card shows: thumbnail, rights badge (color-coded), expiration warning if `usage_expires_at < 30 days from now`, source dealership badge.
- Click to open detail modal with full metadata and an "Insert into post" button that copies the Cloudinary URL to clipboard or opens a new /upload session with the asset pre-attached.

#### Expiration handling

- A nightly job flags assets where `usage_expires_at` is within 30 days. Show a banner on /assets listing expiring assets to Admins only.
- Assets with `usage_expires_at < now` are hidden from the picker but remain visible in /assets for admins to review and re-license.

#### VIN linkage

- When `vehicle_vin` is set, on hover show year/make/model pulled from the inventory feed (when `/gbp-and-inventory-integrations` ships). Until that command ships, show only the VIN.

## Out of scope - do NOT

- Do NOT build AI tag suggestion from image content.
- Do NOT add a separate folder hierarchy; tags only.
- Do NOT support asset versioning in this command.
- Do NOT add commenting on assets.
- Do NOT auto-import existing assets from anywhere; library starts empty and is populated by users.
- Do NOT add bulk upload via CSV; one-at-a-time upload is sufficient for v1.
- Do NOT touch the existing Cloudinary configuration in /settings.

## Acceptance criteria

- /templates route exists with the listed 30 seeded templates.
- An Admin can edit a template body and the change persists.
- A Social Media user selecting "Use this template" in /templates lands on /upload with caption pre-filled.
- Submitting from a template stores `template_id` on the submission.
- /analytics shows the Template Performance widget after at least one templated submission.
- Uploading an asset without `rights_status` is rejected client and server side.
- An asset with `usage_expires_at = today + 15 days` shows an amber "Expires in 15 days" badge on its card.
- An asset with `usage_expires_at < now` does not appear in the /upload asset picker but still appears in /assets for Admins.
- Searching "Civic" in /assets returns all assets whose description or tags contain that string.

## Verification

- Unit tests for the template token resolution (reuse the resolver from /upload-flow-overhaul).
- Integration test: seed templates, fetch list, use one in /upload, assert submission has template_id.
- Manual test: upload an asset with each rights_status; confirm UI badges render correctly.
