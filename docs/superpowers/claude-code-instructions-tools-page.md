# Asbury Social Hub — Claude Code Instructions
# Tools Page: 10 Tools across 2 Categories

**Date:** 2026-05-15
**Author:** Zach Hipes (w/ Claude)
**Route:** `/tools` — all authenticated roles

---

## Overview

Create a `/tools` page with a two-column layout (tool list sidebar left, active tool panel right on desktop; stacked on mobile). Ten tools total, split into two categories:

**Social Media Tools** (new, Social Hub-specific):
1. Post Preview — mockup how a caption + image renders on each platform
2. Image Spec Validator — check image dimensions against platform requirements
3. Hashtag Analyzer — automotive hashtag research with reach tiers
4. UTM Link Builder — build trackable campaign URLs with Asbury presets
5. Content Mix Analyzer — live content pillar distribution from PostsContext
6. Caption Formatter — AI reformats a caption for each platform's style

**SEO & AEO Tools** (ported from zach-hipes-site.vercel.app/tools):
7. Ad Spend Waste Estimator — calculator for wasted paid media budget
8. SERP Preview — Google title/meta description preview (mobile + desktop)
9. Schema Markup Validator — validate JSON-LD schema, fetch from URL
10. AEO Readiness Scanner — check AEO signals on any URL

Tools 9 and 10 require a server-side proxy API route. Tools 1–8 are entirely client-side.

---

## Pre-flight

- `Recharts` is already installed (used for Content Mix Analyzer)
- `lucide-react` is already installed
- Run `npm run build` after each major step
- All Vercel API routes: `export default` (ESM, no `module.exports`)
- `ANTHROPIC_API_KEY` must be set in Vercel env vars (for Caption Formatter — same key as generate-caption)

---

## STEP 1 — Page scaffolding + routing

### 1a — Create `src/pages/ToolsPage.jsx`

This is the shell. It renders the tool list sidebar and the active tool component.

```jsx
import { useState, useEffect } from 'react'
import {
  Wrench, Eye, Image, Hash, Link2, PieChart, Type,
  DollarSign, Search, Code2, Scan, ChevronRight
} from 'lucide-react'

import PostPreview       from '../components/tools/PostPreview'
import ImageSpecValidator from '../components/tools/ImageSpecValidator'
import HashtagAnalyzer   from '../components/tools/HashtagAnalyzer'
import UtmBuilder        from '../components/tools/UtmBuilder'
import ContentMixAnalyzer from '../components/tools/ContentMixAnalyzer'
import CaptionFormatter  from '../components/tools/CaptionFormatter'
import AdSpendEstimator  from '../components/tools/AdSpendEstimator'
import SerpPreview       from '../components/tools/SerpPreview'
import SchemaValidator   from '../components/tools/SchemaValidator'
import AeoScanner        from '../components/tools/AeoScanner'

const TOOLS = [
  {
    category: 'Social Media',
    items: [
      { id: 'post-preview',    label: 'Post Preview',          icon: Eye,       component: PostPreview,        desc: 'See how your caption + image renders on each platform' },
      { id: 'image-spec',      label: 'Image Spec Validator',  icon: Image,     component: ImageSpecValidator, desc: 'Check image dimensions against platform requirements' },
      { id: 'hashtag-analyzer',label: 'Hashtag Analyzer',      icon: Hash,      component: HashtagAnalyzer,    desc: 'Auto dealer hashtag research with reach tiers' },
      { id: 'utm-builder',     label: 'UTM Builder',           icon: Link2,     component: UtmBuilder,         desc: 'Build trackable campaign URLs with Asbury presets' },
      { id: 'content-mix',     label: 'Content Mix Analyzer',  icon: PieChart,  component: ContentMixAnalyzer, desc: 'Live content pillar distribution across dealerships' },
      { id: 'caption-formatter',label: 'Caption Formatter',    icon: Type,      component: CaptionFormatter,   desc: 'AI reformats your caption for each platform\'s style' },
    ]
  },
  {
    category: 'SEO & AEO',
    items: [
      { id: 'ad-spend',        label: 'Ad Spend Estimator',    icon: DollarSign,component: AdSpendEstimator,   desc: 'Estimate wasted ad budget' },
      { id: 'serp-preview',    label: 'SERP Preview',          icon: Search,    component: SerpPreview,        desc: 'Preview title tag + meta in Google results' },
      { id: 'schema-validator',label: 'Schema Validator',      icon: Code2,     component: SchemaValidator,    desc: 'Validate JSON-LD schema markup' },
      { id: 'aeo-scanner',     label: 'AEO Scanner',           icon: Scan,      component: AeoScanner,         desc: 'Check AEO readiness signals on any URL' },
    ]
  }
]

export default function ToolsPage() {
  const defaultTool = TOOLS[0].items[0]
  const [activeTool, setActiveTool] = useState(() => {
    const hash = window.location.hash.replace('#', '')
    for (const cat of TOOLS) {
      const found = cat.items.find(t => t.id === hash)
      if (found) return found
    }
    return defaultTool
  })

  useEffect(() => {
    window.location.hash = activeTool.id
  }, [activeTool])

  const ActiveComponent = activeTool.component

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50">

      {/* Sidebar */}
      <aside className="w-full lg:w-64 lg:flex-shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <Wrench size={16} className="text-slate-400" />
          <h1 className="text-sm font-bold text-slate-900">Tools</h1>
        </div>

        {/* Mobile: horizontal scroll tabs */}
        <div className="lg:hidden overflow-x-auto">
          <div className="flex gap-1 p-2" style={{ scrollbarWidth: 'none' }}>
            {TOOLS.flatMap(cat => cat.items).map(tool => {
              const Icon = tool.icon
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTool.id === tool.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon size={12} />
                  {tool.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Desktop: grouped list */}
        <nav className="hidden lg:block p-2 py-3">
          {TOOLS.map(cat => (
            <div key={cat.category} className="mb-4">
              <p className="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {cat.category}
              </p>
              {cat.items.map(tool => {
                const Icon = tool.icon
                const isActive = activeTool.id === tool.id
                return (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all mb-0.5 text-left ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon size={15} className="flex-shrink-0" />
                    <span className="flex-1 leading-snug">{tool.label}</span>
                    {isActive && <ChevronRight size={13} className="text-indigo-400" />}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Tool panel */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">{activeTool.label}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{activeTool.desc}</p>
          </div>
          <ActiveComponent />
        </div>
      </main>
    </div>
  )
}
```

### 1b — Add route to `src/App.jsx`

