# Asbury Social Hub — Project Context
**Last Updated:** May 14, 2026
**Live URL:** https://asbury-social-hub.vercel.app/
**GitHub:** https://github.com/zacharyhipes1-rgb/asbury-social-hub
**Local Path:** `Found-First/Found-First - Code/asbury-social-staging/`

---

## What It Is

An internal social media content management platform built for Asbury Automotive Group dealerships. React + Vite app built with Claude Code. Allows dealership social media specialists to submit content for admin approval before publishing.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | React 18 + Vite 5 |
| Styling | Tailwind CSS |
| Database | Supabase (real-time, cross-device sync) |
| Deployment | Vercel |
| Auth | Custom (localStorage + password hash) |
| Icons | Lucide React |
| Charts | Recharts |
| Routing | React Router v6 |

**Supabase URL:** `https://asxvmslgpahpwewcmkyy.supabase.co`

**Required Vercel Env Vars:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Pages & Routes

| Route | Page | Access |
|---|---|---|
| `/login` | Login | Public |
| `/` | Dashboard | All users |
| `/upload` | Upload (5-step wizard) | Social media + Admin |
| `/calendar` | Content calendar | All users |
| `/admin` | Admin approval queue | Admin only |
| `/users` | User management | Admin only |
| `/settings` | Settings + integrations | Admin only |
| `/analytics` | Analytics + dealership scoreboard | All users |

---

## Roles

| Role | Permissions |
|---|---|
| `admin` | Full access — approve, flag, delete, manage users & settings |
| `social_media` | Upload content, view dashboard, calendar, analytics |
| `viewer` | Read-only — dashboard, calendar, analytics |

---

## Users

| Name | Email | Role | Title | Default Password |
|---|---|---|---|---|
| Chad Davis | cdavis@asburyauto.com | admin | DSC Sr. Manager | Demo2026! |
| Zach Hipes | zhipes@asburyauto.com | admin | SEO \| AEO Strategist | Demo2026! |
| Rikki Niblett | rniblett@asburyauto.com | social_media | DSC Social Specialist | Demo2026! |
| Ben Mcdaniel | bmcdaniel@asburyauto.com | social_media | DSC Social Specialist | Demo2026! |
| Chatham Ashmead | cashmead@asburyauto.com | viewer | DSC Digital Advisor | Demo2026! |
| Kathryn Tuck | ktuck@asburyauto.com | viewer | DSC Digital Advisor | Demo2026! |

---

## Dealerships (15 total)

| ID | Name | Location | Brand |
|---|---|---|---|
| nalley-honda | Nalley Honda | College Park, GA | Honda |
| nalley-bmw | Nalley BMW | Union City, GA | BMW |
| nalley-lexus | Nalley Lexus | Stone Mountain, GA | Lexus |
| nalley-acura | Nalley Acura | Marietta, GA | Acura |
| david-mcdavid-honda | David McDavid Honda | Irving, TX | Honda |
| david-mcdavid-acura | David McDavid Acura | Irving, TX | Acura |
| coggin-honda | Coggin Honda | Jacksonville, FL | Honda |
| coggin-toyota | Coggin Toyota | Orange Park, FL | Toyota |
| coggin-bmw | Coggin BMW | Fort Lauderdale, FL | BMW |
| crown-honda | Crown Honda | Dublin, OH | Honda |
| crown-acura | Crown Acura | Dublin, OH | Acura |
| north-point-bmw | North Point BMW | Alpharetta, GA | BMW |
| plaza-bmw | Plaza BMW | Kansas City, MO | BMW |
| courtesy-acura | Courtesy Acura | Scottsdale, AZ | Acura |
| asbury-corporate | Asbury Corporate | Duluth, GA | Corporate |

---

## Source File Structure

