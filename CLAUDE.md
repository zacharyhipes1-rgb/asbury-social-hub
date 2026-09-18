# CLAUDE.md

Project overview and setup live in `PROJECT-CONTEXT.md`. Read that first for the app
itself (React 18 + Vite, Tailwind, Supabase, Vercel).

## Iron Tribe Fitness work

Any Iron Tribe Fitness work in this repo — landing pages, promos, posters, campaign
assets — must follow the official brand guidelines.

- **Guidelines:** `docs/brand/ITF_Brand_Guidelines.pdf` (authoritative)
- **Distilled tokens and rules:** `docs/brand/README.md` (read this first; it is greppable)

The short version: Iron Tribe Orange `#FF6F20` leads, Iron Tribe Red `#EF4040` is
secondary, and the two form the signature gradient. Headlines are Ridley Grotesk,
subheads DIN 2014 Narrow, body copy Avenir — with documented free web substitutes
(Archivo, Barlow Semi Condensed, Mulish) until licensed web fonts are self-hosted.
Do not introduce off-brand colors.

## Content-Security-Policy

`vercel.json` sets a strict CSP for every route. It allows scripts only from `'self'`,
inline, and `cdn.tailwindcss.com`. **Any page that pulls a script from another CDN will be
blocked at runtime**, so do not add CDN-hosted JavaScript libraries (GSAP, Three.js, etc.).
Build animation and interactivity with inline JS and CSS instead.

Fonts may come from `fonts.googleapis.com` / `fonts.gstatic.com` or be self-hosted.
Network calls are limited to Supabase, Cloudinary and EmailJS.

The Bring a Friend promo page is `public/iron-tribe-bring-a-friend.html`. Its offer is the
Fall 2026 **Rooted** campaign: a six week trial, $259 for group classes or $499 for personal
training, running 21 Sep to 30 Oct 2026, with the call to action being a text of the word
FRIEND to the location's phone number. The campaign document is the source of truth for every
offer fact. Do not restate the offer from memory and do not soften or sharpen it to suit copy.

One documented exception. The campaign document calls the incentive a "shoe voucher". The
client confirmed on 18 Sep 2026 that it is a full pair of shoes for both the member and the
friend, and asked the headline to lead on it. The page says "new shoes" on that authority, and
records the departure in its own comment block. Everything else still tracks the document, and
the condition on the shoes, a completed sign up, is unchanged. If the campaign document is
reissued, reconcile this first.

Two values must be set in the CONFIG block at the top of that page's script before it can go
live: the location phone number and the location name. Assets and the outstanding shot list
are in `docs/brand/rooted-asset-list.md`.

## Static marketing pages

Files in `public/` are served by Vercel ahead of the SPA rewrite, so a standalone HTML page
there resolves at its own URL without touching the React router. This is the preferred home
for one-off campaign pages.