Find where other routes are defined. Add:
```jsx
import ToolsPage from './pages/ToolsPage'
```
And in the routes:
```jsx
<Route path="/tools" element={<ProtectedRoute><ToolsPage /></ProtectedRoute>} />
```

### 1c — Add nav item to `src/components/layout/Sidebar.jsx`

Add `Wrench` to the lucide-react import. Then find the `Main` section nav items and add after Analytics:
```jsx
<NavItem to="/tools" icon={Wrench} label="Tools" onClick={onClose} />
```

---

## STEP 2 — Create `src/components/tools/` directory

Create all 10 tool component files below. Each is self-contained.

---

### Tool 1: `PostPreview.jsx`

Shows how a caption + optional image renders as a feed post on each platform.

```jsx
import { useState } from 'react'

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', color: '#E1306C', charLimit: 2200, truncateAt: 125 },
  { id: 'facebook',  label: 'Facebook',  color: '#1877F2', charLimit: 63206, truncateAt: 480 },
  { id: 'linkedin',  label: 'LinkedIn',  color: '#0A66C2', charLimit: 3000, truncateAt: 210 },
  { id: 'tiktok',    label: 'TikTok',    color: '#000000', charLimit: 2200, truncateAt: 100 },
]

export default function PostPreview() {
  const [caption, setCaption] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [activePlatform, setActivePlatform] = useState('instagram')

  const platform = PLATFORMS.find(p => p.id === activePlatform)
  const isLong = caption.length > platform.truncateAt
  const displayCaption = isLong
    ? caption.slice(0, platform.truncateAt) + '… more'
    : caption

  const hashtagCount = (caption.match(/#\w+/g) || []).length
  const mentionCount = (caption.match(/@\w+/g) || []).length

  return (
    <div className="space-y-5">
      {/* Inputs */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Caption</label>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            rows={4}
            placeholder="Paste your caption here..."
            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:border-indigo-400"
          />
          <div className="flex gap-4 mt-1 text-xs text-slate-400">
            <span>{caption.length} chars</span>
            <span>{hashtagCount} hashtags</span>
            <span>{mentionCount} mentions</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Image URL (optional)</label>
          <input
            type="url"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            placeholder="https://res.cloudinary.com/..."
            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400"
          />
        </div>
      </div>

      {/* Platform tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {PLATFORMS.map(p => (
          <button
            key={p.id}
            onClick={() => setActivePlatform(p.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activePlatform === p.id ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            style={activePlatform === p.id ? { background: p.color } : {}}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Preview card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Platform header */}
        <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: platform.color }} />
          <span className="text-xs font-semibold text-slate-600">{platform.label} Feed Preview</span>
        </div>

        <div className="p-4">
          {/* Post mock */}
          <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
            {/* Post header */}
            <div className="flex items-center gap-2.5 p-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-900">Asbury Dealership</p>
                <p className="text-[10px] text-slate-400">Sponsored</p>
              </div>
            </div>

            {/* Image */}
            {imageUrl && (
              <div className="relative bg-slate-100" style={{ paddingTop: activePlatform === 'tiktok' ? '177%' : activePlatform === 'instagram' ? '100%' : '52.5%' }}>
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={e => { e.target.style.display = 'none' }}
                />
              </div>
            )}
            {!imageUrl && (
              <div className="bg-slate-100 flex items-center justify-center text-slate-300 text-xs"
                style={{ height: activePlatform === 'tiktok' ? 280 : 200 }}>
                Image preview
              </div>
            )}

            {/* Caption */}
            <div className="p-3">
              {caption ? (
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {displayCaption.split(/(#\w+|@\w+)/g).map((part, i) =>
                    /^[#@]/.test(part)
                      ? <span key={i} className="text-blue-600">{part}</span>
                      : part
                  )}
                </p>
              ) : (
                <p className="text-sm text-slate-300 italic">Your caption will appear here</p>
              )}
            </div>

            {/* Like/comment bar */}
            <div className="px-3 pb-3 flex items-center gap-4 text-xs text-slate-400">
              <span>♥ Like</span>
              <span>💬 Comment</span>
              <span>↗ Share</span>
            </div>
          </div>
        </div>

        {/* Char limit indicator */}
        <div className="px-4 pb-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Character usage</span>
            <span className={caption.length > platform.charLimit ? 'text-red-500 font-medium' : ''}>
              {caption.length} / {platform.charLimit.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                caption.length > platform.charLimit ? 'bg-red-500' :
                caption.length > platform.charLimit * 0.8 ? 'bg-amber-400' : 'bg-indigo-500'
              }`}
              style={{ width: `${Math.min((caption.length / platform.charLimit) * 100, 100)}%` }}
            />
          </div>
          {isLong && (
            <p className="text-xs text-amber-600 mt-1.5">
              Caption truncates after {platform.truncateAt} characters with a "more" link on {platform.label}.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

### Tool 2: `ImageSpecValidator.jsx`

Checks image dimensions against every platform's requirements.

```jsx
import { useState, useRef } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Upload } from 'lucide-react'

const SPECS = [
  { platform: 'Instagram', format: 'Feed Square',    w: 1080, h: 1080, ratio: '1:1',      tolerance: 0.05 },
  { platform: 'Instagram', format: 'Feed Portrait',  w: 1080, h: 1350, ratio: '4:5',      tolerance: 0.05 },
  { platform: 'Instagram', format: 'Feed Landscape', w: 1080, h: 566,  ratio: '1.91:1',   tolerance: 0.05 },
  { platform: 'Instagram', format: 'Stories / Reels',w: 1080, h: 1920, ratio: '9:16',     tolerance: 0.05 },
  { platform: 'Facebook',  format: 'Feed Photo',     w: 1200, h: 630,  ratio: '1.91:1',   tolerance: 0.1  },
  { platform: 'Facebook',  format: 'Stories',        w: 1080, h: 1920, ratio: '9:16',     tolerance: 0.05 },
  { platform: 'LinkedIn',  format: 'Feed Image',     w: 1200, h: 627,  ratio: '1.91:1',   tolerance: 0.1  },
  { platform: 'TikTok',    format: 'Video Cover',    w: 1080, h: 1920, ratio: '9:16',     tolerance: 0.05 },
  { platform: 'Twitter/X', format: 'Feed Image',     w: 1200, h: 675,  ratio: '16:9',     tolerance: 0.1  },
]

function getStatus(imgW, imgH, spec) {
  const imgRatio = imgW / imgH
  const specRatio = spec.w / spec.h
  const ratioDiff = Math.abs(imgRatio - specRatio) / specRatio
  if (ratioDiff <= spec.tolerance) {
    if (imgW >= spec.w && imgH >= spec.h) return 'pass'
    if (imgW >= spec.w * 0.7) return 'warn' // good ratio, slightly small
    return 'warn'
  }
  return 'fail'
}

export default function ImageSpecValidator() {
  const [dims, setDims] = useState(null)
  const [manualW, setManualW] = useState('')
  const [manualH, setManualH] = useState('')
  const [mode, setMode] = useState('upload') // 'upload' | 'manual'
  const fileRef = useRef()

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const img = new window.Image()
    img.onload = () => setDims({ w: img.width, h: img.height, name: file.name })
    img.src = URL.createObjectURL(file)
  }

  const activeDims = mode === 'manual' && manualW && manualH
    ? { w: parseInt(manualW), h: parseInt(manualH), name: `${manualW}×${manualH}` }
    : dims

  const results = activeDims
    ? SPECS.map(spec => ({ ...spec, status: getStatus(activeDims.w, activeDims.h, spec) }))
    : null

  const byPlatform = results
    ? SPECS.reduce((acc, spec, i) => {
        if (!acc[spec.platform]) acc[spec.platform] = []
        acc[spec.platform].push({ ...spec, status: results[i].status })
        return acc
      }, {})
    : null

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="flex gap-2">
        {['upload', 'manual'].map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              mode === m ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {m === 'upload' ? 'Upload image' : 'Enter dimensions'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        {mode === 'upload' ? (
          <div
            onClick={() => fileRef.current.click()}
            className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
          >
            <Upload size={24} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-500">Click to upload image</p>
            <p className="text-xs text-slate-400 mt-0.5">PNG, JPG, WebP</p>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </div>
        ) : (
          <div className="flex gap-3 items-center">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Width (px)</label>
              <input type="number" value={manualW} onChange={e => setManualW(e.target.value)}
                placeholder="1080"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400" />
            </div>
            <span className="text-slate-400 mt-5">×</span>
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Height (px)</label>
              <input type="number" value={manualH} onChange={e => setManualH(e.target.value)}
                placeholder="1080"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400" />
            </div>
          </div>
        )}
      </div>

      {activeDims && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-indigo-800 font-medium">
          Checking: {activeDims.name} — {activeDims.w} × {activeDims.h}px
          &nbsp;·&nbsp;{(activeDims.w / activeDims.h).toFixed(2)}:1 ratio
        </div>
      )}

      {byPlatform && Object.entries(byPlatform).map(([platform, specs]) => (
        <div key={platform} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">{platform}</p>
          </div>
          <div className="divide-y divide-slate-50">
            {specs.map((spec, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                {spec.status === 'pass' && <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />}
                {spec.status === 'warn' && <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />}
                {spec.status === 'fail' && <XCircle size={16} className="text-red-400 flex-shrink-0" />}
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">{spec.format}</p>
                  <p className="text-xs text-slate-400">{spec.w}×{spec.h}px · {spec.ratio}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  spec.status === 'pass' ? 'bg-emerald-100 text-emerald-700' :
                  spec.status === 'warn' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-600'
                }`}>
                  {spec.status === 'pass' ? 'Compatible' : spec.status === 'warn' ? 'May crop' : 'Wrong ratio'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {!activeDims && (
        <p className="text-sm text-slate-400 text-center py-8">Upload an image or enter dimensions to check compatibility</p>
      )}
    </div>
  )
}
```

---

### Tool 3: `HashtagAnalyzer.jsx`

Curated automotive hashtag dataset with reach tiers and copy functionality.

```jsx
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

