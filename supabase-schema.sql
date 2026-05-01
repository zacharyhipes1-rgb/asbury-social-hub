-- ============================================================
-- Asbury Social Hub — Supabase Schema
-- Run this entire script in: Dashboard → SQL Editor → New Query
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

-- Enable Row Level Security (open policy — internal tool, no public access)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON public.posts;
CREATE POLICY "Allow all" ON public.posts FOR ALL USING (true) WITH CHECK (true);

-- Enable real-time broadcasts for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;


-- ── Dealership Integrations ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dealership_integrations (
  dealership_id TEXT         NOT NULL,
  platform_id   TEXT         NOT NULL,
  fields        JSONB        DEFAULT '{}',
  updated_at    TIMESTAMPTZ  DEFAULT NOW(),
  PRIMARY KEY (dealership_id, platform_id)
);

ALTER TABLE public.dealership_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON public.dealership_integrations;
CREATE POLICY "Allow all" ON public.dealership_integrations FOR ALL USING (true) WITH CHECK (true);
