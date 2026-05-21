# Asbury Social Hub — Claude Code Instructions
# Phase 4: Email Fix, Performance Metrics, FB/IG Publishing

**Date:** 2026-05-15
**Author:** Zach Hipes (w/ Claude)

---

## Pre-flight diagnosis

**Email system status:**
- `emailService.js` is fully written with 5 exported functions
- `notifyNewUpload` fires correctly from `FormWizard.jsx`
- `notifyApproval`, `notifyRevision`, `notifyDeletion` fire from `NotificationModal.jsx`
- **Gap 1:** The Phase 1 instructions add Approve/Flag/Delete buttons directly into `PostDetailModal` — those bypass `NotificationModal` entirely, meaning no email fires when actions are taken from the detail view
- **Gap 2:** `notifyDueToday` is fully written but never called anywhere

**Metrics system status:**
- Does not exist yet. `metrics` column not in DB. `SCHEMA_FIELDS` does not include it.

**Publishing system status:**
- `publishPost(id)` currently only sets `approval_status = 'published'` in Supabase — no real API call made
- `dealership_integrations` table with `fields JSONB` exists — designed for credential storage

---

## TASK 4.1 — Wire email notifications into PostDetailModal

**File:** `src/components/posts/PostDetailModal.jsx`

**Context:** The Phase 1 changes added `handleApprove`, `handleFlag`, `handleDelete` directly in PostDetailModal. These actions work but send no email — they bypass the `NotificationModal` that AdminQueue uses. Wire the same notification functions directly into those handlers.

**Instructions:**

Open `src/components/posts/PostDetailModal.jsx`.

1. Add to imports at the top:
   ```
   import { useUsers } from '../../context/UsersContext'
   import { notifyApproval, notifyRevision, notifyDeletion } from '../../services/emailService'
   ```
   Note: `useUsers` may already be imported in this file — check before adding.

2. Inside the component, after the existing `const { isAdmin } = useAuth()` line, add:
   ```js
   const { getUserByEmail } = useUsers()
   const uploader = getUserByEmail(post.uploaded_by) || {
     name: post.uploaded_by_name,
     email: post.uploaded_by,
   }
   ```
   Note: `useUsers` hook is already imported — you're just destructuring `getUserByEmail` from it (it was previously used for `uploaderName`). Do not add a second `useUsers()` call. Merge the destructuring into the existing one.

3. Update `handleApprove` to fire the notification:
   ```js
   const handleApprove = async () => {
     setActionLoading(true)
     await approvePost(post.id, '')
     notifyApproval({ post, uploader, admin: currentUser, notes: '' }).catch(() => {})
     setActionLoading(false)
     onClose()
   }
   ```
   Note: `currentUser` must be destructured from `useAuth()`. Update that line from `const { isAdmin } = useAuth()` to `const { isAdmin, currentUser } = useAuth()`.

4. Update `handleFlag` to fire the notification after confirming:
   ```js
   const handleFlag = async () => {
     if (!flagNote.trim()) return
     setActionLoading(true)
     await flagPost(post.id, flagNote.trim())
     notifyRevision({ post, uploader, admin: currentUser, notes: flagNote.trim() }).catch(() => {})
     setActionLoading(false)
     setFlagMode(false)
     setFlagNote('')
     onClose()
   }
   ```

5. Update `handleDelete` to fire the notification:
   ```js
   const handleDelete = async () => {
     setActionLoading(true)
     await deletePost(post.id)
     notifyDeletion({ post, uploader, admin: currentUser, notes: '' }).catch(() => {})
     setActionLoading(false)
     setConfirmDelete(false)
     onClose()
   }
   ```
   Note: all three `.catch(() => {})` calls intentionally swallow errors — email failure should never block the UI action.

6. Run `npm run build`.

---

## TASK 4.2 — Wire notifyDueToday to fire on dashboard load

**File:** `src/pages/DashboardPage.jsx`

**Context:** `notifyDueToday` is defined in emailService.js but never called. Admins should get a morning briefing email listing all approved posts scheduled for today.

**Instructions:**