```
src/
├── App.jsx                          # Root app, routing
├── main.jsx                         # Entry point
├── index.css                        # Global styles
├── pages/
│   ├── DashboardPage.jsx            # Main dashboard — stats, post feed, alerts
│   ├── AdminPage.jsx                # Admin approval queue
│   ├── UploadPage.jsx               # Content submission (wraps FormWizard)
│   ├── CalendarPage.jsx             # Content calendar
│   ├── AnalyticsPage.jsx            # KPIs, recharts, per-dealership scoreboard
│   ├── UsersPage.jsx                # User management
│   ├── SettingsPage.jsx             # Settings + per-dealership integrations
│   └── LoginPage.jsx                # Auth screen
├── components/
│   ├── form/
│   │   ├── FormWizard.jsx           # 5-step upload wizard controller
│   │   ├── Step1Dealership.jsx      # Step 1: Select dealership
│   │   ├── Step2Platform.jsx        # Step 2: Select platform
│   │   ├── Step3ContentType.jsx     # Step 3: Content type
│   │   ├── Step4Upload.jsx          # Step 4: File upload
│   │   ├── Step5Optional.jsx        # Step 5: Optional fields
│   │   └── StepIndicator.jsx        # Progress indicator
│   ├── admin/
│   │   ├── AdminQueue.jsx           # Approval queue list + actions
│   │   └── NotificationModal.jsx    # Admin notification overlay
│   ├── calendar/
│   │   └── CalendarView.jsx         # Calendar grid component
│   ├── posts/
│   │   └── PostDetailModal.jsx      # Post detail overlay
│   ├── layout/
│   │   ├── Layout.jsx               # App shell
│   │   ├── Header.jsx               # Top nav
│   │   └── Sidebar.jsx              # Side nav
│   └── common/
│       ├── Badge.jsx                # StatusBadge, PlatformBadge
│       ├── Modal.jsx                # Generic modal
│       └── Toast.jsx                # Toast notifications
├── context/
│   ├── AuthContext.jsx              # Auth state — login, logout, roles
│   ├── PostsContext.jsx             # Posts state — Supabase fetch + real-time
│   ├── UsersContext.jsx             # Users state
│   └── ToastContext.jsx             # Toast state
├── data/
│   ├── dealerships.js               # 15 Asbury dealerships
│   ├── platforms.js                 # Social platforms (FB, IG, TikTok, LinkedIn, etc.)
│   └── mockData.js                  # 10 mock posts + 6 mock users (seed data)
├── lib/
│   └── supabase.js                  # Supabase client
├── services/
│   └── emailService.js              # Email notification service
└── utils/
    └── auth.js                      # Password hash helpers
```

---

## Database Schema (Supabase)

### `posts` table
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| dealership_id | TEXT | |
| platform | TEXT | |
| content_type | TEXT | |
| caption | TEXT | |
| hashtags | TEXT[] | |
| alt_text | TEXT | |
| file_name | TEXT | |
| file_size | BIGINT | |
| file_type | TEXT | |
| file_preview | TEXT | |
| file_url | TEXT | |
| target_audience | TEXT | |
| posting_reason | TEXT | |
| optimal_posting_time | TEXT | |
| uploaded_by | TEXT | Email |
| uploaded_by_name | TEXT | |
| uploaded_at | TIMESTAMPTZ | |
| scheduled_for | TEXT | |
| approval_status | TEXT | pending / approved / flagged / published / deleted |
| chad_notes | TEXT | Admin feedback |
| chad_action_at | TIMESTAMPTZ | |
| published_at | TIMESTAMPTZ | |

### `dealership_integrations` table
| Column | Type | Notes |
|---|---|---|
| dealership_id | TEXT | PK composite |
| platform_id | TEXT | PK composite |
| fields | JSONB | Platform-specific credentials |
| updated_at | TIMESTAMPTZ | |

---

## Full Update History (Git Log)

