# /calendar-views-and-mobile-pwa

## Scope

Two UX improvements:
1. Add monthly and quarterly views to /calendar with an OEM tentpole campaign overlay.
2. Convert the entire app to a mobile-first PWA with swipe-based approval gestures in /admin.

Touches: /calendar (new views and overlay data), entire app's responsive layout, /admin queue (swipe gestures on mobile), new `manifest.json` and service worker. Do not change data models other than the OEM events table below.

## Context

- Live reference: https://asbury-social-hub.vercel.app/calendar - week view only.
- Store managers approve on phones. Current /admin table layout will be unusable on a 390px viewport.
- OEM tentpole events drive a huge share of dealer marketing windows (Honda Big Driveway Sale, BMW Joy Days, Lexus December to Remember, Acura Open House, Toyotathon, etc.). They should be visible at a glance.

## Required reading before any code change

1. Read /calendar page implementation. Identify the date-range and drag-drop libraries already used.
2. Read /admin queue mobile rendering by resizing the dev viewport to 390px and noting overflow/breakage.
3. Read existing Tailwind/CSS breakpoints if used.

## Implementation requirements

### Part 1 - Monthly and quarterly calendar views

#### View selector

- Add Month and Quarter buttons next to existing Today/Week buttons in /calendar header.
- Persist user's last-used view in localStorage per user.

#### Month view

- Standard 5-or-6 week grid (Sun-Sat or Mon-Sun based on locale; default Mon-Sun).
- Each day cell shows count of posts per dealership filtered set, plus the OEM event overlay (see below).
- Click a day to drill into a day list showing every post scheduled.
- Drag-and-drop still works to reschedule across days.

#### Quarter view

- 13-week horizontal grid (rows = dealerships filtered, columns = weeks).
- Each cell = 1 week, shows post count and any active OEM event overlay color band.
- No drag-and-drop in quarter view; click to drill into week view.
- Useful for spotting publishing gaps across the portfolio.

#### OEM tentpole events overlay

- New table `oem_events`:
  - `id`, `brand` enum, `name`, `start_date`, `end_date`, `event_type` enum (`national_sale`, `model_launch`, `service_promotion`, `holiday`, `internal_asbury`), `description`, `source_url`
- Seed an initial set of 2026 OEM events. Admins can CRUD via a new `/calendar/events` admin page (Admin role only).
- Example seed entries (verify dates with current OEM calendars before shipping; placeholder dates here):
  - Honda Big Driveway Sale - June 1 to July 5
  - BMW Joy Days - September 15 to October 15
  - Lexus December to Remember - November 15 to January 5
  - Acura Open House Weekend - June and October (multi-instance)
  - Toyotathon - November 15 to January 5
- Events render as colored bands on the calendar background. Color by brand (use existing brand color tokens). On hover, show event name, dates, source URL.
- Filter: "Show OEM events" toggle (default on).
- Per-dealership filtering: events only show for dealerships whose brand matches.

#### Custom Asbury events

- Same `oem_events` table with `event_type = internal_asbury` and `brand = null`. Renders for all dealerships.
- Examples: Asbury Annual Sales Meeting, Asbury Q4 Push, internal training weeks.

### Part 2 - Mobile-first PWA conversion

#### PWA setup

- Create `public/manifest.json` with:
  - Name: "Asbury Social Hub"
  - Short name: "Social Hub"
  - Start URL: "/"
  - Display: "standalone"
  - Theme color: brand primary
  - Icons: 192x192 and 512x512 (PNG, maskable variants)
- Create service worker (use `next-pwa` if Next.js, or Vite PWA plugin if Vite). Configure:
  - Network-first for API calls.
  - Cache-first for static assets.
  - Offline fallback page at `/offline`.
- Add install prompt UI: discreet banner at the bottom for non-installed mobile users, dismissible.

#### Responsive layout audit

- Define breakpoints: mobile (< 768px), tablet (768-1023px), desktop (>= 1024px).
- Every existing page must be verified at 390px (iPhone SE 3), 412px (Pixel 7), 768px (iPad mini portrait), 1024px+ (desktop).
- Convert all tables to card layouts on mobile. Specifically:
  - /admin queue: each submission renders as a card with thumbnail, dealership, platform icon, caption preview, status badge, swipe gesture targets.
  - /analytics scoreboard: cards with key metrics top-line and expandable details.
  - /users: stacked cards with role badge.
  - /calendar week view on mobile: collapse to single-day view with day navigation.
- Navigation: convert top nav to bottom tab bar on mobile with the most-used 5 sections (Home, Calendar, Queue, Upload, Settings). Less-used sections accessible via "More" hamburger.

#### Swipe gestures in /admin (mobile only)

- Card-based queue on mobile.
- Swipe right > 60% of card width: approve. Show green confirmation with undo (5s window).
- Swipe left > 60%: open flag modal (cannot complete via swipe; require explicit reason).
- Long-press: open detail view.
- Use `react-use-gesture` or `framer-motion` (whichever the project already uses or can be added with minimal weight).
- Bulk actions still available via "Select" mode toggle.

#### Camera and gallery upload

- /upload Step 4 on mobile: surface "Take photo" and "Record video" buttons in addition to gallery picker, using HTML `capture` attribute. Native file picker fallback.

## Out of scope - do NOT

- Do NOT build a separate native app.
- Do NOT change the desktop layout for desktop users beyond the OEM event overlay.
- Do NOT add offline-first writes; service worker is read/cache focused. Submitting requires connectivity.
- Do NOT add push notifications in this command; that requires a separate push service setup.
- Do NOT redesign the visual brand or theme; only layout adapts.
- Do NOT change the drag-drop library if one is already chosen.

## Acceptance criteria

- /calendar Month and Quarter view buttons render correctly and switch views.
- Month view shows OEM event bands. Hover reveals event detail.
- Quarter view renders 13 weeks x N dealerships with counts.
- Adding an OEM event via /calendar/events makes it appear on the calendar within one page reload.
- Manifest.json loads correctly; Lighthouse PWA audit scores >= 90.
- Service worker installs and caches successfully.
- Mobile users see an install prompt banner (dismissible, remembers dismissal for 30 days).
- /admin queue on mobile renders as cards. Swipe right approves a pending submission. Swipe left opens the flag modal.
- All pages render without horizontal scroll at 390px width.
- Bottom tab bar appears on mobile and is hidden on desktop.
- /calendar week view collapses to single-day view on mobile.

## Verification

- Run Lighthouse audit on mobile viewport for /, /calendar, /admin. PWA score >= 90, Performance >= 80.
- Manually test on iPhone (Safari) and Android (Chrome) using the live deploy.
- Test offline behavior by toggling network in DevTools.
- Test swipe gestures with mouse drag simulation and on actual mobile devices.
