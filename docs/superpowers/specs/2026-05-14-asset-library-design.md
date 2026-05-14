# Asset Library — Design Spec

**Date:** 2026-05-14
**Status:** Approved for implementation
**Author:** Zach Hipes (w/ Claude)

## Summary

A shared, global asset library for the Asbury Social Hub. Authorized users
upload images, videos, and files once; anyone on the team can then browse,
download, or reuse any asset to create a social post — regardless of who
originally uploaded it. Posts created from library assets continue through
the existing approval queue (status-only "publish", same as today).

## Goals

- Single source of truth for reusable media across dealerships and posts.
- Eliminate re-uploading the same hero shot for every dealership.
- Preserve the existing admin approval gate for outgoing posts.
- Match today's mobile, tablet, and desktop responsive standards.

## Non-goals (explicit)

- **Real platform API publishing** (Facebook Graph, Instagram, TikTok,
  LinkedIn). Decided: Approach A — status-only "publish" matching today.
  Wiring real API calls is a separate, larger initiative.
- Asset versioning, replacement, or revision history.
- Folder hierarchy or nested organization.
- Bulk upload (single-file upload only, multiple files = multiple uploads).
- Tagging, categories, or any structured metadata beyond a free-text
  description. Search is by filename or description only.
- Per-dealership asset pools — the library is **global**. Every asset
  is usable for any dealership.
- Hard-delete from UI. Admins soft-delete; database cleanup is manual.

## User-facing changes

### Navigation

A new "Asset Library" item in the sidebar under the **Content** section,
visible to all authenticated roles. Icon: `Library` from lucide-react.

### `/assets` page

| Element | Behavior |
|---|---|
| Header | "Asset Library" title, asset count, "Upload" button (admin + social_media only) |
| Search | Filters by filename or description, case-insensitive substring |
| Empty state | Friendly illustration + CTA to upload (or contact admin) |
| Grid | `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`, gap-3 |
| Asset card | Thumbnail (or generic file icon), filename (truncated), uploader name, relative date |

Tapping a card opens the asset detail modal.

### Asset detail modal

Reuses the visual pattern from `PostDetailModal` (clickable preview,
download button, `fl_attachment` URL transform for Cloudinary).

| Action | Visible to | Behavior |
|---|---|---|
| View full size | all | Opens hosted URL in new tab |
| Download | all | Triggers `fl_attachment` download for Cloudinary URLs |
| Use in post | admin + social_media | Navigates to `/upload?asset=<id>` |
| Delete | admin only | Soft-delete via UPDATE `deleted=true` |

### Upload flow

A modal triggered by the "Upload" button. Reuses the validation rules
from Step 4 of the existing FormWizard (lifted to a shared helper):

- Image, video, PDF, ZIP, PPT formats only
- 100 MB hard cap
- SVG/HTML/script/executable extensions explicitly blocked
- Required: a file. Optional: a description (max 500 chars, trimmed)

### FormWizard integration (Step 4)

| Change | Detail |
|---|---|
| New "Pick from Library" button | Sits next to the existing drop zone. Opens `AssetPickerModal`. |
| URL pre-fill | If FormWizard mounts with `?asset=<id>`, looks up the asset via `getAssetById` (no network call — context already loaded) and pre-fills `file_name/file_size/file_type/file_url/file_preview` into the wizard state at Step 4. |
| Picker modal | Same grid as `/assets`. Selecting an asset closes the modal and applies the same pre-fill. |

The picker does not require leaving the wizard — the user stays mid-flow.

## Architecture

### Data model

```sql
CREATE TABLE IF NOT EXISTS public.assets (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name        TEXT         NOT NULL,
  file_size        BIGINT       NOT NULL DEFAULT 0,
  file_type        TEXT         NOT NULL DEFAULT '',
  file_url         TEXT         NOT NULL,
  thumbnail_url    TEXT,
  description      TEXT         DEFAULT '',
  uploaded_by      TEXT         NOT NULL,
  uploaded_by_name TEXT,
  uploaded_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted          BOOLEAN      NOT NULL DEFAULT FALSE
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon read"   ON public.assets FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert" ON public.assets FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update" ON public.assets FOR UPDATE TO anon USING (true) WITH CHECK (true);
-- DELETE intentionally omitted, matches the pattern set in posts/dealership_integrations

ALTER PUBLICATION supabase_realtime ADD TABLE public.assets;
```

### Query model

`AssetsContext` fetches all non-deleted assets on mount
(`select * from assets where deleted = false order by uploaded_at desc`),
subscribes to realtime inserts/updates, and exposes:

- `assets` — array, sorted newest-first
- `addAsset({ file, description })` — uploads to Cloudinary, inserts row
- `softDeleteAsset(id)` — UPDATE `deleted = true`
- `getAssetById(id)` — local lookup from the in-memory list

