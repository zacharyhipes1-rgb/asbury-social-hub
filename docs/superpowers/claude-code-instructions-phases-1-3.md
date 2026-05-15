# Asbury Social Hub — Claude Code Implementation Instructions
# Phases 1–3: 12 Improvements

**Date:** 2026-05-15
**Author:** Zach Hipes (w/ Claude)
**Status:** Triple-checked, ready to paste

---

## Pre-flight notes

- Project root: `Found-First/Found-First - Code/asbury-social-staging/`
- All paths below are relative to project root unless noted
- `"type": "module"` is set in `package.json` — all Vercel API routes must use `export default`, never `module.exports`
- Auth hook: `useAuth()` from `../../context/AuthContext` — exports `currentUser`, `isAdmin`, `isSocialMedia`
- Posts hook: `usePosts()` from `../../context/PostsContext` — exports `approvePost(id, notes='')`, `flagPost(id, notes)`, `deletePost(id)`, `addPost(data)`, `publishPost(id)`
- Run `npm run build` after each task to catch syntax errors before moving on

---

## PHASE 1 — Critical Workflow Fixes

### Task 1.1 — Admin action buttons in PostDetailModal + chad_notes display

**File:** `src/components/posts/PostDetailModal.jsx`

**Context:** This modal is currently read-only. It shows media, caption, and metadata but has no approve/flag/delete buttons. Admins must close the modal and use unlabeled icon buttons in the queue table row. The `chad_notes` field (admin feedback) exists in the DB schema but is never displayed anywhere — uploaders can't see why their post was flagged.

**Instructions:**

Open `src/components/posts/PostDetailModal.jsx`.

1. Add these imports at the top of the file:
   ```
   import { useState } from 'react'
   import { usePosts } from '../../context/PostsContext'
   import { useAuth } from '../../context/AuthContext'
   ```

2. Inside the `PostDetailModal` function body, after the existing `const { getUserByEmail } = useUsers()` line, add:
   ```
   const { approvePost, flagPost, deletePost } = usePosts()
   const { isAdmin } = useAuth()
   const [flagMode, setFlagMode] = useState(false)
   const [flagNote, setFlagNote] = useState('')
   const [confirmDelete, setConfirmDelete] = useState(false)
   const [actionLoading, setActionLoading] = useState(false)

   const handleApprove = async () => {
     setActionLoading(true)
     await approvePost(post.id, '')
     setActionLoading(false)
     onClose()
   }

   const handleFlag = async () => {
     if (!flagNote.trim()) return
     setActionLoading(true)
     await flagPost(post.id, flagNote.trim())
     setActionLoading(false)
     setFlagMode(false)
     setFlagNote('')
     onClose()
   }

   const handleDelete = async () => {
     setActionLoading(true)
     await deletePost(post.id)
     setActionLoading(false)
     setConfirmDelete(false)
     onClose()
   }
   ```

3. In the JSX, find the `{/* Caption */}` section. Directly BEFORE that section, insert the admin notes banner that appears when a post is flagged and has a note:
   ```jsx
   {post.approval_status === 'flagged' && post.chad_notes && (
     <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
       <p className="text-xs font-semibold text-amber-700 mb-1 uppercase tracking-wide">Admin Notes</p>
       <p className="text-sm text-amber-900 leading-relaxed">{post.chad_notes}</p>
     </div>
   )}
   ```