Open `src/pages/DashboardPage.jsx`.

1. Add to the imports at the top:
   ```
   import { notifyDueToday } from '../services/emailService'
   ```

2. `useEffect` and `useRef` are needed. Add `useRef` to the React import if not already present:
   ```
   import { useState, useMemo, useEffect, useRef } from 'react'
   ```

3. Inside the `DashboardPage` component, after the `dueTodayPosts` computation, add a one-time effect that fires the notification for admins only:
   ```js
   const dueTodayFiredRef = useRef(false)
   useEffect(() => {
     if (!isAdmin) return
     if (dueTodayFiredRef.current) return
     if (!dueTodayPosts.length) return
     dueTodayFiredRef.current = true
     const { getAdmins, getSocialMediaUsers } = useUsers() // already in scope
     notifyDueToday({
       posts: dueTodayPosts,
       socialTeam: getSocialMediaUsers ? getSocialMediaUsers() : [],
       admin: currentUser,
     }).catch(() => {})
   }, [isAdmin, dueTodayPosts.length]) // eslint-disable-line
   ```

   IMPORTANT: `useUsers()` is already called at the top of `DashboardPage` as `const { getAdmins } = useUsers()`. Extend that destructuring to also pull whatever user-list getter is available (look at what `UsersContext` exports — it likely has `getSocialMediaUsers` or `getAll`). Check `src/context/UsersContext.jsx` to confirm the available getter names before writing the destructuring.

   If there is no `getSocialMediaUsers` function, use:
   ```js
   const allUsers = getAllUsers ? getAllUsers() : []
   const socialTeam = allUsers.filter(u => u.role === 'social_media' && u.active)
   ```

4. Run `npm run build`.

---

## TASK 4.3 — Post performance metrics

### 4.3a — Supabase migration

Run this SQL in the Supabase dashboard SQL editor (`https://supabase.com/dashboard/project/asxvmslgpahpwewcmkyy/editor`):

```sql
-- Add metrics column to posts table
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{}';

-- Optional: add content_pillar at the same time (was noted as intentionally omitted
-- until the DB column exists — this is the moment to add it)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS content_pillar TEXT DEFAULT '';
```

### 4.3b — PostsContext

**File:** `src/context/PostsContext.jsx`

Open the file. Find the `SCHEMA_FIELDS` Set (around line 41):
```js
const SCHEMA_FIELDS = new Set([
  'id','dealership_id','platform','content_type','caption','hashtags','alt_text',
  'file_name','file_size','file_type','file_preview','file_url','target_audience',
  'posting_reason','optimal_posting_time','uploaded_by','uploaded_by_name',
  'uploaded_at','scheduled_for','approval_status','chad_notes','chad_action_at',
  'published_at',
  // content_pillar intentionally omitted until the DB column is added
])
```

Replace with:
```js
const SCHEMA_FIELDS = new Set([
  'id','dealership_id','platform','content_type','caption','hashtags','alt_text',
  'file_name','file_size','file_type','file_preview','file_url','target_audience',
  'posting_reason','optimal_posting_time','uploaded_by','uploaded_by_name',
  'uploaded_at','scheduled_for','approval_status','chad_notes','chad_action_at',
  'published_at','content_pillar','metrics',
])
```

Run `npm run build`.

### 4.3c — "Log Performance" UI in PostDetailModal

**File:** `src/components/posts/PostDetailModal.jsx`

Add a manual metrics entry form that appears on published posts.

1. Add state variables inside the component (after the existing action state):
   ```js
   const [metricsMode, setMetricsMode] = useState(false)
   const [metricsForm, setMetricsForm] = useState({
     impressions: '',
     reach: '',
     likes: '',
     comments: '',
     shares: '',
   })
   const [metricsSaving, setMetricsSaving] = useState(false)
   ```