Search filtering is client-side over the loaded list (case-insensitive
substring against `file_name` and `description`). If the library grows
past a few hundred assets, this can be promoted to a server-side
`ilike` query without a schema change. Out of scope for initial release.

### Storage

| Asset type | Cloudinary `resource_type` | Thumbnail derivation |
|---|---|---|
| Images (`image/*`) | `image` | `c_thumb,w_240,h_240,g_auto` URL transform |
| Videos (`video/*`) | `video` | `so_2.0,c_thumb,w_240,h_240` (frame at 2s) |
| PDFs / ZIPs / PPTs | `raw` | Generic file icon (no thumbnail URL) |

Cloudinary upload preset must allow `raw` resource type. If not yet
configured, surface a clear error in the upload modal and link to Settings.

### Component layout

```
src/
├─ pages/
│  └─ AssetsPage.jsx                  ← new, /assets route
├─ components/
│  └─ assets/                         ← new directory
│     ├─ AssetCard.jsx
│     ├─ AssetDetailModal.jsx
│     ├─ AssetPickerModal.jsx
│     └─ AssetUploadModal.jsx
├─ context/
│  └─ AssetsContext.jsx               ← new
└─ lib/
   └─ cloudinary.js                   ← new, extracted from Step4Upload
```

### Existing files modified

| File | Change |
|---|---|
| `src/App.jsx` | Mount `AssetsProvider`, add `/assets` route (all roles) |
| `src/components/layout/Sidebar.jsx` | Add "Asset Library" nav item under Content |
| `src/components/form/Step4Upload.jsx` | Read `?asset=<id>`, add "Pick from Library" button, use lifted `validateFile` and `uploadToCloudinary` from `src/lib/cloudinary.js` |
| `supabase-schema.sql` | Append `assets` table + policies + realtime publication |

## Permissions

| Action | Roles allowed |
|---|---|
| Browse `/assets` page | admin, social_media, viewer |
| Download asset | admin, social_media, viewer |
| Upload asset | admin, social_media |
| Use asset in post (creates a post draft) | admin, social_media |
| Soft-delete asset | admin only |

Route guard: `<ProtectedRoute>` (any authenticated user). The Upload button
and Use-in-post / Delete actions are conditionally rendered based on role.

## Validation

The existing `validateFile` helper in `Step4Upload.jsx` is **lifted** to
`src/lib/cloudinary.js` so both the FormWizard and the new
`AssetUploadModal` share one implementation. Rules unchanged:

- Max 100 MB
- MIME whitelist: image/* (no SVG), video/*, PDF, ZIP, PowerPoint
- Reject by extension: `.svg`, `.html`, `.js`, `.exe`, etc.
- File must be non-empty

Description: trimmed; max 500 characters; HTML escaped on render
(default React behavior — no `dangerouslySetInnerHTML`).

## Error handling

| Scenario | Behavior |
|---|---|
| Cloudinary not configured | Upload button disabled with tooltip linking to Settings |
| Cloudinary upload failure | Inline error in upload modal, file selection preserved, retry button |
| `?asset=<id>` not found | Toast "Asset not found" in FormWizard, Step 4 falls back to empty state |
| Realtime subscription drop | 8s polling fallback (same pattern as `PostsContext`) |
| Supabase insert failure | Toast error; modal stays open with form state intact |
| Soft-delete failure | Toast error; asset remains visible |

## Testing approach

Manual verification at all three viewports (mobile 375px, tablet 768px,
desktop 1280px):

1. Upload one image, one video, one PDF, one ZIP. Each produces a usable
   `file_url` and a thumbnail (or icon for raw).
2. Browse: search filters by name and description.
3. Download from detail modal triggers a file download (not a navigation).
4. Click "Use in post" → FormWizard opens at Step 1, asset is pre-filled
   when wizard reaches Step 4.
5. From inside Step 4, "Pick from Library" opens the picker, selection
   pre-fills wizard state, original drop zone replaced by selected asset.
6. Admin can soft-delete; deleted asset disappears from grid for all
   live sessions (realtime).
7. Viewer role can browse + download but does not see Upload or
   Use-in-post or Delete.
8. social_media role can browse + download + upload + use-in-post but
   does not see Delete.
9. File over 100 MB or with disallowed extension shows a clear inline error.

## Open follow-ups (not blocking)

- Eventually: a hard-purge admin action to delete soft-deleted assets
  from Cloudinary + DB (requires service role or a backend endpoint).
- Tagging / categories if the library grows past ~200 assets and users
  report finding-by-search is painful.
- "Replace" action: re-upload a new file into an existing asset slot,
  keeping the same ID and URL stable.
- Actual platform API publishing (separate spec).