const HASHTAG_DATA = {
  'Inventory': [
    { tag: '#NewCar', tier: 'broad', count: '2M+' }, { tag: '#UsedCars', tier: 'broad', count: '1.5M+' },
    { tag: '#CarDealer', tier: 'mid', count: '800K' }, { tag: '#CarDealership', tier: 'mid', count: '600K' },
    { tag: '#NewCarDeals', tier: 'mid', count: '400K' }, { tag: '#CarShopping', tier: 'mid', count: '500K' },
    { tag: '#CarForSale', tier: 'mid', count: '350K' }, { tag: '#DriveOff', tier: 'niche', count: '80K' },
    { tag: '#AsburyAuto', tier: 'niche', count: '15K' }, { tag: '#CertifiedPreOwned', tier: 'niche', count: '120K' },
  ],
  'Honda': [
    { tag: '#Honda', tier: 'broad', count: '5M+' }, { tag: '#HondaDealer', tier: 'mid', count: '300K' },
    { tag: '#HondaCRV', tier: 'mid', count: '400K' }, { tag: '#HondaAccord', tier: 'mid', count: '350K' },
    { tag: '#HondaPilot', tier: 'mid', count: '250K' }, { tag: '#HondaCivic', tier: 'broad', count: '1.2M' },
    { tag: '#TeamHonda', tier: 'niche', count: '90K' }, { tag: '#HondaFamily', tier: 'niche', count: '60K' },
  ],
  'BMW': [
    { tag: '#BMW', tier: 'broad', count: '8M+' }, { tag: '#BMWDealer', tier: 'mid', count: '200K' },
    { tag: '#BMWlife', tier: 'mid', count: '1.5M' }, { tag: '#BMWM', tier: 'mid', count: '900K' },
    { tag: '#UltimateDrivingMachine', tier: 'niche', count: '180K' }, { tag: '#BMWofAtlanta', tier: 'niche', count: '20K' },
  ],
  'Toyota': [
    { tag: '#Toyota', tier: 'broad', count: '6M+' }, { tag: '#ToyotaDealer', tier: 'mid', count: '250K' },
    { tag: '#Tacoma', tier: 'broad', count: '2M+' }, { tag: '#ToyotaTundra', tier: 'mid', count: '400K' },
    { tag: '#ToyotaRAV4', tier: 'mid', count: '600K' }, { tag: '#LetsgoplacesToyota', tier: 'niche', count: '100K' },
  ],
  'Acura': [
    { tag: '#Acura', tier: 'mid', count: '700K' }, { tag: '#AcuraDealer', tier: 'niche', count: '80K' },
    { tag: '#AcuraMDX', tier: 'mid', count: '300K' }, { tag: '#AcuraTLX', tier: 'mid', count: '200K' },
    { tag: '#AcuraRDX', tier: 'mid', count: '250K' }, { tag: '#PrecisionCrafted', tier: 'niche', count: '40K' },
  ],
  'Lexus': [
    { tag: '#Lexus', tier: 'broad', count: '3M+' }, { tag: '#LexusDealer', tier: 'niche', count: '100K' },
    { tag: '#LexusRX', tier: 'mid', count: '400K' }, { tag: '#LexusES', tier: 'mid', count: '200K' },
    { tag: '#ExperienceAmazing', tier: 'niche', count: '50K' }, { tag: '#LexusofAtlanta', tier: 'niche', count: '15K' },
  ],
  'Service & Parts': [
    { tag: '#CarMaintenance', tier: 'mid', count: '500K' }, { tag: '#OilChange', tier: 'mid', count: '400K' },
    { tag: '#TireRotation', tier: 'niche', count: '80K' }, { tag: '#AutoService', tier: 'mid', count: '300K' },
    { tag: '#CarCare', tier: 'mid', count: '600K' }, { tag: '#ServiceLane', tier: 'niche', count: '30K' },
    { tag: '#DealerService', tier: 'niche', count: '40K' }, { tag: '#ScheduleService', tier: 'niche', count: '20K' },
  ],
  'Community': [
    { tag: '#Atlanta', tier: 'broad', count: '5M+' }, { tag: '#AtlantaCars', tier: 'niche', count: '50K' },
    { tag: '#AtlantaDealer', tier: 'niche', count: '30K' }, { tag: '#LocalDealership', tier: 'niche', count: '60K' },
    { tag: '#SupportLocal', tier: 'mid', count: '800K' }, { tag: '#Roswell', tier: 'niche', count: '120K' },
  ],
}