2. Initialize the form from existing data. After the state declarations, add:
   ```js
   // Sync form when post.metrics changes externally (realtime update)
   useEffect(() => {
     if (post.metrics && Object.keys(post.metrics).length > 0) {
       setMetricsForm({
         impressions: post.metrics.impressions ?? '',
         reach:       post.metrics.reach       ?? '',
         likes:       post.metrics.likes       ?? '',
         comments:    post.metrics.comments    ?? '',
         shares:      post.metrics.shares      ?? '',
       })
     }
   }, [post.id]) // eslint-disable-line
   ```
   Note: `useEffect` must be imported — it was added in Task 4.1 above.

3. Add a save handler:
   ```js
   const handleSaveMetrics = async () => {
     setMetricsSaving(true)
     const parsed = {
       impressions: parseInt(metricsForm.impressions) || 0,
       reach:       parseInt(metricsForm.reach)       || 0,
       likes:       parseInt(metricsForm.likes)       || 0,
       comments:    parseInt(metricsForm.comments)    || 0,
       shares:      parseInt(metricsForm.shares)      || 0,
       updated_at:  new Date().toISOString(),
     }
     await updatePost(post.id, { metrics: parsed })
     setMetricsSaving(false)
     setMetricsMode(false)
   }
   ```
   Note: `updatePost` must be added to the `usePosts()` destructuring:
   ```js
   const { approvePost, flagPost, deletePost, updatePost } = usePosts()
   ```

4. In the JSX, find where the admin actions block ends. Add a separate metrics section that appears for published posts for ALL users (not just admins — social media users should be able to log performance for their own posts):

   ```jsx
   {post.approval_status === 'published' && (
     <div className="mt-5 pt-5 border-t border-slate-100">
       <div className="flex items-center justify-between mb-3">
         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Performance</p>
         {!metricsMode && (
           <button
             onClick={() => setMetricsMode(true)}
             className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
           >
             {post.metrics && Object.keys(post.metrics).some(k => post.metrics[k] > 0)
               ? 'Update'
               : 'Log metrics'}
           </button>
         )}
       </div>

       {/* Saved metrics display */}
       {!metricsMode && post.metrics && Object.keys(post.metrics).some(k => post.metrics[k] > 0) && (
         <div className="grid grid-cols-3 gap-2 mb-1">
           {[
             { key: 'impressions', label: 'Impressions' },
             { key: 'reach',       label: 'Reach'       },
             { key: 'likes',       label: 'Likes'       },
             { key: 'comments',    label: 'Comments'    },
             { key: 'shares',      label: 'Shares'      },
           ].filter(m => post.metrics[m.key] > 0).map(m => (
             <div key={m.key} className="bg-slate-50 rounded-lg p-2 text-center">
               <p className="text-sm font-bold text-slate-800">
                 {post.metrics[m.key].toLocaleString()}
               </p>
               <p className="text-[10px] text-slate-400">{m.label}</p>
             </div>
           ))}
         </div>
       )}

       {/* No metrics yet */}
       {!metricsMode && (!post.metrics || !Object.keys(post.metrics).some(k => post.metrics[k] > 0)) && (
         <p className="text-xs text-slate-400 italic">No performance data logged yet.</p>
       )}

       {/* Entry form */}
       {metricsMode && (
         <div>
           <div className="grid grid-cols-2 gap-2 mb-3">
             {[
               { key: 'impressions', label: 'Impressions', placeholder: '0' },
               { key: 'reach',       label: 'Reach',       placeholder: '0' },
               { key: 'likes',       label: 'Likes',       placeholder: '0' },
               { key: 'comments',    label: 'Comments',    placeholder: '0' },
               { key: 'shares',      label: 'Shares',      placeholder: '0' },
             ].map(m => (
               <div key={m.key}>
                 <label className="block text-xs text-slate-500 mb-1">{m.label}</label>
                 <input
                   type="number"
                   min="0"
                   value={metricsForm[m.key]}
                   onChange={e => setMetricsForm(prev => ({ ...prev, [m.key]: e.target.value }))}
                   placeholder={m.placeholder}
                   className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400"
                 />
               </div>
             ))}
           </div>
           <div className="flex gap-2">
             <button
               onClick={handleSaveMetrics}
               disabled={metricsSaving}
               className="flex-1 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
             >
               {metricsSaving ? 'Saving…' : 'Save'}
             </button>
             <button
               onClick={() => setMetricsMode(false)}
               className="py-2 px-4 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50"
             >
               Cancel
             </button>
           </div>
         </div>
       )}
     </div>
   )}
   ```

