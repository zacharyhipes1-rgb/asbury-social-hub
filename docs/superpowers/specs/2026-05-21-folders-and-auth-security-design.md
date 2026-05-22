# Design Spec — Asset Library Folders & Auth Security Overhaul
**Date:** 2026-05-21  
**Status:** Approved  
**Project:** asbury-social-staging

---

## Overview

Two independent features built in the same release:

1. **Asset Library Folders** — Nested folder structure for organizing the asset library, backed by Supabase, navigated via breadcrumb.
2. **Auth & Security Overhaul** — Three sub-features: OTP-gated forgot-password flow, invite + request-based user registration, and a unified admin Users & Security page.

---

## Feature 1: Asset Library Folders

### Goals
- Allow all users to create, rename, delete, and navigate nested folders in the asset library.
- Assets can be uploaded directly into a folder and moved between folders after upload.
- Folders persist in Supabase and are shared across all users in real time.

### Data Model

**New table: `asset_folders`**
```sql
CREATE TABLE IF NOT EXISTS public.asset_folders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  parent_id       UUID REFERENCES public.asset_folders(id) ON DELETE CASCADE,
  created_by      TEXT NOT NULL,        -- email
  created_by_name TEXT DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
- `parent_id = NULL` means root level.
- Deleting a folder cascades to all descendant folders. Assets in deleted folders have `folder_id` set to `NULL` (floated back to root — nothing lost).

**Migration: `assets` table**
```sql
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS folder_id UUID
  REFERENCES public.asset_folders(id) ON DELETE SET NULL;