4. At the very end of the `<div className="p-6">` block (before its closing tag, after all existing content), add the admin action buttons section:
   ```jsx
   {isAdmin && (
     <div className="mt-6 pt-5 border-t border-slate-100">
       {!flagMode && !confirmDelete && post.approval_status !== 'deleted' && post.approval_status !== 'published' && (
         <div className="flex gap-2">
           {post.approval_status !== 'approved' && (
             <button
               onClick={handleApprove}
               disabled={actionLoading}
               className="flex-1 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
             >
               {actionLoading ? 'Saving…' : 'Approve'}
             </button>
           )}
           {post.approval_status !== 'flagged' && (
             <button
               onClick={() => setFlagMode(true)}
               disabled={actionLoading}
               className="flex-1 py-2.5 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors"
             >
               Flag
             </button>
           )}
           <button
             onClick={() => setConfirmDelete(true)}
             disabled={actionLoading}
             className="py-2.5 px-4 bg-red-50 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-100 border border-red-200 disabled:opacity-50 transition-colors"
           >
             Delete
           </button>
         </div>
       )}

       {flagMode && (
         <div>
           <p className="text-sm font-medium text-slate-700 mb-2">Reason for revision request:</p>
           <textarea
             value={flagNote}
             onChange={e => setFlagNote(e.target.value)}
             placeholder="Tell the uploader what needs to change…"
             rows={3}
             className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl resize-none focus:outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all"
           />
           <div className="flex gap-2 mt-2">
             <button
               onClick={handleFlag}
               disabled={!flagNote.trim() || actionLoading}
               className="flex-1 py-2.5 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors"
             >
               {actionLoading ? 'Saving…' : 'Send for Revision'}
             </button>
             <button
               onClick={() => { setFlagMode(false); setFlagNote('') }}
               className="py-2.5 px-4 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
             >
               Cancel
             </button>
           </div>
         </div>
       )}

       {confirmDelete && (
         <div>
           <p className="text-sm text-slate-700 mb-3">Remove this post from the queue? This cannot be undone.</p>
           <div className="flex gap-2">
             <button
               onClick={handleDelete}
               disabled={actionLoading}
               className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
             >
               {actionLoading ? 'Deleting…' : 'Confirm Delete'}
             </button>
             <button
               onClick={() => setConfirmDelete(false)}
               className="py-2.5 px-4 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
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

---

### Task 1.2 — Media thumbnails in Dashboard Recent Submissions

**File:** `src/pages/DashboardPage.jsx`

**Context:** The AdminQueue desktop table already shows thumbnails. DashboardPage's `PostRow` component does not — it only shows dealership name and location. Add a thumbnail as the first column.

**Instructions:**

Open `src/pages/DashboardPage.jsx`.

1. The `File` icon is already imported from lucide-react. No new imports needed.

2. Find the `PostRow` component function (around line 37). In the JSX `<tr>`, the first `<td>` currently renders dealership name/location only:
   ```jsx
   <td className="px-5 py-3.5 cursor-pointer" onClick={() => onClick(post)}>
     <p className="text-sm font-semibold text-slate-800">{dealership?.name}</p>
     <p className="text-xs text-slate-400 mt-0.5">{dealership?.location}</p>
   </td>
   ```

   Replace that single `<td>` with these two cells (split thumbnail and dealership info):
   ```jsx
   <td className="px-5 py-3.5 w-12" onClick={() => onClick(post)}>
     {(post.file_url || post.file_preview) ? (
       <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 bg-slate-100 flex-shrink-0 cursor-pointer relative">
         {post.file_type?.startsWith('video/') ? (
           <video src={post.file_url || post.file_preview} className="w-full h-full object-cover" muted />
         ) : (
           <img src={post.file_url || post.file_preview} alt="" className="w-full h-full object-cover" />
         )}
         {post.file_type?.startsWith('video/') && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/30">
             <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
               <path d="M8 5v14l11-7z"/>
             </svg>
           </div>
         )}
       </div>
     ) : post.file_name ? (
       <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
         <File size={14} className="text-slate-400" />
       </div>
     ) : null}
   </td>
   <td className="px-5 py-3.5 cursor-pointer" onClick={() => onClick(post)}>
     <p className="text-sm font-semibold text-slate-800">{dealership?.name}</p>
     <p className="text-xs text-slate-400 mt-0.5">{dealership?.location}</p>
   </td>
   ```

3. Add a matching `<th>` to the table header. Find the `<thead>` row that renders column headers in the Recent Submissions table and add an empty header cell as the first column:
   ```jsx
   <th className="px-5 py-3 w-12" />
   ```
   before the existing first header cell.

4. Run `npm run build`.

---

### Task 1.3 — Bulk approve with checkboxes in AdminQueue

**File:** `src/components/admin/AdminQueue.jsx`

**Context:** No bulk selection exists. Admins must approve each post individually. Add checkboxes to the desktop table with a "Approve All (N)" action bar.

**Instructions:**

Open `src/components/admin/AdminQueue.jsx`.

1. `useState` is already imported. Add two new state variables inside the `AdminQueue` component, after the existing state declarations:
   ```
   const [selectedIds, setSelectedIds] = useState(new Set())
   ```

2. Add a computed list of the pending posts from `filtered` (not all posts — only currently visible pending posts should be selectable):
   ```
   const selectablePosts = filtered.filter(p =>
     p.approval_status !== 'deleted' && p.approval_status !== 'published'
   )
   ```

3. Find the desktop table `<thead>` section. It currently renders column headers in a `.map()` over an array:
   ```jsx
   {['Dealership', 'Platform & Type', 'Caption', 'Uploader', 'Scheduled', 'Status', 'Actions'].map(h => (
     <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
       {h}
     </th>
   ))}
   ```

   Replace this entire block with explicit header cells so you can prepend the checkbox column:
   ```jsx
   <th className="pl-5 pr-2 py-3 w-10">
     <input
       type="checkbox"
       checked={selectedIds.size > 0 && selectedIds.size === selectablePosts.length}
       ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < selectablePosts.length }}
       onChange={e => {
         if (e.target.checked) setSelectedIds(new Set(selectablePosts.map(p => p.id)))
         else setSelectedIds(new Set())
       }}
       className="rounded border-slate-300 text-indigo-600"
     />
   </th>
   {['Dealership', 'Platform & Type', 'Caption', 'Uploader', 'Scheduled', 'Status', 'Actions'].map(h => (
     <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
       {h}
     </th>
   ))}
   ```

4. In the `<tbody>`, find the `<tr>` for each post row (around line 305):
   ```jsx
   <tr key={post.id} className="hover:bg-slate-50/70 transition-colors group">
   ```

   Add a checkbox `<td>` as the FIRST cell in the row, before the Dealership cell:
   ```jsx
   <td className="pl-5 pr-2 py-3.5 w-10">
     {post.approval_status !== 'deleted' && post.approval_status !== 'published' && (
       <input
         type="checkbox"
         checked={selectedIds.has(post.id)}
         onChange={e => {
           const next = new Set(selectedIds)
           if (e.target.checked) next.add(post.id)
           else next.delete(post.id)
           setSelectedIds(next)
         }}
         onClick={e => e.stopPropagation()}
         className="rounded border-slate-300 text-indigo-600"
       />
     )}
   </td>
   ```

5. Add the bulk action bar. Find the `{/* Table */}` comment (around line 201) and directly ABOVE the `<div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">` container, insert:
   ```jsx
   {selectedIds.size > 0 && (
     <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl">
       <span className="text-sm font-medium text-indigo-800">
         {selectedIds.size} post{selectedIds.size !== 1 ? 's' : ''} selected
       </span>
       <button
         onClick={async () => {
           for (const id of [...selectedIds]) {
             await approvePost(id, '')
           }
           addToast(`Approved ${selectedIds.size} post${selectedIds.size !== 1 ? 's' : ''}.`, 'success')
           setSelectedIds(new Set())
         }}
         className="px-4 py-1.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
       >
         Approve All ({selectedIds.size})
       </button>
       <button
         onClick={() => setSelectedIds(new Set())}
         className="text-sm text-indigo-600 hover:text-indigo-800"
       >
         Clear
       </button>
     </div>
   )}
   ```

