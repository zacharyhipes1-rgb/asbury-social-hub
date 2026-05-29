-- ============================================================
-- Asbury Social Hub — Supabase Schema
-- Run this entire script in: Dashboard → SQL Editor → New Query
-- ============================================================
--
-- SECURITY NOTE
-- -------------
-- The app uses a custom localStorage-based auth layer (NOT Supabase Auth),
-- so `auth.uid()` is unavailable inside RLS policies. That means policies
-- here can only distinguish anon vs. service_role — they cannot enforce
-- per-user access. For real authentication, migrate to Supabase Auth and
-- replace the `Allow read/write to anon` policies below with policies
-- gated on `auth.uid()` and `auth.jwt()->>'role'`.
--
-- Mitigation in place:
--   • DELETE is denied to anon — posts/integrations are soft-deleted via
--     `approval_status='deleted'` instead. This protects against bulk
--     destruction if the anon key leaks.
--   • Service role bypass is still available for admin scripts / backups.
-- ============================================================

-- ── Posts ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.posts (
  id                   TEXT PRIMARY KEY,
  dealership_id        TEXT         NOT NULL,
  platform             TEXT         NOT NULL,
  content_type         TEXT         NOT NULL,
  caption              TEXT         DEFAULT '',
  hashtags             TEXT[]       DEFAULT '{}',
  alt_text             TEXT         DEFAULT '',
  file_name            TEXT         DEFAULT '',
  file_size            BIGINT       DEFAULT 0,
  file_type            TEXT         DEFAULT '',
  file_preview         TEXT,
  file_url             TEXT,
  target_audience      TEXT         DEFAULT '',
  posting_reason       TEXT         DEFAULT '',
  optimal_posting_time TEXT,
  uploaded_by          TEXT         NOT NULL,
  uploaded_by_name     TEXT,
  uploaded_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  scheduled_for        TEXT,
  approval_status      TEXT         NOT NULL DEFAULT 'pending',
  chad_notes           TEXT,
  chad_action_at       TIMESTAMPTZ,
  published_at         TIMESTAMPTZ
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Drop legacy open policy
DROP POLICY IF EXISTS "Allow all" ON public.posts;
DROP POLICY IF EXISTS "anon read"   ON public.posts;
DROP POLICY IF EXISTS "anon insert" ON public.posts;
DROP POLICY IF EXISTS "anon update" ON public.posts;

-- anon (client) can read, insert, and update — but NOT delete
CREATE POLICY "anon read"   ON public.posts FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert" ON public.posts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update" ON public.posts FOR UPDATE TO anon USING (true) WITH CHECK (true);
-- DELETE intentionally omitted — soft-delete by setting approval_status='deleted'

-- Enable real-time broadcasts for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;


-- ── Dealership Integrations ──────────────────────────────────
-- WARNING: this table stores social-platform credentials (access tokens,
-- client secrets). With open anon access, anyone holding the anon key can
-- read these. For production, encrypt the `fields` column at rest using
-- Supabase Vault or move credential storage server-side behind a backend
-- proxy with Supabase Auth-gated RLS.
CREATE TABLE IF NOT EXISTS public.dealership_integrations (
  dealership_id TEXT         NOT NULL,
  platform_id   TEXT         NOT NULL,
  fields        JSONB        DEFAULT '{}',
  updated_at    TIMESTAMPTZ  DEFAULT NOW(),
  PRIMARY KEY (dealership_id, platform_id)
);

ALTER TABLE public.dealership_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all"  ON public.dealership_integrations;
DROP POLICY IF EXISTS "anon read"  ON public.dealership_integrations;
DROP POLICY IF EXISTS "anon write" ON public.dealership_integrations;

CREATE POLICY "anon read"  ON public.dealership_integrations FOR SELECT TO anon USING (true);
CREATE POLICY "anon write" ON public.dealership_integrations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update" ON public.dealership_integrations FOR UPDATE TO anon USING (true) WITH CHECK (true);
-- DELETE again intentionally omitted


-- ── Asset Library ────────────────────────────────────────────
-- Global pool of reusable media (images, video, files). Any authorized
-- user can upload; any user can reference an asset when creating a post.
-- Soft-delete only — admins flip deleted=true; manual cleanup of
-- Cloudinary blobs is left to ops.
CREATE TABLE IF NOT EXISTS public.assets (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name        TEXT         NOT NULL,
  file_size        BIGINT       NOT NULL DEFAULT 0,
  file_type        TEXT         NOT NULL DEFAULT '',
  file_url         TEXT         NOT NULL,
  thumbnail_url    TEXT,
  description      TEXT         DEFAULT '',
  tags             TEXT[]       NOT NULL DEFAULT '{}',
  uploaded_by      TEXT         NOT NULL,
  uploaded_by_name TEXT,
  uploaded_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted          BOOLEAN      NOT NULL DEFAULT FALSE
);
-- Safe migration for existing deployments — no-op if column already exists
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read"   ON public.assets;
DROP POLICY IF EXISTS "anon insert" ON public.assets;
DROP POLICY IF EXISTS "anon update" ON public.assets;

CREATE POLICY "anon read"   ON public.assets FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert" ON public.assets FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update" ON public.assets FOR UPDATE TO anon USING (true) WITH CHECK (true);
-- DELETE intentionally omitted — admins soft-delete via UPDATE deleted=true

ALTER PUBLICATION supabase_realtime ADD TABLE public.assets;


-- ── QR Codes ─────────────────────────────────────────────────
-- Each row is one tracked QR code. The redirect endpoint looks up
-- target_url by id and logs a scan before redirecting.
CREATE TABLE IF NOT EXISTS public.qr_codes (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  target_url  TEXT         NOT NULL,
  label       TEXT         NOT NULL DEFAULT '',
  created_by  TEXT         NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  dealership  TEXT         DEFAULT ''
);

ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read"   ON public.qr_codes;
DROP POLICY IF EXISTS "anon insert" ON public.qr_codes;

CREATE POLICY "anon read"   ON public.qr_codes FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert" ON public.qr_codes FOR INSERT TO anon WITH CHECK (true);
-- No UPDATE/DELETE — codes are permanent once created


-- ── QR Scans ─────────────────────────────────────────────────
-- One row per scan event, written server-side by api/r/[id].js.
-- user_agent is stored for device analytics (mobile vs desktop).
CREATE TABLE IF NOT EXISTS public.qr_scans (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id  UUID         NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,
  scanned_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  user_agent  TEXT         DEFAULT ''
);

ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read"   ON public.qr_scans;
DROP POLICY IF EXISTS "anon insert" ON public.qr_scans;

CREATE POLICY "anon read"   ON public.qr_scans FOR SELECT TO anon USING (true);
-- INSERT is intentionally left open to anon so the redirect function can log scans
-- without requiring service-role credentials in a public-facing endpoint.
CREATE POLICY "anon insert" ON public.qr_scans FOR INSERT TO anon WITH CHECK (true);


-- ── Tool Events ──────────────────────────────────────────────
-- Lightweight usage log: which tool was run, by whom, when.
-- Fire-and-forget from the client. Used to drive the Tool Usage
-- chart in Analytics.
CREATE TABLE IF NOT EXISTS public.tool_events (
  id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id  TEXT         NOT NULL,
  used_by  TEXT         DEFAULT '',
  used_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tool_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read"   ON public.tool_events;
DROP POLICY IF EXISTS "anon insert" ON public.tool_events;

CREATE POLICY "anon read"   ON public.tool_events FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert" ON public.tool_events FOR INSERT TO anon WITH CHECK (true);


-- ── Asset Folders ─────────────────────────────────────────────
-- Hierarchical folder structure for the asset library.
-- parent_id = NULL means root level.
-- Deleting a folder cascades to all descendant folders.
-- Assets in deleted folders have folder_id set to NULL via ON DELETE SET NULL.
CREATE TABLE IF NOT EXISTS public.asset_folders (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT         NOT NULL,
  parent_id       UUID         REFERENCES public.asset_folders(id) ON DELETE CASCADE,
  created_by      TEXT         NOT NULL DEFAULT '',
  created_by_name TEXT                  DEFAULT '',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.asset_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read folders"  ON public.asset_folders;
DROP POLICY IF EXISTS "anon write folders" ON public.asset_folders;

CREATE POLICY "anon read folders"  ON public.asset_folders FOR SELECT TO anon USING (true);
CREATE POLICY "anon write folders" ON public.asset_folders FOR ALL    TO anon USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.asset_folders;

-- Add folder_id to assets — safe migration, no-op if column already exists
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS folder_id UUID
  REFERENCES public.asset_folders(id) ON DELETE SET NULL;

-- Add SEO/LLM metadata columns to assets (safe, no-op if already exist)
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS title    TEXT DEFAULT '';
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS alt_text TEXT DEFAULT '';

NOTIFY pgrst, 'reload schema';

-- ── Password Reset Requests ─────────────────────────────────────────────────
-- Stores admin-approval-gated password reset requests.
-- OTP code is stored here temporarily (max 15 min TTL) so the admin's
-- browser can generate it and the user's browser can retrieve it.
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id           TEXT PRIMARY KEY,
  email        TEXT NOT NULL,
  name         TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status       TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'approved' | 'denied' | 'used'
  otp_code     TEXT,         -- set by admin on approval (cleared on use)
  otp_expiry   BIGINT,       -- epoch ms — 15 min window after approval
  resolved_at  TIMESTAMPTZ
);

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read resets"   ON public.password_reset_requests;
DROP POLICY IF EXISTS "anon insert resets" ON public.password_reset_requests;
DROP POLICY IF EXISTS "anon update resets" ON public.password_reset_requests;
DROP POLICY IF EXISTS "anon delete resets" ON public.password_reset_requests;

CREATE POLICY "anon read resets"   ON public.password_reset_requests FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert resets" ON public.password_reset_requests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update resets" ON public.password_reset_requests FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon delete resets" ON public.password_reset_requests FOR DELETE TO anon USING (true);