```
- `folder_id = NULL` means the asset is at root ("All Assets").

Both SQL statements are added to `supabase-schema.sql`.

### New: `FoldersContext.jsx`

Mirrors the `AssetsContext` pattern: fetches all folders on mount, subscribes to Supabase realtime changes, exposes CRUD.

**State:** `folders: []`, `foldersLoaded: boolean`

**Methods:**
- `createFolder(name, parentId)` — inserts row, optimistically updates state.
- `renameFolder(id, name)` — updates name in Supabase + state.
- `deleteFolder(id)` — deletes from Supabase (cascade handled by DB). Before calling, UI warns if the folder contains assets or subfolders.
- `getFolderPath(id)` — traverses `folders` array upward via `parent_id` to return an ordered breadcrumb array `[{ id, name }, ...]` from root to the given folder.
- `getChildFolders(parentId)` — returns immediate children of a given folder (or root if `parentId = null`).

`FoldersProvider` wraps inside `AssetsProvider` in `App.jsx`.

### `AssetsContext` Additions

- `fromRow` maps `folder_id` from Supabase rows.
- `addAsset` accepts an optional `folder_id` parameter.
- New `moveAsset(assetId, folderId)` — updates only `folder_id` in Supabase and reflects in state.

### `AssetsPage` UI Changes

**New state:** `currentFolderId` (null = root)

**Breadcrumb bar** (top of toolbar, replaces nothing — added above search row):
- Shows `All Assets › Folder › Subfolder` path.
- Each segment is a clickable button that sets `currentFolderId`.
- "All Assets" always navigates to root.

**Folder cards section** (inside the grid panel, above the asset grid):
- Labeled "Folders in This Location" (only shown when there are subfolders).
- Grid: same column count as asset grid — `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6`.
- Each folder card: indigo folder icon, name, item count (assets + subfolders inside).
- Hover reveals rename (pencil) and delete (trash) icon buttons in the top-right corner.
- Click card body → navigate into that folder (`setCurrentFolderId(folder.id)`).
- Last card in the grid is always a dashed "New folder" placeholder button.

**"New Folder" button** in the page header (next to Upload):
- Opens an inline name-input popover or small modal — user types name, presses Enter or clicks Create.
- Folder is created under `currentFolderId`.

**Divider** between folder cards and asset grid:
- `— Files in This Location —` label. Only shown when both folders and assets exist at the current level.

**Asset filtering:**
- `filtered` list in `AssetsPage` is additionally filtered by `asset.folder_id === currentFolderId` (treating `null` as root).
- Search, type tabs, sort, and tag filters all continue to work within the current folder scope.

**Upload modal:**
- Shows current folder context: "Uploading to: Marketing › 2026 Promotions" (or "Uploading to: All Assets" at root).
- Passes `currentFolderId` to `addAsset`.

**Asset detail modal — "Move to Folder" section:**
- Dropdown/picker showing full folder tree, current location highlighted.
- On select → calls `moveAsset(asset.id, selectedFolderId)`.
- "Remove from folder (move to root)" option available.

**Delete folder guard:**
- If folder has assets or subfolders, confirmation modal warns: "X assets will be moved to the parent folder. Subfolders will also be deleted." Admin must confirm.
- On confirm: `moveAsset` is called for each asset to set `folder_id` to `parentId`, then `deleteFolder` is called.

### Permissions
All roles (admin, social_media, viewer) can create, rename, and delete folders. Viewers cannot upload assets but can navigate folders and create folder structure.

---

## Feature 2: Auth & Security Overhaul

### 2a. Forgot Password — OTP Flow

**Replaces** the current single-page reset (which has no identity verification).

**3-step state machine** in `ForgotPasswordPage.jsx`:  
`step: 'email' | 'code' | 'password'`

**Step 1 — Email:**
- User enters email.
- App checks: does user exist and is `active`? If not, show error (internal tool — explicit messaging is fine).
- If valid: generate 6-digit numeric code (`Math.floor(100000 + Math.random() * 900000)`).
- Store in `sessionStorage` (not localStorage — clears on tab close):  
  Key: `asbury_otp_{email}`  
  Value: `{ code, expiry: Date.now() + 600_000, attempts: 0 }`
- Send email via `emailService.sendOtpCode({ recipient: { name, email }, code })`.
- Advance to step 2.

**Step 2 — Code:**
- Six individual digit input boxes (auto-advance on input, auto-submit on 6th digit).
- Countdown timer showing remaining time (10 min, formatted `M:SS`).
- "Resend code" link — enabled after 60-second cooldown. Generates a new code, resets TTL and attempts counter.
- On submit: read OTP from `sessionStorage`, check expiry, compare code.
  - Wrong code: increment `attempts`. After 3 failed attempts, delete OTP from `sessionStorage` and return to step 1 with error "Too many attempts — request a new code."
  - Correct: delete OTP from `sessionStorage`, advance to step 3.
- "← Change email" link returns to step 1 and clears OTP.

**Step 3 — New Password:**
- New password + confirm inputs.
- Password strength bar (weak/fair/strong based on length + character variety — visual only, no hard block above 8 chars).
- Submit → `setPasswordByEmail(email, newPassword)` → success toast → redirect to `/login`.

**New `emailService` function:**
```js
export async function sendOtpCode({ recipient, code }) { ... }
```
Uses the existing EmailJS template. Subject: `"Your Asbury Social Hub verification code"`. Body: `"Your verification code is: {code}. Valid for 10 minutes. Do not share this code."`.

**Security properties:**
- OTP lives in `sessionStorage` — gone when tab closes.
- 10-minute TTL enforced client-side.
- Max 3 attempts before invalidation.
- No server round-trip means a determined attacker with devtools access could read the code — acceptable risk for an internal team tool.

---

### 2b. User Registration — Invite + Request Flow

**Two paths to account creation:**

#### Path A — Self-Registration (request access)
`SignUpPage.jsx` stays. On submit:
1. `addUser({ ..., active: false, registration_type: 'self' })` — user stored but cannot log in.
2. `emailService.notifyNewUserRequest({ user, admins })` fires — emails all admins.
3. User sees: "Request submitted. You'll get an email once an admin approves your account."

**New `emailService` function:**
```js
export async function notifyNewUserRequest({ user, admins }) { ... }
```
Subject: `"New access request: {name}"`. Body includes name, email, title, timestamp.

**New `UsersContext` field on user objects:**
- `registration_type: 'self' | 'invited' | 'seeded'`

#### Path B — Admin Invite
Admin clicks "Send Invite" on the Users & Security page → modal:
- Fields: Email (required), Name (optional), Role (required, default: `social_media`).
- On submit: generate UUID token → save to `asbury_invites` in localStorage (see below) → `emailService.sendInvite({ invite, invitedBy })`.

**Invite storage** (`asbury_invites` in localStorage):
```js
{
  id: string,           // UUID
  token: string,        // UUID — used in URL
  email: string,
  name: string | null,
  role: 'admin' | 'social_media' | 'viewer',
  invited_by: string,   // email of inviting admin
  invited_by_name: string,
  created_at: ISO string,
  expires_at: ISO string, // +7 days
  status: 'pending' | 'accepted' | 'revoked'
}
```

**Invite email:**
Subject: `"You've been invited to Asbury Social Hub"`.  
Body includes name, inviting admin's name, role, and the link: `https://{host}/signup?invite={token}`.