6. `approvePost` is already destructured from `usePosts()` at line 66. `addToast` is already destructured from `useToast()`. No new imports needed.

7. Run `npm run build`.

---

### Task 1.4 — Admin upload link in sidebar

**File:** `src/components/layout/Sidebar.jsx`

**Context:** The "Upload Content" nav item is gated behind `{isSocialMedia && ...}`. Admins have upload rights but no sidebar link to `/upload`.

**Instructions:**

Open `src/components/layout/Sidebar.jsx`.

Find line 74:
```jsx
{isSocialMedia && (
  <NavItem to="/upload" icon={Upload} label="Upload Content" onClick={onClose} />
)}
```

Change to:
```jsx
{(isSocialMedia || isAdmin) && (
  <NavItem to="/upload" icon={Upload} label="Upload Content" onClick={onClose} />
)}
```

That is the only change to this file.

Run `npm run build`.

Commit Phase 1:
```
git add -A
git commit -m "feat: Phase 1 — PostDetailModal admin actions, dashboard thumbnails, bulk approve, admin upload nav"
git push
```

---

## PHASE 2 — Platform Improvements

### Task 2.1 — Analytics charts (weekly bar + platform donut)

**File:** `src/pages/AnalyticsPage.jsx`

**Context:** The analytics page goes straight to a dealership table. Recharts and date-fns are already installed. Add two charts above the table using posts data that's already loaded in context.

**Instructions:**

Open `src/pages/AnalyticsPage.jsx`.