5. Run `npm run build`.

### 4.3d — Metrics in AnalyticsPage

**File:** `src/pages/AnalyticsPage.jsx`

Add an aggregate performance summary to the dealership scoreboard table.

1. Inside the component, add a computed metrics rollup per dealership. After the existing `dealershipHealth` or scoreboard computation, add:
   ```js
   const dealerMetrics = (dealershipId) => {
     const dealerPosts = posts.filter(p =>
       p.dealership_id === dealershipId &&
       p.approval_status === 'published' &&
       p.metrics &&
       Object.keys(p.metrics).length > 0
     )
     if (!dealerPosts.length) return null
     return dealerPosts.reduce((acc, p) => ({
       impressions: acc.impressions + (p.metrics.impressions || 0),
       reach:       acc.reach       + (p.metrics.reach       || 0),
       likes:       acc.likes       + (p.metrics.likes       || 0),
     }), { impressions: 0, reach: 0, likes: 0 })
   }
   ```

2. In the dealership scoreboard table, add three new columns: Impressions, Reach, Likes. In the table header:
   ```jsx
   <th className="...">Impressions</th>
   <th className="...">Reach</th>
   <th className="...">Likes</th>
   ```

3. In each table row, render the metrics:
   ```jsx
   {(() => {
     const m = dealerMetrics(dealership.id)
     return (
       <>
         <td className="px-4 py-3 text-sm text-slate-600">
           {m ? m.impressions.toLocaleString() : <span className="text-slate-300">—</span>}
         </td>
         <td className="px-4 py-3 text-sm text-slate-600">
           {m ? m.reach.toLocaleString() : <span className="text-slate-300">—</span>}
         </td>
         <td className="px-4 py-3 text-sm text-slate-600">
           {m ? m.likes.toLocaleString() : <span className="text-slate-300">—</span>}
         </td>
       </>
     )
   })()}
   ```

4. Run `npm run build`.

Commit Tasks 4.1–4.3:
```
git add -A
git commit -m "feat: Phase 4a — email notifications in PostDetailModal, notifyDueToday, post performance metrics"
git push
```

---

## TASK 4.4 — Facebook + Instagram API publishing

This is a significant architecture addition. Read this entire section before starting.

### What this adds

When an admin clicks "Publish" on an approved post, instead of just setting `approval_status = 'published'`, the app calls the real Facebook Graph API (for FB posts) or Instagram Content Publishing API (for IG posts). Other platforms continue to use the status-only approach until their APIs are added in a future phase.

### Prerequisites (manual steps before writing any code)

1. **Create a Facebook App**
   - Go to https://developers.facebook.com → My Apps → Create App
   - App type: Business
   - Add products: Facebook Login, Instagram Graph API
   - Add the following permissions to the app:
     - `pages_manage_posts`
     - `pages_read_engagement`
     - `instagram_basic`
     - `instagram_content_publish`
   - Under Facebook Login → Settings, add Authorized Redirect URIs:
     - `https://asbury-social-hub.vercel.app/api/fb-oauth-callback`
     - `http://localhost:5173/api/fb-oauth-callback` (for local testing)

2. **Get App credentials**
   - Copy App ID and App Secret from the app dashboard
   - Add to Vercel Environment Variables:
     - `FB_APP_ID` — the app ID
     - `FB_APP_SECRET` — the app secret
     - `APP_BASE_URL` — `https://asbury-social-hub.vercel.app`

3. **App Review note**
   - `pages_manage_posts` requires Facebook app review for live production use. During development, add Asbury test users (cdavis, zhipes) as app test users in the Facebook App dashboard under Roles. This bypasses app review for those accounts.

---

### 4.4a — Supabase: no schema change needed