**SignUpPage with invite token:**
- On mount, reads `?invite=TOKEN` from URL.
- Validates: token exists in `asbury_invites`, status is `'pending'`, `expires_at` is in the future.
- If invalid/expired: shows error banner ("This invite link is invalid or has expired") and hides form.
- If valid: pre-fills email (input locked), pre-fills name if provided.
- On submit: `addUser({ ..., active: true, registration_type: 'invited' })` — immediately active, no queue.
- Marks invite as `status: 'accepted'`, `accepted_at: now`.
- Redirect to `/login` with success message.

**New `emailService` function:**
```js
export async function sendInvite({ invite, invitedBy }) { ... }
```

---

### 2c. Admin Users & Security Page

**`UsersPage.jsx` is restructured** into a tabbed page. Route stays `/users`. Admin-only guard unchanged.

**Tab bar** (below the page header, above the content area):
- **Team Members** — existing user management table, unchanged. Shows count badge.
- **Pending Requests** — users where `active === false && registration_type === 'self'`. Shows amber count badge; badge hidden when 0.
- **Invitations** — all entries in `asbury_invites`. Shows indigo count badge for pending invites.

**"Send Invite" button** moves to the page header (visible from all tabs).

**Pending Requests tab:**
- Each card shows: avatar initials, name, email, title, timestamp of request.
- **Approve** button: sets `active: true`, fires `emailService.notifyUserApproved({ user })`.
- **Reject** button: confirmation dialog → deletes user, fires `emailService.notifyUserRejected({ user })`.

**New `emailService` functions:**
```js
export async function notifyUserApproved({ user }) { ... }
// Subject: "Your Asbury Social Hub account is approved"
// Body: welcome message + login link

export async function notifyUserRejected({ user }) { ... }
// Subject: "Update on your Asbury Social Hub access request"
// Body: polite decline, contact admin if questions
```

**Invitations tab:**
- Each row shows: email, role, invited by, date, status badge (Pending / Accepted / Expired / Revoked).
- **Pending** rows: Resend (regenerates token, resets `expires_at`, re-sends email) + Revoke (sets `status: 'revoked'`).
- **Expired** rows: Re-invite (same as Resend — creates fresh token).
- **Accepted/Revoked** rows: display only, no actions.

**`InvitesContext.jsx`** (new, small):
- Reads/writes `asbury_invites` from localStorage.
- Methods: `createInvite(data)`, `revokeInvite(id)`, `resendInvite(id)`, `acceptInvite(token)`, `getInviteByToken(token)`, `getValidInvite(token)`.
- Exposed via `useInvites()` hook.
- Wrapped in `App.jsx` inside `UsersProvider`.

---

## Files Changed / Created

### New files
| File | Purpose |
|---|---|
| `src/context/FoldersContext.jsx` | Folder CRUD + realtime |
| `src/context/InvitesContext.jsx` | Invite token management |

### Modified files
| File | Change |
|---|---|
| `src/context/AssetsContext.jsx` | Add `folder_id` to `fromRow`, `addAsset`, new `moveAsset` |
| `src/context/UsersContext.jsx` | Add `registration_type` field, `getPendingUsers()` |
| `src/pages/AssetsPage.jsx` | Add `currentFolderId` state, breadcrumb, folder grid, "New Folder" button |
| `src/pages/ForgotPasswordPage.jsx` | Full rewrite — 3-step OTP flow |
| `src/pages/SignUpPage.jsx` | Add invite token validation path |
| `src/pages/UsersPage.jsx` | Add tab bar, Pending tab, Invitations tab |
| `src/components/assets/AssetDetailModal.jsx` | Add "Move to Folder" section |
| `src/components/assets/AssetUploadModal.jsx` | Pass `currentFolderId`, show folder context |
| `src/services/emailService.js` | Add `sendOtpCode`, `notifyNewUserRequest`, `sendInvite`, `notifyUserApproved`, `notifyUserRejected` |
| `src/App.jsx` | Wrap `FoldersProvider`, `InvitesContext` |
| `supabase-schema.sql` | Add `asset_folders` table + `folder_id` migration |

---

## Out of Scope
- Drag-and-drop to move assets between folders (too complex for mobile; use detail modal instead)
- Folder-level permissions (all folders visible to all roles)
- Server-side OTP storage (client-side sessionStorage acceptable for internal tool)
- Two-factor auth on login (future consideration)
- Audit log / security event log