| Date | Time | Hash | Change |
|---|---|---|---|
| May 1 | 4:04 PM | 8ce7c57 | fix: remove content_pillar from schema set, apply toDb to updatePost |
| May 1 | 4:03 PM | 8be06bb | fix: strip unknown fields before Supabase insert (toDb helper) |
| May 1 | 3:46 PM | d32a48a | fix: await addPost in FormWizard + fix polling race condition |
| May 1 | 3:09 PM | 1a4f36d | fix: add 8s polling fallback alongside real-time subscription |
| May 1 | 2:38 PM | b42e4d2 | feat: migrate to Supabase for real-time cross-device sync |
| Apr 30 | — | be5765b | feat: sync posts state across browser tabs via storage event |
| Apr 30 | — | 9df15c1 | fix: preview persistence — save all non-blob URLs |
| Apr 30 | — | 67f6b77 | fix: Settings button styling and layout consistency |
| Apr 30 | — | 735885a | feat: rebuild Settings with per-dealership social account manager |
| Apr 30 | — | 5327ea7 | feat: add per-dealership sample engagement metrics |
| Apr 30 | — | 83b13f7 | feat: rebuild analytics around per-dealership scoreboard |
| Apr 30 | — | dce86af | feat: rebuild analytics — real workflow KPIs, recharts, dealership table |
| Apr 30 | — | fb45181 | fix: upload previews — video player in form, thumbnail in queue |
| Apr 28 | — | bd56f14 | fix: clean up approval queue table layout |
| Apr 27 | — | 855859d | fix: uploaded content not viewable after submit |
| Apr 27 | — | 6f23583 | feat: mobile calendar — tap date in month view to drill into week |
| Apr 27 | — | 28be374 | feat: mobile UX pass — card layout for approval queue |
| Apr 27 | — | cebf4bc | fix: remove redundant pending-review alert from dashboard |
| Apr 24 | — | b7671fb | revert: restore Upload Content in sidebar for admin users |
| Apr 24 | — | 0b96fcf | fix: hide Upload Content from admin sidebar |
| Apr 24 | — | e327e80 | feat: media thumbnails in approval queue + single-dealership week view |
| Apr 24 | — | f7cec73 | fix: declutter approval queue + Fun Slab White favicon |
| Apr 24 | — | a7bd4bc | feat: Fun Slab Navy A favicon set |
| Apr 24 | — | 8a09719 | fix: favicon + calendar weekly view polish |
| Apr 24 | — | de9bbeb | fix: revert UsersContext to stable version |
| Apr 24 | — | b3f5e7d | fix: login reliability + favicon + meta tags |
| Apr 24 | — | d7eb65b | feat: fix fake uploaders, add admin review hero on dashboard |
| Apr 24 | — | ff06846 | fix: patch stale Zach Hipes title from localStorage |
| Apr 24 | — | df575b3 | feat: mobile-friendly calendar — day strip + compact month grid |
| Apr 24 | — | ec43b99 | feat: replace mock users with real team, mobile responsiveness |
| Apr 24 | — | b26f93a | fix: correct Zach Hipes email to zhipes@asburyauto.com |
| Apr 24 | — | 7f3427f | feat: add Zach + Chad demo accounts, UX polish |
| Apr 24 | — | 2972c83 | feat: social media platform integrations in Settings |
| Apr 24 | — | d41f463 | feat: My Profile — all users can edit name, email, title, password |
| Apr 24 | — | 7949f81 | fix: allow email editing for team members |
| Apr 24 | — | 5910e27 | feat: upload wizard UX — dim unselected + sticky action bar |
| Apr 24 | — | a032e10 | fix: sync login demo account names with live user data |
| Apr 24 | — | af9c0fb | feat: permanent delete for team members |
| Apr 24 | — | e384b53 | feat: clickable stat cards, analytics page, upload CTA, wizard hints |
| Apr 24 | — | be4ce74 | feat: hashtag presets, content briefs, publishing flow, calendar upgrades |
| Apr 24 | — | 5b8c61b | fix: stale uploader names in AdminQueue and NotificationModal |
| Apr 24 | — | 80060ad | fix: live name lookup + Cloudinary upload integration |
| Apr 23 | — | c7ff644 | fix: Vercel SPA routing fix |
| Apr 23 | — | d97c9a7 | **Initial commit — Asbury Social Hub** |

---

## Last Known State (May 1, 2026 @ 4:04 PM)

The last work session focused entirely on the Supabase migration. The final bug fixed was `content_pillar` still existing in the form's field set despite not being a column in the Supabase `posts` table — causing silent insert failures. A `toDb()` whitelist helper was added to strip unknown fields before any Supabase write, and applied to both `addPost` (new submissions) and `updatePost` (flagged post revisions).

**To verify everything is working:** confirm a post submitted on one device/login appears on another without a page refresh.