`dealership_integrations` already exists with `fields JSONB`. The fields object for Facebook/Instagram will store:
```json
{
  "fb_page_id": "123456789",
  "fb_page_token": "EAAxxxxxx",
  "fb_page_name": "Nalley Honda",
  "ig_user_id": "987654321",
  "token_expires_at": "2026-07-14T00:00:00Z"
}
```

No migration needed.

---

### 4.4b — Vercel API routes

Create three files in the `api/` directory. All use `export default` (ESM).

---

**`api/fb-oauth-start.js`**

Called when admin clicks "Connect Facebook" in Settings. Returns the OAuth authorization URL.

```js
export default function handler(req, res) {
  const { dealershipId } = req.query
  if (!dealershipId) return res.status(400).json({ error: 'Missing dealershipId' })

  const params = new URLSearchParams({
    client_id:     process.env.FB_APP_ID,
    redirect_uri:  `${process.env.APP_BASE_URL}/api/fb-oauth-callback`,
    scope:         'pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish',
    response_type: 'code',
    state:         dealershipId,
  })

  res.status(200).json({
    url: `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`
  })
}
```

---

**`api/fb-oauth-callback.js`**

Facebook redirects here after the admin grants permissions. Exchanges the code for a long-lived page token and saves it to Supabase.

```js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // NOTE: service role key — NOT the anon key
)

export default async function handler(req, res) {
  const { code, state: dealershipId, error } = req.query

  if (error || !code || !dealershipId) {
    return res.redirect(302, `${process.env.APP_BASE_URL}/settings?fb_error=access_denied`)
  }

  try {
    // Step 1: Exchange code for short-lived user token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({
        client_id:     process.env.FB_APP_ID,
        client_secret: process.env.FB_APP_SECRET,
        redirect_uri:  `${process.env.APP_BASE_URL}/api/fb-oauth-callback`,
        code,
      })
    )
    const tokenData = await tokenRes.json()
    if (tokenData.error) throw new Error(tokenData.error.message)

    const shortToken = tokenData.access_token

    // Step 2: Exchange for long-lived user token (60 days)
    const longRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({
        grant_type:        'fb_exchange_token',
        client_id:         process.env.FB_APP_ID,
        client_secret:     process.env.FB_APP_SECRET,
        fb_exchange_token: shortToken,
      })
    )
    const longData = await longRes.json()
    if (longData.error) throw new Error(longData.error.message)
    const longToken = longData.access_token

    // Step 3: Get the Pages this user manages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${longToken}`
    )
    const pagesData = await pagesRes.json()
    if (!pagesData.data?.length) throw new Error('No Facebook Pages found for this account')

    // Use the first page (admin can be prompted to select if multiple pages exist)
    const page = pagesData.data[0]
    const pageToken = page.access_token // Page tokens do not expire if the long-lived user token is valid

    // Step 4: Get connected Instagram Business account (if any)
    let igUserId = null
    try {
      const igRes = await fetch(
        `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${pageToken}`
      )
      const igData = await igRes.json()
      igUserId = igData.instagram_business_account?.id || null
    } catch {}

    // Step 5: Compute token expiry (60 days from now)
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

    // Step 6: Upsert into dealership_integrations
    // Each platform (facebook, instagram) gets its own row but shares the same token data
    const sharedFields = {
      fb_page_id:        page.id,
      fb_page_name:      page.name,
      fb_page_token:     pageToken,
      ig_user_id:        igUserId,
      token_expires_at:  expiresAt,
    }

    await supabase.from('dealership_integrations').upsert([
      { dealership_id: dealershipId, platform_id: 'facebook',  fields: sharedFields, updated_at: new Date().toISOString() },
      ...(igUserId ? [{ dealership_id: dealershipId, platform_id: 'instagram', fields: sharedFields, updated_at: new Date().toISOString() }] : [])
    ], { onConflict: 'dealership_id,platform_id' })

    // Redirect back to settings with success flag
    res.redirect(302, `${process.env.APP_BASE_URL}/settings?fb_connected=${dealershipId}`)
  } catch (err) {
    console.error('FB OAuth error:', err)
    res.redirect(302, `${process.env.APP_BASE_URL}/settings?fb_error=${encodeURIComponent(err.message)}`)
  }
}
```

**IMPORTANT:** This route uses `SUPABASE_SERVICE_ROLE_KEY`, not the anon key. The service role key bypasses RLS and is needed to write to `dealership_integrations` from a server-side route. Add it to Vercel Environment Variables (never expose it client-side). Find it in Supabase dashboard → Project Settings → API → service_role key.

---

**`api/publish-post.js`**

Called when an admin publishes a post to FB or IG. Reads the dealership's token from Supabase, calls the platform API, and returns the platform post ID on success.

```js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getIntegration(dealershipId, platformId) {
  const { data } = await supabase
    .from('dealership_integrations')
    .select('fields')
    .eq('dealership_id', dealershipId)
    .eq('platform_id', platformId)
    .single()
  return data?.fields || null
}

