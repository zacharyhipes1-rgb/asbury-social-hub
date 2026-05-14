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