1. Add to the existing imports at the top:
   ```
   import {
     BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
     PieChart, Pie, Cell
   } from 'recharts'
   import { subDays, startOfDay, format } from 'date-fns'
   ```
   (Add only what isn't already imported. `date-fns` may already have some of these — check first.)

2. Inside the component function, after the existing data derivations, add:
   ```js
   // Weekly bar chart — last 7 days
   const weeklyData = Array.from({ length: 7 }, (_, i) => {
     const day = subDays(new Date(), 6 - i)
     const dayStart = startOfDay(day).getTime()
     const dayEnd = dayStart + 86_400_000
     return {
       day: format(day, 'EEE'),
       posts: posts.filter(p => {
         const t = new Date(p.uploaded_at).getTime()
         return t >= dayStart && t < dayEnd
       }).length
     }
   })

   // Platform donut
   const platformCounts = posts.reduce((acc, p) => {
     if (p.approval_status === 'deleted') return acc
     acc[p.platform] = (acc[p.platform] || 0) + 1
     return acc
   }, {})
   const platformData = Object.entries(platformCounts)
     .map(([name, value]) => ({ name, value }))
     .sort((a, b) => b.value - a.value)

   const CHART_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899']
   ```

3. In the JSX, find where the dealership scoreboard/table begins. Insert the two-column chart grid DIRECTLY ABOVE it:
   ```jsx
   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
     {/* Weekly submissions */}
     <div className="bg-white rounded-2xl border border-slate-200 p-5">
       <p className="text-sm font-semibold text-slate-700 mb-4">Submissions — Last 7 Days</p>
       <ResponsiveContainer width="100%" height={180}>
         <BarChart data={weeklyData} barSize={30}>
           <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
           <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={20} />
           <Tooltip
             contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: 'none' }}
             cursor={{ fill: '#f1f5f9' }}
           />
           <Bar dataKey="posts" fill="#6366f1" radius={[4, 4, 0, 0]} />
         </BarChart>
       </ResponsiveContainer>
     </div>

     {/* Platform breakdown */}
     <div className="bg-white rounded-2xl border border-slate-200 p-5">
       <p className="text-sm font-semibold text-slate-700 mb-4">By Platform</p>
       {platformData.length === 0 ? (
         <p className="text-sm text-slate-400 text-center py-12">No data yet</p>
       ) : (
         <ResponsiveContainer width="100%" height={180}>
           <PieChart>
             <Pie
               data={platformData}
               cx="50%"
               cy="50%"
               innerRadius={48}
               outerRadius={72}
               dataKey="value"
               paddingAngle={2}
             >
               {platformData.map((_, i) => (
                 <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
               ))}
             </Pie>
             <Tooltip
               contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: 'none' }}
               formatter={(value, name) => [value, name]}
             />
           </PieChart>
         </ResponsiveContainer>
       )}
       {platformData.length > 0 && (
         <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
           {platformData.map((d, i) => (
             <span key={d.name} className="flex items-center gap-1 text-xs text-slate-500">
               <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
               {d.name}
             </span>
           ))}
         </div>
       )}
     </div>
   </div>
   ```

4. Run `npm run build`.

---

### Task 2.2 — Caption AI assist

**Files:** `api/generate-caption.js` (new), `src/components/form/Step4Upload.jsx`

**Context:** Uploaders write captions manually. Add a "Generate Captions" button that calls a Vercel serverless function powered by the Anthropic API. Clicking a generated suggestion pre-fills the caption textarea.

**CRITICAL:** The project has `"type": "module"` in package.json. The API route MUST use `export default` — not `module.exports`. Using `module.exports` will cause a runtime crash in Vercel.

---

**Part A: Create `api/generate-caption.js`**

Create this file at the project root (same level as `src/`, not inside it). The `api/` directory may not exist yet — create it.

```js
// Required Vercel env var: ANTHROPIC_API_KEY
// Set this in Vercel Dashboard → Project Settings → Environment Variables

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { dealership, platform, contentType, context } = req.body || {}

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Caption AI is not configured. Add ANTHROPIC_API_KEY in Vercel settings.' })
  }

  const prompt = `You are a social media copywriter for an automotive dealership.

Dealership: ${dealership || 'an Asbury Automotive dealership'}
Platform: ${platform || 'Instagram'}
Content format: ${contentType || 'promotional post'}
Context from the uploader: ${context || '(no additional context provided)'}

Write exactly 3 caption options for this post. Each option should:
- Feel native to ${platform}
- Be direct and compelling for a car dealership audience
- End with a clear call to action
- Stay under 150 words

Return ONLY a valid JSON array of 3 strings. No explanation, no markdown, no extra text. Example format:
["Caption one here.", "Caption two here.", "Caption three here."]`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic error:', response.status, errText)
      throw new Error(`Anthropic API returned ${response.status}`)
    }

    const data = await response.json()
    const text = data.content?.[0]?.text?.trim() || '[]'

    let captions
    try {
      captions = JSON.parse(text)
    } catch {
      // Fallback: extract JSON array if model prefixed with text
      const match = text.match(/\[[\s\S]*\]/)
      captions = match ? JSON.parse(match[0]) : []
    }

    if (!Array.isArray(captions)) captions = []

    return res.status(200).json({ captions: captions.slice(0, 3) })
  } catch (err) {
    console.error('Caption generation error:', err)
    return res.status(500).json({ error: 'Failed to generate captions. Please try again.' })
  }
}
```

---

**Part B: Update `src/components/form/Step4Upload.jsx`**

Open the file. The caption field is around line 332–364. The setter is `onUpdate({ caption: e.target.value })`.

1. `useState` is already imported in this file.

2. Add these state variables inside the main component function body (find `export default function Step4Upload` and add near the top after the prop destructuring):
   ```js
   const [aiLoading, setAiLoading] = useState(false)
   const [aiCaptions, setAiCaptions] = useState([])
   const [aiError, setAiError] = useState('')
   const [aiContext, setAiContext] = useState('')
   ```

3. Add this handler in the same place:
   ```js
   const handleGenerateCaptions = async () => {
     setAiLoading(true)
     setAiError('')
     setAiCaptions([])
     try {
       const res = await fetch('/api/generate-caption', {
         method: 'POST',
         headers: { 'content-type': 'application/json' },
         body: JSON.stringify({
           dealership: data.dealership_ids?.[0] || data.dealership_id || '',
           platform: data.platforms?.[0] || data.platform || '',
           contentType: data.content_type || '',
           context: aiContext.trim(),
         }),
       })
       const json = await res.json()
       if (!res.ok) throw new Error(json.error || 'Generation failed')
       setAiCaptions(json.captions || [])
     } catch (err) {
       setAiError(err.message || 'Something went wrong')
     } finally {
       setAiLoading(false)
     }
   }
   ```

4. Find the caption textarea block (it starts with the `<div>` containing the `Caption` label). After the closing `</div>` of the character count/tip row (the one with the `platformCaption.soft` check), insert the AI assistance UI:
   ```jsx
   {/* AI Caption Generator */}
   <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
     <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Generate with AI</p>
     <div className="flex gap-2">
       <input
         type="text"
         value={aiContext}
         onChange={e => setAiContext(e.target.value)}
         placeholder="Optional context (e.g. 'weekend sale, family SUVs')…"
         className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-white"
       />
       <button
         type="button"
         onClick={handleGenerateCaptions}
         disabled={aiLoading}
         className="px-3 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap transition-colors"
       >
         {aiLoading ? 'Generating…' : 'Generate'}
       </button>
     </div>
     {aiError && (
       <p className="text-xs text-red-500 mt-2">{aiError}</p>
     )}
     {aiCaptions.length > 0 && (
       <div className="mt-2 space-y-2">
         {aiCaptions.map((caption, i) => (
           <button
             key={i}
             type="button"
             onClick={() => {
               onUpdate({ caption })
               setAiCaptions([])
             }}
             className="w-full text-left text-sm p-3 bg-white border border-indigo-100 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 transition-all leading-relaxed"
           >
             {caption}
           </button>
         ))}
         <p className="text-xs text-slate-400">Click any option to use it as your caption.</p>
       </div>
     )}
   </div>
   ```

---

**Part C: Add `ANTHROPIC_API_KEY` to Vercel**

This is a manual step — Claude Code cannot access the Vercel dashboard.

In Vercel: Project → Settings → Environment Variables → Add:
- Key: `ANTHROPIC_API_KEY`
- Value: your Anthropic API key from console.anthropic.com
- Environment: Production (and optionally Preview)

The API route will silently return an error message until this is set. No build errors — just a graceful failure in the UI.

Run `npm run build` (verifies only the React app; the API route is not Vite-compiled).

---

### Task 2.3 — Avg. Review Time benchmark indicator

**File:** `src/pages/DashboardPage.jsx`

**Context:** The "Avg. Review Time" stat card shows the raw hours value but gives no signal whether that's good or bad. Add a colored benchmark dot + label and a target reference.

**Instructions:**

Open `src/pages/DashboardPage.jsx`.

1. The `StatCard` component is defined at the top of this file (around line 20). Modify its props signature and JSX to accept two optional new props:

   Change:
   ```jsx
   function StatCard({ label, value, color, bgGradient, icon: Icon, subtitle, to }) {
   ```
   To:
   ```jsx
   function StatCard({ label, value, color, bgGradient, icon: Icon, subtitle, to, benchmarkLabel, benchmarkColor }) {
   ```

   Inside the StatCard JSX, find the `{subtitle && <p ...>{subtitle}</p>}` line and add after it:
   ```jsx
   {benchmarkLabel && (
     <div className="flex items-center gap-1.5 mt-1">
       <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
         benchmarkColor === 'green' ? 'bg-emerald-500' :
         benchmarkColor === 'amber' ? 'bg-amber-400' :
         'bg-red-500'
       }`} />
       <span className={`text-xs font-medium ${
         benchmarkColor === 'green' ? 'text-emerald-600' :
         benchmarkColor === 'amber' ? 'text-amber-600' :
         'text-red-600'
       }`}>{benchmarkLabel}</span>
     </div>
   )}
   ```

2. Inside the main `DashboardPage` component function, after the `avgApprovalHours` useMemo, add:
   ```js
   const reviewBenchmark = avgApprovalHours === null ? null :
     avgApprovalHours <= 12 ? { label: 'On target', color: 'green' } :
     avgApprovalHours <= 24 ? { label: 'Monitor', color: 'amber' } :
     { label: 'Needs attention', color: 'red' }
   ```

3. Find the Avg. Review Time `<StatCard>` call (around line 289) and add the two new props:
   ```jsx
   benchmarkLabel={reviewBenchmark?.label}
   benchmarkColor={reviewBenchmark?.color}
   ```

   Also change its `subtitle` prop from `"From submit to decision"` to `"From submit to decision · Target: < 12h"` so the target is visible on desktop hover.

4. Run `npm run build`.

---

### Task 2.4 — Calendar event hover tooltips

**File:** `src/components/calendar/CalendarView.jsx`

**Context:** Hovering calendar event blocks shows nothing. Add a tooltip showing the thumbnail, truncated caption, uploader, and status badge.

**Instructions:**

Open `src/components/calendar/CalendarView.jsx`.

1. Add `useState` to the React import if not already present.

2. Add inside the main component function:
   ```js
   const [tooltip, setTooltip] = useState(null) // { post, x, y }
   ```

3. Find where calendar event blocks/pills are rendered (they are the colored div elements that represent posts on the calendar grid). On each event element, add these event handlers:
   ```jsx
   onMouseEnter={e => {
     const rect = e.currentTarget.getBoundingClientRect()
     setTooltip({
       post,
       x: Math.min(rect.left, window.innerWidth - 240),
       y: rect.bottom + 8,
     })
   }}
   onMouseLeave={() => setTooltip(null)}
   ```
   Note: the variable name for the post object in that map/render loop may differ — use whatever variable holds the individual post in that context.

4. At the end of the component's return statement, directly before the final closing `</div>` of the root element, add the tooltip overlay:
   ```jsx
   {tooltip && (
     <div
       className="fixed z-50 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-3 pointer-events-none"
       style={{ left: tooltip.x, top: tooltip.y }}
     >
       {(tooltip.post.file_url || tooltip.post.file_preview) &&
        !tooltip.post.file_type?.startsWith('application/') && (
         <div className="w-full h-28 rounded-lg overflow-hidden mb-2 bg-slate-100">
           {tooltip.post.file_type?.startsWith('video/') ? (
             <video
               src={tooltip.post.file_url || tooltip.post.file_preview}
               className="w-full h-full object-cover"
               muted
             />
           ) : (
             <img
               src={tooltip.post.file_url || tooltip.post.file_preview}
               alt=""
               className="w-full h-full object-cover"
             />
           )}
         </div>
       )}
       <p className="text-xs text-slate-700 leading-snug mb-2">
         {tooltip.post.caption
           ? `${tooltip.post.caption.slice(0, 90)}${tooltip.post.caption.length > 90 ? '…' : ''}`
           : <span className="italic text-slate-400">No caption</span>
         }
       </p>
       <div className="flex items-center justify-between gap-2">
         <span className="text-xs text-slate-400 truncate">
           {tooltip.post.uploaded_by_name || tooltip.post.uploaded_by}
         </span>
         <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
           tooltip.post.approval_status === 'approved'  ? 'bg-green-100 text-green-700'  :
           tooltip.post.approval_status === 'pending'   ? 'bg-amber-100 text-amber-700'  :
           tooltip.post.approval_status === 'flagged'   ? 'bg-red-100 text-red-700'      :
           tooltip.post.approval_status === 'published' ? 'bg-blue-100 text-blue-700'    :
           'bg-slate-100 text-slate-600'
         }`}>
           {tooltip.post.approval_status}
         </span>
       </div>
     </div>
   )}
   ```

5. Run `npm run build`.

Commit Phase 2:
```
git add -A
git commit -m "feat: Phase 2 — analytics charts, caption AI assist, review time benchmark, calendar tooltips"
git push
```

---

## PHASE 3 — Polish

### Task 3.1 — Dealership health cards on Dashboard

**File:** `src/pages/DashboardPage.jsx`

**Context:** The dashboard shows "X dealerships with no content this week" as plain text. Replace it with a horizontal scrollable row of mini-cards — one per dealership — with a status dot (green=active, amber=has pending, red=has flagged, gray=inactive).

**Instructions:**

Open `src/pages/DashboardPage.jsx`.

1. `startOfWeek`, `endOfWeek`, `isWithinInterval` are already imported from date-fns. `DEALERSHIPS` is already imported.

2. Add this computed value inside the `DashboardPage` function, after the existing `inactiveDealerships` computation (around line 178):
   ```js
   const dealershipHealth = DEALERSHIPS.map(d => {
     const recentPosts = activePosts.filter(p =>
       p.dealership_id === d.id &&
       isWithinInterval(
         (() => { try { return parseISO(p.uploaded_at) } catch { return new Date(0) } })(),
         weekInterval
       )
     )
     const status =
       recentPosts.length === 0              ? 'inactive' :
       recentPosts.some(p => p.approval_status === 'flagged')  ? 'flagged'  :
       recentPosts.some(p => p.approval_status === 'pending')  ? 'pending'  :
       'active'
     return { ...d, recentCount: recentPosts.length, status }
   })
   ```

3. Find the section that renders the "inactive dealerships" text alert. It looks something like:
   ```jsx
   {inactiveDealerships.length > 0 && (
     <div ...>
       <AlertCircle .../>
       <p>10 dealerships with no content this week</p>
     </div>
   )}
   ```

   Replace the entire block with the health card row:
   ```jsx
   <div className="mb-7">
     <div className="flex items-center justify-between mb-3">
       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dealership Activity — This Week</p>
       <p className="text-xs text-slate-400">{dealershipHealth.filter(d => d.status === 'inactive').length} inactive</p>
     </div>
     <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
       {dealershipHealth.map(d => (
         <div
           key={d.id}
           className="flex-shrink-0 w-28 bg-white border border-slate-100 rounded-xl p-3 text-center shadow-sm"
         >
           <div className={`w-2.5 h-2.5 rounded-full mx-auto mb-2 ${
             d.status === 'active'   ? 'bg-emerald-500' :
             d.status === 'pending'  ? 'bg-amber-400'   :
             d.status === 'flagged'  ? 'bg-red-500'     :
             'bg-slate-200'
           }`} />
           <p className="text-xs font-semibold text-slate-700 leading-tight truncate" title={d.name}>
             {d.name.replace(/^(Nalley|David McDavid|Coggin|Crown|North Point|Plaza|Courtesy|Asbury)\s+/i, '')}
           </p>
           <p className="text-[10px] text-slate-400 mt-0.5">{d.recentCount} post{d.recentCount !== 1 ? 's' : ''}</p>
         </div>
       ))}
     </div>
   </div>
   ```
   Note on the name truncation: `replace(...)` strips the dealer group prefix so "Nalley Honda" shows as "Honda", keeping each card compact. Adjust or remove this regex if you prefer full names.

4. Run `npm run build`.

---

### Task 3.2 — Activity timestamps in Recent Submissions

**File:** `src/pages/DashboardPage.jsx`

**Context:** The Recent Submissions table shows a raw scheduled date string. Replace with relative timestamps ("2h ago", "3d ago") for both the upload time and, when available, the admin action time.

**Instructions:**

Open `src/pages/DashboardPage.jsx`.

1. `formatDistanceToNow` may not be imported yet. Check the date-fns import at line 4 and add it if absent:
   ```
   import { ..., formatDistanceToNow } from 'date-fns'
   ```

2. In the `PostRow` function component (around line 37), find the `<td>` that renders the uploaded date:
   ```jsx
   <td className="px-5 py-3.5 cursor-pointer" onClick={() => onClick(post)}>
     <p className="text-xs text-slate-500">{uploaderName}</p>
     <p className="text-xs text-slate-400">{post.uploaded_at ? format(parseISO(post.uploaded_at), 'MMM d') : '—'}</p>
   </td>
   ```

   Replace that `<td>` with:
   ```jsx
   <td className="px-5 py-3.5 cursor-pointer" onClick={() => onClick(post)}>
     <p className="text-xs text-slate-700">{uploaderName}</p>
     {post.uploaded_at && (
       <p className="text-[10px] text-slate-400 mt-0.5">
         {formatDistanceToNow(parseISO(post.uploaded_at), { addSuffix: true })}
       </p>
     )}
     {post.chad_action_at && (
       <p className={`text-[10px] mt-0.5 font-medium ${
         post.approval_status === 'approved'  ? 'text-emerald-600' :
         post.approval_status === 'flagged'   ? 'text-amber-600'   :
         'text-slate-400'
       }`}>
         {post.approval_status === 'approved' ? 'Approved ' :
          post.approval_status === 'flagged'  ? 'Flagged '  : ''}
         {formatDistanceToNow(parseISO(post.chad_action_at), { addSuffix: true })}
       </p>
     )}
   </td>
   ```

3. Also update the `PostCard` component (the mobile card version, around line 89) with the same relative timestamp logic. Find where `uploaded_at` is rendered there and apply `formatDistanceToNow` in the same pattern.

4. Run `npm run build`.

---

### Task 3.3 — Searchable dealership dropdown in Calendar

**File:** `src/components/calendar/CalendarView.jsx`

**Context:** The dealership filter is a flat `<select>` with 15 options and no search. Replace with a custom searchable dropdown.

**Instructions:**

Open `src/components/calendar/CalendarView.jsx`.

1. Add `useEffect` to the React import if not already present. Confirm `useState` is already there.

2. Add `ChevronDown` to the lucide-react import if not already present.

3. Add these state variables to the component function:
   ```js
   const [dealerSearch, setDealerSearch] = useState('')
   const [dealerOpen, setDealerOpen] = useState(false)
   ```

4. Add this computed value:
   ```js
   const filteredDealers = DEALERSHIPS.filter(d =>
     d.name.toLowerCase().includes(dealerSearch.toLowerCase())
   )
   ```
   (Confirm the dealerships array import is `DEALERSHIPS` from the data file — check the existing import.)

5. Add a click-outside effect:
   ```js
   useEffect(() => {
     if (!dealerOpen) return
     const handler = e => {
       if (!e.target.closest('[data-dealer-dropdown]')) setDealerOpen(false)
     }
     document.addEventListener('mousedown', handler)
     return () => document.removeEventListener('mousedown', handler)
   }, [dealerOpen])
   ```

6. Find the existing dealership `<select>` element. It looks like:
   ```jsx
   <select
     value={selectedDealership}
     onChange={e => setSelectedDealership(e.target.value)}
     className="..."
   >
     <option value="all">All Dealerships</option>
     {DEALERSHIPS.map(...)}
   </select>
   ```
   
   Replace the entire `<select>` block with:
   ```jsx
   <div className="relative" data-dealer-dropdown="">
     <button
       type="button"
       onClick={() => setDealerOpen(o => !o)}
       className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 min-w-[170px] hover:border-slate-400 transition-colors"
     >
       <span className="flex-1 text-left truncate">
         {selectedDealership === 'all'
           ? 'All Dealerships'
           : DEALERSHIPS.find(d => d.id === selectedDealership)?.name || 'Select…'}
       </span>
       <ChevronDown size={13} className={`text-slate-400 flex-shrink-0 transition-transform ${dealerOpen ? 'rotate-180' : ''}`} />
     </button>

     {dealerOpen && (
       <div className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
         <div className="p-2 border-b border-slate-100">
           <input
             autoFocus
             type="text"
             value={dealerSearch}
             onChange={e => setDealerSearch(e.target.value)}
             placeholder="Search dealerships…"
             className="w-full text-sm px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400"
           />
         </div>
         <div className="max-h-56 overflow-y-auto py-1">
           <button
             type="button"
             className={`w-full text-left text-sm px-4 py-2 transition-colors ${
               selectedDealership === 'all' ? 'text-indigo-600 font-semibold bg-indigo-50' : 'text-slate-700 hover:bg-slate-50'
             }`}
             onClick={() => { setSelectedDealership('all'); setDealerOpen(false); setDealerSearch('') }}
           >
             All Dealerships
           </button>
           {filteredDealers.map(d => (
             <button
               key={d.id}
               type="button"
               className={`w-full text-left text-sm px-4 py-2 transition-colors ${
                 selectedDealership === d.id ? 'text-indigo-600 font-semibold bg-indigo-50' : 'text-slate-700 hover:bg-slate-50'
               }`}
               onClick={() => { setSelectedDealership(d.id); setDealerOpen(false); setDealerSearch('') }}
             >
               {d.name}
             </button>
           ))}
           {filteredDealers.length === 0 && (
             <p className="text-xs text-slate-400 px-4 py-3">No matches</p>
           )}
         </div>
       </div>
     )}
   </div>
   ```

   Note: `setSelectedDealership` — use the exact setter name that corresponds to the existing `selectedDealership` state variable in this file. Verify both the state variable name and setter name before making the replacement.

7. Run `npm run build`.

---

### Task 3.4 — Micro-interactions

**Files:** `src/components/layout/Sidebar.jsx`, `src/pages/DashboardPage.jsx`, `src/components/admin/AdminQueue.jsx`

---

**Part A: Pulse animation on pending badge (Sidebar.jsx)**

Open `src/components/layout/Sidebar.jsx`.

Find the `NavItem` component function (around line 9). It renders:
```jsx
{badge > 0 && (
  <span className="bg-indigo-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
    {badge}
  </span>
)}
```

Add `animate-pulse` to the span's className:
```jsx
{badge > 0 && (
  <span className="bg-indigo-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none animate-pulse">
    {badge}
  </span>
)}
```

---

**Part B: Count-up animation on stat numbers (DashboardPage.jsx)**

Open `src/pages/DashboardPage.jsx`.

1. `useEffect` is not currently imported. Add it to the React import:
   ```
   import { useState, useMemo, useEffect } from 'react'
   ```

2. Add this custom hook directly before the `StatCard` function definition (before `function StatCard(...)`):
   ```js
   function useCountUp(target, duration = 900) {
     const [display, setDisplay] = useState(0)
     useEffect(() => {
       if (target == null || typeof target !== 'number') return
       let frame = 0
       const totalFrames = Math.ceil(duration / 16)
       const timer = setInterval(() => {
         frame++
         const progress = frame / totalFrames
         const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
         setDisplay(Math.round(target * eased))
         if (frame >= totalFrames) {
           setDisplay(target)
           clearInterval(timer)
         }
       }, 16)
       return () => clearInterval(timer)
     }, [target, duration])
     return display
   }
   ```

3. Inside the `DashboardPage` function (not in StatCard), after `const firstName = ...`, add:
   ```js
   const animatedWeek    = useCountUp(thisWeekPosts.length)
   const animatedPending = useCountUp(pendingPosts.length)
   const animatedRate    = useCountUp(approvalRate ?? 0)
   ```

4. Pass these animated values to the corresponding StatCards:
   - "This Week" card: change `value={thisWeekPosts.length}` to `value={animatedWeek}`
   - "Pending Approval" card: change `value={pendingPosts.length}` to `value={animatedPending}`
   - "Approval Rate" card: change `value={approvalRate !== null ? \`${approvalRate}%\` : '—'}` to `value={approvalRate !== null ? \`${animatedRate}%\` : '—'}`

   Do NOT apply count-up to Avg. Review Time — that value is already a formatted string like "11h" and is not a plain number.

---

**Part C: Row flash on approve in AdminQueue (AdminQueue.jsx)**

Open `src/components/admin/AdminQueue.jsx`.

1. `useState` is already imported. Add inside the `AdminQueue` component:
   ```js
   const [flashedIds, setFlashedIds] = useState(new Set())
   ```

2. Add this helper function inside the component:
   ```js
   const flashRow = (id) => {
     setFlashedIds(prev => new Set([...prev, id]))
     setTimeout(() => {
       setFlashedIds(prev => {
         const next = new Set(prev)
         next.delete(id)
         return next
       })
     }, 1200)
   }
   ```

3. Find the desktop table `<tr>` for each post row (around line 305):
   ```jsx
   <tr key={post.id} className="hover:bg-slate-50/70 transition-colors group">
   ```

   Add the flash class conditionally:
   ```jsx
   <tr
     key={post.id}
     className={`hover:bg-slate-50/70 transition-colors group ${
       flashedIds.has(post.id) ? 'bg-green-50' : ''
     }`}
   >
   ```

4. Find the approve button inside the desktop table row (the `<button onClick={() => handleAction(post, 'approve')}...>` around line 394). Wrap the `onClick` to also call `flashRow`:
   ```jsx
   onClick={() => { handleAction(post, 'approve'); flashRow(post.id) }}
   ```

5. Run `npm run build`.

---

**Commit Phase 3:**
```
git add -A
git commit -m "feat: Phase 3 — dealership health cards, activity timestamps, calendar search, micro-interactions"
git push
```

---

## PHASE 4 (Deferred)

**Task 4.1 — Asset Library tagging**

Deferred until the library has enough assets to make findability painful without tags. Design spec: add a `tags TEXT[]` column to the assets table, a tag input in `AssetUploadModal`, tag chips on `AssetCard`, and a tag filter above the grid on `AssetsPage`. No implementation instructions needed until this is scoped.

---

## Verification Checklist

After deploying to Vercel, manually test:

- [ ] Open any pending post via the PostDetailModal (eye icon). Approve button and Flag button appear for admin users, not for viewer/social_media.
- [ ] Flag a post — notes textarea appears, submit sends the note, post shows amber "Admin Notes" banner on next open.
- [ ] Dashboard Recent Submissions shows media thumbnail for image/video posts.
- [ ] Admin Queue: select multiple pending posts with checkboxes, click "Approve All (N)" — all approve, row count updates.
- [ ] Admin user sees "Upload Content" in sidebar.
- [ ] Analytics page shows two charts above the dealership table.
- [ ] Caption AI button in Step 4 generates 3 suggestions; clicking one fills the caption textarea.
- [ ] Avg. Review Time card shows a colored benchmark dot.
- [ ] Calendar event blocks show a tooltip on hover.
- [ ] Dashboard dealership health cards show one card per dealership with correct status color.
- [ ] Recent Submissions shows relative timestamps ("2h ago", "Approved 3d ago").
- [ ] Calendar dealership filter has a search input that filters in real time.
- [ ] Pending badge in sidebar pulses.
- [ ] Dashboard stat cards animate from 0 on page load.
- [ ] Approving a post in the AdminQueue briefly flashes the row green.
