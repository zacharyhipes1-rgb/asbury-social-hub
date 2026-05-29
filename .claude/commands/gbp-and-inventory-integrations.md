# /gbp-and-inventory-integrations

## Scope

Two external integrations that both extend the /upload flow:
1. Add Google Business Profile (GBP) as a supported platform alongside Facebook, Instagram, TikTok, LinkedIn.
2. Connect a live inventory feed (HomeNet/vAuto/DealerSocket/native DMS) so "New Arrival" and "Featured Vehicle" submissions pull live VIN data instead of being typed manually.

Touches: /upload form, platform enum, dealership settings page, server-side publish workflow. Do NOT modify the approval queue logic or analytics.

## Context

- Live references: https://asbury-social-hub.vercel.app/upload (currently 4 social platforms), https://asbury-social-hub.vercel.app/settings (60 social handle slots, 0/60 connected).
- GBP posts directly affect local pack ranking; ignoring GBP leaves measurable local SEO value on the table.
- Inventory feed access varies by dealer group. Asbury commonly uses HomeNet or vAuto. The agent must inspect /settings for any existing integration field before adding new ones; if none, create them.

## Required reading before any code change

1. Read `/app/settings/page.tsx` for the current social connection UI pattern. The GBP and inventory feed configurations should follow the exact same pattern per dealership.
2. Read the Submission and Dealership models.
3. Read `/upload` Step 2 (platform selection) and Step 3 (content type).
4. Read `/lib/utm.ts` from `/upload-flow-overhaul`; GBP needs UTM handling too (`utm_source = gbp`).

## Implementation requirements

### Part 1 - Google Business Profile

#### Settings per dealership

- In /settings, add a 5th platform icon "G" (Google Business Profile) next to F, I, T, L. Update the "0/60 connected" counter math to 0/75 (5 platforms x 15 demo dealerships).
- The connection flow uses Google OAuth 2.0 with scopes `https://www.googleapis.com/auth/business.manage`. Use Google's Business Profile API (v1).
- Store per dealership: `gbp_location_id`, `gbp_account_id`, `gbp_refresh_token` (encrypted at rest), `gbp_connected_at`, `gbp_connected_by_user_id`.
- Provide a "Disconnect" button per dealership.

#### Upload integration

- Add `GBP` to the platform enum.
- When GBP is selected, available content types are: `whats_new`, `event`, `offer`, `product`. Hide Facebook/Instagram-only types.
- GBP caption limit: 1,500 characters.
- GBP image requirements: minimum 400x300 px, recommended 720x720 px, JPG or PNG, max 5 MB.
- For `event` content type, require start/end datetime fields. Validate end > start.
- For `offer` content type, require offer coupon code (optional), terms text, and optional redemption URL.
- For `product` content type, require product name, price, and link to product page.

#### Publish workflow

- On publish, call `accounts.locations.localPosts.create` with the resolved caption (after token resolution), media, and platform-specific fields.
- Apply UTMs to any link with `utm_source = gbp`.
- Persist the GBP post resource name in `submission.external_post_ids.gbp` for later retrieval and edits.
- On failure, mark submission as `publish_failed` with the API error message stored. Do not retry automatically; surface in /admin for manual action.

### Part 2 - Inventory feed integration

#### Configuration

- Add to /settings a new "Inventory Feed" section per dealership with these provider options:
  - `homenet` (XML feed URL + auth token)
  - `vauto` (API key + dealer id)
  - `dealersocket` (API key + dealer id)
  - `none` (manual entry only)
- Each provider stores its specific credentials per dealership. Encrypt at rest.
- Add a "Test connection" button that performs one feed fetch and reports row count and last-modified.

#### Feed sync

- Create a scheduled job (cron) per dealership running every 4 hours that pulls the full feed and upserts into `inventory_vehicles`:
  - `id`, `dealership_id`, `vin`, `stock_number`, `year`, `make`, `model`, `trim`, `body_style`, `exterior_color`, `interior_color`, `mileage`, `condition` (new/used/certified), `msrp`, `sale_price`, `vdp_url`, `photo_urls` (string[]), `feed_last_seen_at`, `is_in_stock`.
- Vehicles missing from the latest feed are marked `is_in_stock = false` but not deleted (preserves history).

#### Upload integration

- In /upload Step 3, when content type is `new_arrival`, `featured_vehicle`, `certified_pre_owned`, `lease_special`, or `sales_event`, show a vehicle picker.
- Vehicle picker is searchable by VIN, stock number, model. Defaults to in-stock vehicles only with a toggle to include sold/historical.
- Selecting a vehicle attaches its data to the submission and offers to:
  - Pre-fill the caption with a template that interpolates `{{vehicle_year}} {{vehicle_make}} {{vehicle_model}} {{vehicle_trim}}` tokens.
  - Pre-attach the first 1-4 photos from the feed as the post media (uploading them to Cloudinary first).
  - Pre-fill the VDP URL as the post link.
- The chosen `vehicle_vin` and `stock_number` are persisted on the submission for analytics correlation.

#### New tokens (extend the token list from /upload-flow-overhaul)

- `{{vehicle_year}}`, `{{vehicle_make}}`, `{{vehicle_model}}`, `{{vehicle_trim}}`, `{{vehicle_stock_number}}`, `{{vehicle_msrp}}`, `{{vehicle_sale_price}}`, `{{vehicle_vdp_url}}`.
- Resolution happens server-side at publish. If the vehicle is no longer in stock at publish time, fail publish with a clear error.

## Out of scope - do NOT

- Do NOT build a custom OAuth flow; use the official Google client libraries.
- Do NOT support GBP Q&A management here.
- Do NOT support feed providers beyond HomeNet, vAuto, DealerSocket in v1.
- Do NOT auto-create posts for every new inventory arrival; this command only enables manual workflows.
- Do NOT push pricing or financing terms to GBP without legal sign-off; default to non-price content types.
- Do NOT store unencrypted credentials anywhere.

## Acceptance criteria

- /settings shows a "G" icon per dealership and a working OAuth connect flow.
- A connected dealership can submit a `whats_new` GBP post that publishes to the live GBP location (test on a sandbox location only during dev).
- /upload Step 2 shows GBP as a 5th platform option.
- Selecting GBP at Step 2 limits content types to the four GBP-supported types.
- An event submission with `end_datetime < start_datetime` fails validation.
- A dealership configured with HomeNet has populated rows in `inventory_vehicles` within 5 minutes of saving credentials (manual trigger or first scheduled run).
- Selecting "Featured Vehicle" in /upload Step 3 shows a searchable vehicle list filtered to the chosen dealership.
- Submitting a Featured Vehicle post pre-fills caption tokens with live data and attaches photos from the feed.
- Attempting to publish a Featured Vehicle post for a VIN no longer in stock returns a 422 with "Vehicle no longer in inventory".

## Verification

- Mock the Google Business Profile API in tests; assert correct payload shape for each content type.
- Mock each inventory feed provider's response; assert upsert behavior, including the `is_in_stock = false` flag for missing rows.
- Manual smoke test against a sandbox GBP location.