async function publishToFacebook({ fields, post }) {
  const { fb_page_id, fb_page_token } = fields

  if (post.file_url && post.file_type?.startsWith('image/')) {
    // Photo post
    const body = new URLSearchParams({
      url:          post.file_url,
      caption:      post.caption || '',
      access_token: fb_page_token,
    })
    const res = await fetch(`https://graph.facebook.com/v19.0/${fb_page_id}/photos`, {
      method: 'POST',
      body,
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    return data.id

  } else if (post.file_url && post.file_type?.startsWith('video/')) {
    // Video post (Reels-style)
    const body = new URLSearchParams({
      file_url:     post.file_url,
      description:  post.caption || '',
      access_token: fb_page_token,
    })
    const res = await fetch(`https://graph.facebook.com/v19.0/${fb_page_id}/videos`, {
      method: 'POST',
      body,
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    return data.id

  } else {
    // Text-only post
    const body = new URLSearchParams({
      message:      post.caption || '',
      access_token: fb_page_token,
    })
    const res = await fetch(`https://graph.facebook.com/v19.0/${fb_page_id}/feed`, {
      method: 'POST',
      body,
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    return data.id
  }
}

async function publishToInstagram({ fields, post }) {
  const { ig_user_id, fb_page_token } = fields
  if (!ig_user_id) throw new Error('No Instagram Business account connected for this dealership')

  let mediaType
  if (post.file_type?.startsWith('video/')) mediaType = 'REELS'
  else if (post.file_type?.startsWith('image/')) mediaType = 'IMAGE'
  else throw new Error('Instagram requires an image or video file')

  // Step 1: Create media container
  const containerParams = new URLSearchParams({
    caption:      post.caption || '',
    access_token: fb_page_token,
  })
  if (mediaType === 'IMAGE') containerParams.set('image_url', post.file_url)
  if (mediaType === 'REELS') {
    containerParams.set('media_type', 'REELS')
    containerParams.set('video_url', post.file_url)
  } else {
    containerParams.set('media_type', 'IMAGE')
  }

  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/${ig_user_id}/media`,
    { method: 'POST', body: containerParams }
  )
  const containerData = await containerRes.json()
  if (containerData.error) throw new Error(containerData.error.message)

  const containerId = containerData.id

  // Step 2: For videos, poll until container is ready (FINISHED status)
  if (mediaType === 'REELS') {
    let attempts = 0
    while (attempts < 12) {
      await new Promise(r => setTimeout(r, 5000)) // wait 5s per attempt
      const statusRes = await fetch(
        `https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${fb_page_token}`
      )
      const statusData = await statusRes.json()
      if (statusData.status_code === 'FINISHED') break
      if (statusData.status_code === 'ERROR') throw new Error('Instagram video processing failed')
      attempts++
    }
  }

  // Step 3: Publish the container
  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${ig_user_id}/media_publish`,
    {
      method: 'POST',
      body: new URLSearchParams({
        creation_id: containerId,
        access_token: fb_page_token,
      }),
    }
  )
  const publishData = await publishRes.json()
  if (publishData.error) throw new Error(publishData.error.message)
  return publishData.id
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { post } = req.body || {}
  if (!post?.id || !post?.dealership_id || !post?.platform) {
    return res.status(400).json({ error: 'Missing required post fields' })
  }

  const fields = await getIntegration(post.dealership_id, post.platform)
  if (!fields?.fb_page_token) {
    return res.status(422).json({
      error: `No ${post.platform} integration configured for ${post.dealership_id}. Connect it in Settings first.`
    })
  }

  try {
    let platformPostId
    if (post.platform === 'facebook') {
      platformPostId = await publishToFacebook({ fields, post })
    } else if (post.platform === 'instagram') {
      platformPostId = await publishToInstagram({ fields, post })
    } else {
      return res.status(422).json({
        error: `Platform "${post.platform}" does not support API publishing yet. Use manual publish.`
      })
    }

    return res.status(200).json({ success: true, platformPostId })
  } catch (err) {
    console.error('Publish error:', err)
    return res.status(500).json({ error: err.message || 'Publish failed' })
  }
}
```

---

### 4.4c — PostsContext: add publishPost with API call

**File:** `src/context/PostsContext.jsx`

Find the existing `publishPost` function. It currently sets `approval_status = 'published'` and `published_at`. Update it to attempt real API publishing for FB/IG:

Replace the existing `publishPost` with:
```js
const publishPost = async (id, { useApi = false } = {}) => {
  const post = posts.find(p => p.id === id)
  if (!post) return { error: 'Post not found' }

  if (useApi && (post.platform === 'facebook' || post.platform === 'instagram')) {
    // Attempt real API publish
    try {
      const res = await fetch('/api/publish-post', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ post }),
      })
      const data = await res.json()
      if (!res.ok) {
        return { error: data.error || 'Publish failed' }
      }
    } catch (err) {
      return { error: err.message || 'Network error during publish' }
    }
  }

  // Mark as published in Supabase regardless
  const now = new Date().toISOString()
  const updates = { approval_status: 'published', published_at: now }
  dispatch({ type: 'UPDATE', payload: { id, updates } })
  const { error } = await supabase.from('posts').update(toDb(updates)).eq('id', id)
  if (error) dispatch({ type: 'UPDATE', payload: { id, updates: { approval_status: 'approved' } } })

  return { error: error?.message || null }
}
```

Note: the second parameter `{ useApi = false }` is a default that keeps the existing callers working unchanged — they get status-only publish. Only the new publish button passes `{ useApi: true }`.

Also expose `publishPost` through the context value object. Verify it's already in the returned context object — if so, no change needed there.

---

### 4.4d — "Connect Facebook" button in SettingsPage

**File:** `src/pages/SettingsPage.jsx`

Open the file. Find the per-dealership integration section (the part that maps over DEALERSHIPS and shows platform connection settings). For each dealership row that shows Facebook or Instagram:

1. Add a "Connect Facebook" button that initiates the OAuth flow:
   ```jsx
   <button
     onClick={async () => {
       const res = await fetch(`/api/fb-oauth-start?dealershipId=${dealership.id}`)
       const { url, error } = await res.json()
       if (error) { addToast(error, 'error'); return }
       window.location.href = url
     }}
     className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
   >
     Connect Facebook / Instagram
   </button>
   ```

2. Show "Connected" state when `dealership_integrations` data exists for that dealership + facebook:
   ```jsx
   {integration?.fields?.fb_page_name ? (
     <div className="flex items-center gap-2 text-sm text-emerald-700">
       <CheckCircle size={14} />
       <span>{integration.fields.fb_page_name}</span>
       {integration.fields.ig_user_id && (
         <span className="text-slate-400">+ Instagram</span>
       )}
     </div>
   ) : (
     // show Connect button above
   )}
   ```

3. After a successful OAuth redirect, Vercel redirects to `/settings?fb_connected=<dealershipId>`. Add a `useEffect` at the top of SettingsPage to detect this query param and show a success toast:
   ```js
   const [searchParams] = useSearchParams() // from react-router-dom, already imported
   useEffect(() => {
     const connected = searchParams.get('fb_connected')
     const fbError   = searchParams.get('fb_error')
     if (connected) addToast(`Facebook connected for ${DEALERSHIPS.find(d => d.id === connected)?.name || connected}`, 'success')
     if (fbError)   addToast(`Connection failed: ${decodeURIComponent(fbError)}`, 'error')
   }, []) // eslint-disable-line
   ```

---

### 4.4e — "Publish to Platform" button in AdminQueue

**File:** `src/components/admin/AdminQueue.jsx`

Update the existing Publish button (the `<Send>` icon that appears when `approval_status === 'approved'`) to use the new API-backed publish for FB/IG.

Find `handlePublish`:
```js
const handlePublish = (post) => {
  publishPost(post.id)
  addToast(`Marked as published: ...`, 'success')
}
```

Replace with:
```js
const [publishing, setPublishing] = useState(null) // stores post.id while publishing

const handlePublish = async (post) => {
  const isApiPlatform = post.platform === 'facebook' || post.platform === 'instagram'
  setPublishing(post.id)

  const result = await publishPost(post.id, { useApi: isApiPlatform })

  setPublishing(null)

  if (result?.error) {
    addToast(`Publish failed: ${result.error}`, 'error')
  } else {
    addToast(
      isApiPlatform
        ? `Published to ${getPlatform(post.platform)?.name}: ${DEALERSHIPS.find(d => d.id === post.dealership_id)?.name}`
        : `Marked as published: ${getPlatform(post.platform)?.name} · ${DEALERSHIPS.find(d => d.id === post.dealership_id)?.name}`,
      'success'
    )
  }
}
```

Update the Send button to show a spinner while publishing:
```jsx
<button
  onClick={() => handlePublish(post)}
  disabled={publishing === post.id}
  title="Publish"
  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
>
  {publishing === post.id
    ? <span className="w-3.5 h-3.5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin block" />
    : <Send size={14} />
  }
</button>
```

---

### 4.4f — Run build and deploy

```
npm run build
git add -A
git commit -m "feat: Phase 4b — FB/IG API publishing via Graph API v19, per-dealership OAuth, Settings connect flow"
git push
```

After deploy, test in this order:
1. Go to Settings → connect Facebook for Nalley Honda (sandbox/test)
2. Verify `dealership_integrations` row shows up in Supabase with `fb_page_id` and `fb_page_token`
3. Submit a test post for Nalley Honda Facebook
4. Admin approves → clicks Publish → spinner → success toast
5. Verify the post appears on the Facebook Page
6. If IG Business account is linked to the Page, verify IG post also publishes

---

## Verification checklist

- [ ] Approve a post via PostDetailModal → uploader receives approval email
- [ ] Flag a post via PostDetailModal → uploader receives revision request email with note
- [ ] Delete a post via PostDetailModal → uploader receives deletion email
- [ ] Dashboard loads for admin when posts are due today → `notifyDueToday` fires (check notification log in Settings)
- [ ] Open a published post → "Performance" section appears with "Log metrics" link
- [ ] Log impressions and reach for a published post → numbers save and display in the modal
- [ ] Analytics page dealership table shows Impressions / Reach / Likes columns
- [ ] Settings → Connect Facebook for a dealership → OAuth flow completes → success toast
- [ ] Approve a Facebook post → Publish button → real post appears on Facebook Page
- [ ] Non-FB/IG platforms (TikTok, LinkedIn) → Publish button still works as status-only

---

## Open questions before shipping publishing

1. **Multiple Pages per dealership:** The OAuth callback takes the first Page the user manages. If a franchise admin manages multiple FB Pages, they'll need a Page selector UI. For now, one Page per dealership is the assumption.

2. **Token rotation:** Long-lived tokens expire in 60 days. There is currently no automatic refresh logic. Add a cron job or a Settings-page warning when `token_expires_at` is within 7 days of expiry.

3. **Content moderation / publish errors:** Facebook can reject posts for policy violations. The error is surfaced as a toast but not logged to the post record. Consider writing publish errors back to a `publish_error` field so admins can see what failed.

4. **Carousel / multi-image posts:** Not supported in this spec. Both FB and IG support carousel posts but they require multiple media uploads and a different API call pattern. Future scope.