const TIER_CONFIG = {
  broad:  { label: 'Broad',  color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500'   },
  mid:    { label: 'Mid',    color: 'bg-green-100 text-green-700', dot: 'bg-green-500'  },
  niche:  { label: 'Niche',  color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500'  },
}

export default function HashtagAnalyzer() {
  const [activeCategory, setActiveCategory] = useState('Inventory')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [copied, setCopied] = useState(false)

  const categories = Object.keys(HASHTAG_DATA)

  const filtered = search.trim()
    ? Object.values(HASHTAG_DATA).flat().filter(h =>
        h.tag.toLowerCase().includes(search.toLowerCase())
      )
    : HASHTAG_DATA[activeCategory] || []

  const toggleSelect = (tag) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  const copySelected = () => {
    const text = [...selected].join(' ')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search hashtags..."
          className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400"
        />
      </div>

      {!search.trim() && (
        <div className="flex gap-1.5 flex-wrap">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeCategory === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">
        {filtered.map((h, i) => {
          const tier = TIER_CONFIG[h.tier]
          const isSelected = selected.has(h.tag)
          return (
            <div
              key={i}
              onClick={() => toggleSelect(h.tag)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'
              }`}
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tier.dot}`} />
              <span className="text-sm font-medium text-indigo-700 flex-1">{h.tag}</span>
              <span className="text-xs text-slate-400">{h.count}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tier.color}`}>
                {tier.label}
              </span>
              {isSelected && <Check size={14} className="text-indigo-600 flex-shrink-0" />}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">No hashtags found</p>
        )}
      </div>

      {selected.size > 0 && (
        <div className="bg-white rounded-xl border border-indigo-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-600">{selected.size} selected</p>
            <button onClick={copySelected}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy all</>}
            </button>
          </div>
          <p className="text-sm text-indigo-700 break-all leading-relaxed">{[...selected].join(' ')}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {Object.entries(TIER_CONFIG).map(([key, val]) => (
          <div key={key} className={`rounded-xl p-3 text-center ${val.color.replace('text-', 'border-').replace(/\w+-\d+/, 'border-slate-100')} border`}
            style={{ background: 'white' }}>
            <div className={`w-2 h-2 rounded-full mx-auto mb-1.5 ${val.dot}`} />
            <p className="text-xs font-semibold text-slate-700">{val.label}</p>
            <p className="text-[10px] text-slate-400">
              {key === 'broad' ? '>1M posts' : key === 'mid' ? '100K–1M' : '<100K posts'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

### Tool 4: `UtmBuilder.jsx`

```jsx
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

const SOURCE_PRESETS = ['facebook', 'instagram', 'tiktok', 'linkedin', 'twitter', 'email', 'google']
const MEDIUM_PRESETS = ['social', 'paid_social', 'cpc', 'email', 'organic']
const CAMPAIGN_PRESETS = ['asbury_brand', 'inventory_push', 'sales_event', 'service_promo', 'seasonal', 'community']

export default function UtmBuilder() {
  const [url, setUrl] = useState('')
  const [source, setSource] = useState('facebook')
  const [medium, setMedium] = useState('social')
  const [campaign, setCampaign] = useState('')
  const [term, setTerm] = useState('')
  const [content, setContent] = useState('')
  const [copied, setCopied] = useState(false)

  const buildUtm = () => {
    if (!url.trim()) return ''
    try {
      const base = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`
      const u = new URL(base)
      if (source)   u.searchParams.set('utm_source', source)
      if (medium)   u.searchParams.set('utm_medium', medium)
      if (campaign) u.searchParams.set('utm_campaign', campaign)
      if (term)     u.searchParams.set('utm_term', term)
      if (content)  u.searchParams.set('utm_content', content)
      return u.toString()
    } catch { return '' }
  }

  const result = buildUtm()

  const copy = () => {
    if (!result) return
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const ChipGroup = ({ value, setValue, options }) => (
    <div className="flex gap-1.5 flex-wrap mt-2">
      {options.map(o => (
        <button key={o} onClick={() => setValue(o)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
            value === o ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">Destination URL *</label>
          <input type="text" value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://www.nalleyhonda.com/specials"
            className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400" />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Source <span className="text-slate-400 font-normal">(utm_source)</span></label>
          <input type="text" value={source} onChange={e => setSource(e.target.value)}
            className="mt-1.5 w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400" />
          <ChipGroup value={source} setValue={setSource} options={SOURCE_PRESETS} />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Medium <span className="text-slate-400 font-normal">(utm_medium)</span></label>
          <input type="text" value={medium} onChange={e => setMedium(e.target.value)}
            className="mt-1.5 w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400" />
          <ChipGroup value={medium} setValue={setMedium} options={MEDIUM_PRESETS} />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Campaign <span className="text-slate-400 font-normal">(utm_campaign)</span></label>
          <input type="text" value={campaign} onChange={e => setCampaign(e.target.value)}
            placeholder="e.g. may_sales_event"
            className="mt-1.5 w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400" />
          <ChipGroup value={campaign} setValue={setCampaign} options={CAMPAIGN_PRESETS} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-slate-700">Content <span className="text-slate-400 font-normal">(optional)</span></label>
            <input type="text" value={content} onChange={e => setContent(e.target.value)}
              placeholder="e.g. carousel_a"
              className="mt-1.5 w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Term <span className="text-slate-400 font-normal">(optional)</span></label>
            <input type="text" value={term} onChange={e => setTerm(e.target.value)}
              placeholder="e.g. honda_crv"
              className="mt-1.5 w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400" />
          </div>
        </div>
      </div>

      {result && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-indigo-800 break-all flex-1 font-mono leading-relaxed">{result}</p>
            <button onClick={copy}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
        </div>
      )}

      {!url && (
        <p className="text-sm text-slate-400 text-center py-4">Enter a destination URL to generate your tracking link</p>
      )}
    </div>
  )
}
```

---

### Tool 5: `ContentMixAnalyzer.jsx`

Live data from PostsContext. Shows content pillar distribution.

```jsx
import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { subDays } from 'date-fns'
import { usePosts } from '../../context/PostsContext'
import { DEALERSHIPS } from '../../data/dealerships'

const PILLAR_COLORS = {
  inventory:   '#6366f1',
  promotion:   '#f59e0b',
  service:     '#10b981',
  brand:       '#3b82f6',
  community:   '#ec4899',
  seasonal:    '#8b5cf6',
  corporate:   '#94a3b8',
}

const PILLAR_LABELS = {
  inventory:  'Inventory / New Arrivals',
  promotion:  'Sales Event / Promotion',
  service:    'Service & Parts',
  brand:      'Brand Culture / Team',
  community:  'Community / Local',
  seasonal:   'Seasonal / Holiday',
  corporate:  'Corporate / Announcement',
}

const RANGES = [
  { label: 'Last 7 days',  days: 7  },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time',     days: null },
]

export default function ContentMixAnalyzer() {
  const { posts } = usePosts()
  const [dealerFilter, setDealerFilter] = useState('all')
  const [rangeIdx, setRangeIdx] = useState(1)

  const range = RANGES[rangeIdx]

  const filtered = useMemo(() => {
    const cutoff = range.days ? subDays(new Date(), range.days) : null
    return posts.filter(p => {
      if (p.approval_status === 'deleted') return false
      if (dealerFilter !== 'all' && p.dealership_id !== dealerFilter) return false
      if (cutoff) {
        try { if (new Date(p.uploaded_at) < cutoff) return false } catch {}
      }
      return true
    })
  }, [posts, dealerFilter, rangeIdx])

  const chartData = useMemo(() => {
    const counts = {}
    filtered.forEach(p => {
      const key = p.content_pillar || 'unknown'
      counts[key] = (counts[key] || 0) + 1
    })
    return Object.entries(counts)
      .filter(([k]) => k !== 'unknown')
      .map(([key, value]) => ({
        name: PILLAR_LABELS[key] || key,
        key,
        value,
        color: PILLAR_COLORS[key] || '#cbd5e1',
      }))
      .sort((a, b) => b.value - a.value)
  }, [filtered])

  const total = chartData.reduce((s, d) => s + d.value, 0)

  const recommendations = useMemo(() => {
    const recs = []
    const pcts = {}
    chartData.forEach(d => { pcts[d.key] = (d.value / total) * 100 })
    if ((pcts.inventory || 0) > 60) recs.push('Inventory posts dominate. Consider adding more brand and community content.')
    if ((pcts.service || 0) < 10 && total > 10) recs.push('Service content is under 10%. Dealership service lanes drive repeat revenue — post more.')
    if (!pcts.community && total > 10) recs.push('No community content detected. Local posts drive 2–3x more organic reach for dealerships.')
    if ((pcts.brand || 0) < 5 && total > 10) recs.push('Low brand/culture content. Team posts and behind-the-scenes drive follower trust.')
    return recs
  }, [chartData, total])

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select value={dealerFilter} onChange={e => setDealerFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-xl px-3.5 py-2 focus:outline-none focus:border-indigo-400 bg-white flex-1"
        >
          <option value="all">All Dealerships</option>
          {DEALERSHIPS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <div className="flex gap-1">
          {RANGES.map((r, i) => (
            <button key={i} onClick={() => setRangeIdx(i)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                rangeIdx === i ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-sm">No posts found for the selected filters</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">
              {total} posts · {range.label.toLowerCase()}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                    dataKey="value" paddingAngle={2}>
                    {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {chartData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-sm text-slate-700 flex-1">{d.name}</span>
                    <span className="text-xs font-bold text-slate-900">{d.value}</span>
                    <span className="text-xs text-slate-400 w-10 text-right">{((d.value / total) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {recommendations.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Recommendations</p>
              <ul className="space-y-1.5">
                {recommendations.map((r, i) => (
                  <li key={i} className="text-sm text-amber-800 flex gap-2">
                    <span className="flex-shrink-0 mt-0.5">→</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

---

### Tool 6: `CaptionFormatter.jsx`

AI-powered caption reformatter. Calls a new Vercel API route.

```jsx
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

const FORMATS = [
  { id: 'instagram', label: 'Instagram', hint: 'Hook first line, line breaks, hashtags at end' },
  { id: 'facebook',  label: 'Facebook',  hint: 'Conversational, longer OK, link above fold' },
  { id: 'linkedin',  label: 'LinkedIn',  hint: 'Professional hook, short paragraphs, no hashtag spam' },
  { id: 'tiktok',    label: 'TikTok',    hint: 'Ultra-short, punchy, call to action in first sentence' },
]

export default function CaptionFormatter() {
  const [input, setInput] = useState('')
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(null)

  const format = async (platformId) => {
    if (!input.trim()) return
    setLoading(platformId)
    setError('')
    try {
      const res = await fetch('/api/format-caption', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ caption: input.trim(), platform: platformId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setResults(prev => ({ ...prev, [platformId]: data.formatted }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(null)
    }
  }

  const formatAll = async () => {
    for (const p of FORMATS) {
      await format(p.id)
    }
  }

  const copy = (id, text) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <label className="text-sm font-medium text-slate-700 block mb-1.5">Source Caption</label>
        <textarea value={input} onChange={e => setInput(e.target.value)} rows={4}
          placeholder="Paste your raw caption here..."
          className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:border-indigo-400"
        />
        <div className="flex gap-2 mt-3">
          <button onClick={formatAll} disabled={!input.trim() || !!loading}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Formatting…' : 'Format for all platforms'}
          </button>
          {FORMATS.map(p => (
            <button key={p.id} onClick={() => format(p.id)} disabled={!input.trim() || !!loading}
              className="px-3 py-2 text-sm font-medium bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              {loading === p.id ? '…' : p.label}
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>

      {FORMATS.map(p => results[p.id] && (
        <div key={p.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <div>
              <p className="text-xs font-bold text-slate-700">{p.label}</p>
              <p className="text-[10px] text-slate-400">{p.hint}</p>
            </div>
            <button onClick={() => copy(p.id, results[p.id])}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              {copied === p.id ? <><Check size={12} className="text-green-600" /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
          <div className="p-4">
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{results[p.id]}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

### Tool 7: `AdSpendEstimator.jsx`

Ported from portfolio. Pure calculator.

```jsx
import { useState } from 'react'

export default function AdSpendEstimator() {
  const [spend, setSpend] = useState('')
  const [cpl, setCpl] = useState('')

  const monthlySpend = parseFloat(spend) || 0
  const costPerLead  = parseFloat(cpl) || null

  const wasteLow  = monthlySpend * 0.20
  const wasteHigh = monthlySpend * 0.40
  const wasteYrLow  = wasteLow * 12
  const wasteYrHigh = wasteHigh * 12
  const leadsLostLow  = costPerLead ? Math.round(wasteLow / costPerLead) : null
  const leadsLostHigh = costPerLead ? Math.round(wasteHigh / costPerLead) : null
  const pct = monthlySpend > 0 ? 30 : 0

  const fmt = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Monthly Ad Spend</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input type="number" value={spend} onChange={e => setSpend(e.target.value)}
              placeholder="5000"
              className="w-full pl-8 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400" />
          </div>
          <p className="text-xs text-slate-400 mt-1">Total across all campaigns (Facebook Ads, Google, TikTok)</p>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Current Cost Per Lead <span className="text-slate-400 font-normal">(optional)</span></label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input type="number" value={cpl} onChange={e => setCpl(e.target.value)}
              placeholder="75"
              className="w-full pl-8 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400" />
          </div>
        </div>
      </div>

      {monthlySpend > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-red-50 border border-red-100 rounded-xl p-5">
            <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-1">Estimated Monthly Waste</p>
            <p className="text-2xl font-bold text-red-700">{fmt(wasteLow)} – {fmt(wasteHigh)}</p>
            <p className="text-xs text-red-500 mt-1">{fmt(wasteYrLow)} – {fmt(wasteYrHigh)} per year</p>
          </div>

          {leadsLostLow !== null && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
              <p className="text-xs font-bold text-amber-500 uppercase tracking-wide mb-1">Leads Going to Waste / mo</p>
              <p className="text-2xl font-bold text-amber-700">{leadsLostLow} – {leadsLostHigh}</p>
              <p className="text-xs text-amber-500 mt-1">At your {fmt(costPerLead)} CPL</p>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:col-span-2">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>Typical waste range: 20–40%</span>
              <span className="font-semibold text-slate-700">{pct}% est.</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-red-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-2">Every audit finds waste in this range. Without one, you don't know where yours sits.</p>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

### Tool 8: `SerpPreview.jsx`

Ported from portfolio. Mobile + desktop Google preview.

```jsx
import { useState } from 'react'

const DESKTOP_TITLE_MAX = 600
const MOBILE_TITLE_MAX  = 460
const DESC_MAX          = 920

function pxWidth(str, fontSize) {
  // rough approximation: average char width varies by font
  const avgCharPx = fontSize === 20 ? 11.5 : 8.5
  return str.length * avgCharPx
}

function truncateByPx(str, maxPx, fontSize) {
  let result = str
  while (pxWidth(result, fontSize) > maxPx && result.length > 0) {
    result = result.slice(0, -1)
  }
  return result === str ? str : result + '...'
}

export default function SerpPreview() {
  const [title, setTitle] = useState('')
  const [displayUrl, setDisplayUrl] = useState('')
  const [desc, setDesc] = useState('')
  const [view, setView] = useState('mobile')

  const titleTruncated = view === 'desktop'
    ? truncateByPx(title, DESKTOP_TITLE_MAX, 20)
    : truncateByPx(title, MOBILE_TITLE_MAX, 20)

  const descTruncated = truncateByPx(desc, DESC_MAX, 14)

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Title Tag</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Your page title..."
            maxLength={100}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400" />
          <p className={`text-xs mt-1 ${title.length > 60 ? 'text-amber-600' : 'text-slate-400'}`}>
            {title.length}/60 recommended
          </p>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Display URL</label>
          <input type="text" value={displayUrl} onChange={e => setDisplayUrl(e.target.value)}
            placeholder="nalleyhonda.com › new › crv"
            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Meta Description</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
            placeholder="Your meta description..."
            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:border-indigo-400" />
          <p className={`text-xs mt-1 ${desc.length > 160 ? 'text-amber-600' : 'text-slate-400'}`}>
            {desc.length}/160 recommended
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {['mobile', 'desktop'].map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
              view === v ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Google-style preview */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3 text-xs text-slate-400">
          <div className="w-5 h-5 bg-slate-200 rounded-full flex-shrink-0" />
          <span>{displayUrl || 'yourdomain.com › page'}</span>
          <span>▾</span>
        </div>
        <p className="text-[#1a0dab] text-lg hover:underline cursor-pointer leading-snug mb-1"
          style={{ fontSize: view === 'desktop' ? 20 : 18 }}>
          {titleTruncated || 'Your Page Title Goes Here'}
        </p>
        <p className="text-sm text-slate-600 leading-relaxed">
          {descTruncated || 'Your meta description will appear here. Keep it under 160 characters for best display.'}
        </p>
      </div>
    </div>
  )
}
```

---

### Tool 9: `SchemaValidator.jsx`

Fetches URL via proxy, extracts and validates JSON-LD schema.

```jsx
import { useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

const KNOWN_TYPES = new Set([
  'LocalBusiness','AutoDealer','Organization','WebSite','WebPage','Product',
  'FAQPage','Article','BlogPosting','BreadcrumbList','Person','Event','Service',
  'Review','AggregateRating','ImageObject','VideoObject','SearchAction',
])

function validateSchema(obj) {
  const errors = []
  const warnings = []
  if (!obj['@context']) errors.push('Missing @context (should be "https://schema.org")')
  if (!obj['@type']) errors.push('Missing @type')
  else if (!KNOWN_TYPES.has(obj['@type'])) warnings.push(`Unknown type: ${obj['@type']} — verify at schema.org`)
  if (obj['@type'] === 'LocalBusiness' || obj['@type'] === 'AutoDealer') {
    if (!obj.name) errors.push('LocalBusiness/AutoDealer: missing "name"')
    if (!obj.address) warnings.push('LocalBusiness: missing "address" — required for local SEO')
    if (!obj.telephone) warnings.push('LocalBusiness: missing "telephone"')
    if (!obj.url) warnings.push('LocalBusiness: missing "url"')
  }
  return { errors, warnings, valid: errors.length === 0 }
}

export default function SchemaValidator() {
  const [url, setUrl] = useState('')
  const [json, setJson] = useState('')
  const [schemas, setSchemas] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [validationResult, setValidationResult] = useState(null)

  const fetchSchemas = async () => {
    setFetching(true)
    setFetchError('')
    setSchemas(null)
    try {
      const res = await fetch('/api/fetch-page', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fetch failed')
      // Extract JSON-LD blocks from HTML
      const matches = [...(data.html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))]
      const extracted = matches.map(m => {
        try { return JSON.parse(m[1]) } catch { return null }
      }).filter(Boolean)
      setSchemas(extracted)
      if (extracted.length === 0) setFetchError('No JSON-LD schema found on this page.')
    } catch (err) {
      setFetchError(err.message)
    } finally {
      setFetching(false)
    }
  }

  const validate = () => {
    try {
      const parsed = JSON.parse(json)
      setValidationResult(validateSchema(parsed))
    } catch {
      setValidationResult({ errors: ['Invalid JSON — check for syntax errors'], warnings: [], valid: false })
    }
  }

  return (
    <div className="space-y-5">
      {/* Fetch from URL */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-700 mb-3">Fetch from URL</p>
        <div className="flex gap-2">
          <input type="url" value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://www.nalleyhonda.com"
            className="flex-1 px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400" />
          <button onClick={fetchSchemas} disabled={!url.trim() || fetching}
            className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {fetching ? 'Fetching…' : 'Fetch & scan'}
          </button>
        </div>
        {fetchError && <p className="text-xs text-red-500 mt-2">{fetchError}</p>}
      </div>

      {schemas && schemas.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">{schemas.length} schema{schemas.length !== 1 ? 's' : ''} found</p>
          <div className="space-y-2">
            {schemas.map((s, i) => (
              <button key={i} onClick={() => { setJson(JSON.stringify(s, null, 2)); setValidationResult(null) }}
                className="w-full text-left px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm text-slate-700 hover:bg-indigo-50 transition-colors flex items-center justify-between"
              >
                <span>{s['@type'] || 'Unknown type'}</span>
                <span className="text-xs text-slate-400">Load →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* JSON editor */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-700 mb-2">JSON-LD Input</p>
        <textarea value={json} onChange={e => { setJson(e.target.value); setValidationResult(null) }}
          rows={10}
          placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "AutoDealer",\n  "name": "Nalley Honda"\n}'}
          className="w-full px-3.5 py-2.5 text-xs font-mono border border-slate-200 rounded-xl resize-none focus:outline-none focus:border-indigo-400"
        />
        <button onClick={validate} disabled={!json.trim()}
          className="mt-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          Validate
        </button>
      </div>

      {validationResult && (
        <div className={`rounded-xl border p-4 ${validationResult.valid ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2 mb-3">
            {validationResult.valid
              ? <CheckCircle size={16} className="text-emerald-600" />
              : <XCircle size={16} className="text-red-500" />}
            <p className={`text-sm font-semibold ${validationResult.valid ? 'text-emerald-700' : 'text-red-700'}`}>
              {validationResult.valid ? 'Schema is valid' : `${validationResult.errors.length} error${validationResult.errors.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          {validationResult.errors.map((e, i) => (
            <div key={i} className="flex gap-2 mb-1.5 text-sm text-red-700">
              <XCircle size={13} className="mt-0.5 flex-shrink-0" />{e}
            </div>
          ))}
          {validationResult.warnings.map((w, i) => (
            <div key={i} className="flex gap-2 mb-1.5 text-sm text-amber-700">
              <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />{w}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

### Tool 10: `AeoScanner.jsx`

Checks 12 AEO signals on any URL via the proxy.

```jsx
import { useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Minus } from 'lucide-react'

const CHECKS = [
  { id: 'json_ld',      label: 'JSON-LD schema present',         weight: 'critical', test: html => /<script[^>]+type=["']application\/ld\+json/i.test(html) },
  { id: 'faq_schema',   label: 'FAQ schema present',             weight: 'high',     test: html => /FAQPage/i.test(html) },
  { id: 'author',       label: 'Author markup present',          weight: 'high',     test: html => /author|byline/i.test(html) },
  { id: 'og_tags',      label: 'Open Graph tags present',        weight: 'high',     test: html => /property=["']og:/i.test(html) },
  { id: 'twitter_card', label: 'Twitter Card tags present',      weight: 'medium',   test: html => /name=["']twitter:card/i.test(html) },
  { id: 'canonical',    label: 'Canonical URL defined',          weight: 'high',     test: html => /rel=["']canonical/i.test(html) },
  { id: 'meta_desc',    label: 'Meta description present',       weight: 'critical', test: html => /name=["']description["']/i.test(html) },
  { id: 'h1',           label: 'H1 tag present',                 weight: 'critical', test: html => /<h1[\s>]/i.test(html) },
  { id: 'breadcrumb',   label: 'BreadcrumbList schema',          weight: 'medium',   test: html => /BreadcrumbList/i.test(html) },
  { id: 'date',         label: 'Published/modified date markup', weight: 'medium',   test: html => /datePublished|dateModified|published_time/i.test(html) },
  { id: 'https',        label: 'Served over HTTPS',              weight: 'critical', test: (html, url) => url.startsWith('https://') },
  { id: 'viewport',     label: 'Mobile viewport meta tag',       weight: 'high',     test: html => /name=["']viewport/i.test(html) },
]

const WEIGHT_CONFIG = {
  critical: { label: 'Critical', color: 'text-red-600', bg: 'bg-red-100' },
  high:     { label: 'High',     color: 'text-amber-600', bg: 'bg-amber-100' },
  medium:   { label: 'Medium',   color: 'text-blue-600', bg: 'bg-blue-100' },
}

export default function AeoScanner() {
  const [url, setUrl] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const scan = async () => {
    setLoading(true)
    setError('')
    setResults(null)
    try {
      const res = await fetch('/api/fetch-page', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fetch failed')
      const html = data.html
      const checked = CHECKS.map(check => ({
        ...check,
        pass: check.test(html, url),
      }))
      setResults(checked)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const score = results ? Math.round((results.filter(r => r.pass).length / results.length) * 100) : null
  const criticalFails = results?.filter(r => !r.pass && r.weight === 'critical') || []

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex gap-2">
          <input type="url" value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://www.nalleyhonda.com"
            onKeyDown={e => e.key === 'Enter' && url.trim() && scan()}
            className="flex-1 px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400" />
          <button onClick={scan} disabled={!url.trim() || loading}
            className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Scanning…' : 'Scan site'}
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>

      {results && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className={`rounded-xl p-4 text-center col-span-1 ${score >= 80 ? 'bg-emerald-50 border border-emerald-200' : score >= 60 ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-3xl font-bold ${score >= 80 ? 'text-emerald-700' : score >= 60 ? 'text-amber-700' : 'text-red-700'}`}>{score}%</p>
              <p className="text-xs font-medium text-slate-500 mt-1">AEO Score</p>
            </div>
            <div className="rounded-xl p-4 text-center bg-white border border-slate-200">
              <p className="text-3xl font-bold text-slate-900">{results.filter(r => r.pass).length}</p>
              <p className="text-xs font-medium text-slate-500 mt-1">Passing</p>
            </div>
            <div className="rounded-xl p-4 text-center bg-white border border-slate-200">
              <p className="text-3xl font-bold text-red-600">{criticalFails.length}</p>
              <p className="text-xs font-medium text-slate-500 mt-1">Critical fails</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">
            {results.map((r, i) => {
              const w = WEIGHT_CONFIG[r.weight]
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  {r.pass
                    ? <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                    : r.weight === 'medium'
                    ? <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
                    : <XCircle size={16} className="text-red-400 flex-shrink-0" />}
                  <span className="text-sm text-slate-700 flex-1">{r.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${w.bg} ${w.color}`}>
                    {w.label}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
```

---

## STEP 3 — Vercel API routes

### `api/fetch-page.js`

Proxy for fetching external page HTML (used by Schema Validator and AEO Scanner).

```js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { url } = req.body || {}
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Valid URL required (must start with http/https)' })
  }

  // Block internal/private network addresses
  try {
    const u = new URL(url)
    const blocked = ['localhost','127.0.0.1','0.0.0.0','::1','169.254.','10.','192.168.','172.16.']
    if (blocked.some(b => u.hostname.startsWith(b))) {
      return res.status(400).json({ error: 'Private/internal URLs are not allowed' })
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' })
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AsburySocialHub/1.0; +https://asbury-social-hub.vercel.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
      // Timeout via AbortController
      signal: AbortSignal.timeout(12000),
    })

    if (!response.ok) {
      return res.status(422).json({ error: `Page returned ${response.status}` })
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('html')) {
      return res.status(422).json({ error: 'URL does not return HTML content' })
    }

    const html = await response.text()
    // Limit to 500KB to prevent memory issues
    return res.status(200).json({ html: html.slice(0, 512000) })
  } catch (err) {
    if (err.name === 'TimeoutError') {
      return res.status(408).json({ error: 'Page took too long to respond (12s timeout)' })
    }
    return res.status(500).json({ error: `Could not fetch URL: ${err.message}` })
  }
}
```

### `api/format-caption.js`

```js
// Required: ANTHROPIC_API_KEY in Vercel env vars

const PLATFORM_INSTRUCTIONS = {
  instagram: 'Format this caption for Instagram: strong first line that works as a hook before "more" truncation, natural line breaks between paragraphs, hashtags on a separate line at the end. Keep the core message but optimize for the feed.',
  facebook:  'Format this caption for Facebook: conversational and friendly tone, can be longer (Facebook audiences tolerate more text), include a clear call-to-action near the beginning, minimal hashtags (2-3 max).',
  linkedin:  'Format this caption for LinkedIn: professional hook in the first line, short punchy paragraphs (1-2 sentences each), 3-5 relevant hashtags only, end with a question or CTA that invites professional engagement.',
  tiktok:    'Format this caption for TikTok: ultra-short (under 100 words), punchy opening line, include 3-5 trending-style hashtags, conversational and energetic tone. Lead with the most compelling claim or offer.',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { caption, platform } = req.body || {}
  if (!caption?.trim()) return res.status(400).json({ error: 'Caption is required' })
  if (!PLATFORM_INSTRUCTIONS[platform]) return res.status(400).json({ error: 'Unknown platform' })

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Caption formatter not configured. Add ANTHROPIC_API_KEY in Vercel settings.' })
  }

  const prompt = `${PLATFORM_INSTRUCTIONS[platform]}

Original caption:
${caption.trim()}

Return ONLY the reformatted caption text. No explanation, no labels, no markdown. Just the caption.`

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
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`)

    const data = await response.json()
    const formatted = data.content?.[0]?.text?.trim() || ''

    return res.status(200).json({ formatted })
  } catch (err) {
    console.error('Caption formatter error:', err)
    return res.status(500).json({ error: 'Failed to format caption. Try again.' })
  }
}
```

---

## STEP 4 — Final wiring check

1. Confirm `src/App.jsx` has the `/tools` route with ProtectedRoute wrapper
2. Confirm `src/components/layout/Sidebar.jsx` has the Wrench nav item
3. Confirm all 10 tool component files exist in `src/components/tools/`
4. Confirm `api/fetch-page.js` and `api/format-caption.js` exist in `api/`
5. Run `npm run build` — should have zero errors
6. Test locally: navigate to `/tools`, click through each tool

```
git add -A
git commit -m "feat: Tools page — 10 tools (Post Preview, Image Spec, Hashtag Analyzer, UTM Builder, Content Mix, Caption Formatter, Ad Spend Estimator, SERP Preview, Schema Validator, AEO Scanner)"
git push
```

---

## Verification checklist

- [ ] `/tools` route loads for all roles (admin, social_media, viewer)
- [ ] Tool nav appears in sidebar with Wrench icon
- [ ] Clicking each tool in the sidebar updates the active panel
- [ ] URL hash updates when switching tools (`/tools#utm-builder` etc.)
- [ ] Post Preview shows caption truncation warning when over platform limit
- [ ] Image Spec Validator reads dimensions from uploaded file
- [ ] Hashtag Analyzer: selecting hashtags and copying batch works
- [ ] UTM Builder generates correct URL with all params
- [ ] Content Mix Analyzer loads live posts from PostsContext (not mock data)
- [ ] Caption Formatter calls API and returns all 4 platform formats
- [ ] Ad Spend Estimator calculates waste range correctly
- [ ] SERP Preview truncates title at correct pixel width
- [ ] Schema Validator fetches URL and extracts JSON-LD blocks
- [ ] AEO Scanner returns a score and lists all 12 checks
- [ ] Mobile: horizontal tabs work, all tools accessible
