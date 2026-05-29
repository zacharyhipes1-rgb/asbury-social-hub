import { useState, useRef, useEffect } from 'react'
import {
  Wrench, Search, Link2, Tag, Hash, Image, Clock,
  Globe, Zap, Share2, BarChart2, Map,
  ExternalLink, ChevronRight, Monitor, Smartphone,
  Code2, CheckCircle, AlertCircle, FileSearch, Gauge,
  QrCode, RefreshCw
} from 'lucide-react'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'

// ── Analytics helper — fire-and-forget, never breaks the tool ─────────────────
async function logToolEvent(toolId) {
  try { await supabase.from('tool_events').insert({ tool_id: toolId }) } catch { /* silent */ }
}

// ── Platform constants ────────────────────────────────────────────────────────

const PLATFORM_LIMITS = {
  instagram: { caption: 2200, hashtags: 30 },
  facebook:  { caption: 63206, hashtags: 'unlimited' },
  tiktok:    { caption: 2200, hashtags: 100 },
  linkedin:  { caption: 3000, hashtags: 30 },
  twitter:   { caption: 280, hashtags: 'n/a' },
}

const PLATFORM_COLORS = {
  instagram: '#E1306C',
  facebook:  '#1877F2',
  tiktok:    '#010101',
  linkedin:  '#0A66C2',
  twitter:   '#1DA1F2',
}

// ── Tool: SERP Preview ────────────────────────────────────────────────────────

function SerpPreview() {
  const [title, setTitle] = useState('')
  const [url,   setUrl]   = useState('')
  const [desc,  setDesc]  = useState('')
  const [view,  setView]  = useState('mobile')

  const titleLen = title.length
  const descLen  = desc.length
  const titleWarn = titleLen > 60
  const descWarn  = descLen  > 160

  const truncTitle = title
    ? (titleLen > 60 ? title.slice(0, 60) + '…' : title)
    : 'Your Page Title Goes Here'

  const descLimit = view === 'mobile' ? 130 : 160
  const truncDesc = desc
    ? (descLen > descLimit ? desc.slice(0, descLimit) + '…' : desc)
    : 'This is your meta description. It appears below the title and URL in Google search results.'

  const displayUrl = url || 'yourdomain.com › page › slug'

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Title Tag</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Your page title..."
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
          />
          <p className={`text-xs mt-1 ${titleWarn ? 'text-rose-500' : 'text-slate-400'}`}>{titleLen}/60 characters</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Display URL</label>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="domain.com › page"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Meta Description</label>
        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Your meta description..."
          rows={2}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none"
        />
        <p className={`text-xs mt-1 ${descWarn ? 'text-rose-500' : 'text-slate-400'}`}>{descLen}/160 characters</p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Preview:</span>
        {[['mobile', Smartphone, 'Mobile'], ['desktop', Monitor, 'Desktop']].map(([v, Icon, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              view === v ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
          >
            <Icon size={12} />{label}
          </button>
        ))}
      </div>

      <div className={`bg-white border border-slate-200 rounded-xl p-4 ${view === 'mobile' ? 'max-w-[400px]' : 'max-w-full'}`}>
        <p className="text-xs text-slate-400 mb-3 font-medium">google.com/search</p>
        <p className="text-xs text-slate-500 truncate">{displayUrl}</p>
        <p className="text-[#1a0dab] text-lg font-normal hover:underline cursor-pointer leading-tight">{truncTitle}</p>
        <p className="text-sm text-slate-600 leading-snug mt-1">{truncDesc}</p>
      </div>
    </div>
  )
}

// ── Tool: UTM Builder ─────────────────────────────────────────────────────────

function UtmBuilder() {
  const [url,      setUrl]      = useState('')
  const [source,   setSource]   = useState('instagram')
  const [medium,   setMedium]   = useState('social')
  const [campaign, setCampaign] = useState('')
  const [content,  setContent]  = useState('')
  const [copied,   setCopied]   = useState(false)

  const buildUtm = () => {
    if (!url) return ''
    try {
      const base = url.startsWith('http') ? url : `https://${url}`
      const u = new URL(base)
      if (source)   u.searchParams.set('utm_source',   source.toLowerCase().replace(/\s+/g, '_'))
      if (medium)   u.searchParams.set('utm_medium',   medium.toLowerCase().replace(/\s+/g, '_'))
      if (campaign) u.searchParams.set('utm_campaign', campaign.toLowerCase().replace(/\s+/g, '_'))
      if (content)  u.searchParams.set('utm_content',  content.toLowerCase().replace(/\s+/g, '_'))
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Destination URL</label>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://asburyauto.com/inventory/..."
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Source</label>
          <select
            value={source}
            onChange={e => setSource(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white transition-colors"
          >
            {['instagram','facebook','tiktok','linkedin','twitter'].map(p => (
              <option key={p} value={p}>{p === 'twitter' ? 'X (Twitter)' : p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Medium</label>
          <input
            value={medium}
            onChange={e => setMedium(e.target.value)}
            placeholder="social"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Campaign</label>
          <input
            value={campaign}
            onChange={e => setCampaign(e.target.value)}
            placeholder="spring_sales_2025"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Content (optional)</label>
          <input
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="new_arrivals_post"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
          />
        </div>
      </div>

      {result && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tagged URL</p>
            <button
              onClick={copy}
              className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all ${
                copied ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-slate-600 break-all font-mono leading-relaxed">{result}</p>
        </div>
      )}
    </div>
  )
}

// ── Tool: Caption Counter ─────────────────────────────────────────────────────

function CaptionCounter() {
  const [caption, setCaption] = useState('')
  const len       = caption.length
  const hashCount = (caption.match(/#\w+/g) || []).length
  const wordCount = caption.split(/\s+/).filter(Boolean).length

  const platforms = ['instagram','facebook','tiktok','linkedin','twitter']

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Caption / Post Copy</label>
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Paste or type your caption here..."
          rows={5}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none"
        />
        <div className="flex items-center gap-4 mt-1.5">
          <p className="text-xs text-slate-400">{len.toLocaleString()} characters</p>
          <p className="text-xs text-slate-400">{hashCount} hashtags</p>
          <p className="text-xs text-slate-400">{wordCount} words</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {platforms.map(p => {
          const limit      = PLATFORM_LIMITS[p]
          const captionPct = Math.min((len / limit.caption) * 100, 100)
          const isOver     = len > limit.caption
          const isWarning  = !isOver && captionPct > 80
          const barColor   = isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500'
          const textColor  = isOver ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'
          const name       = p === 'twitter' ? 'X (Twitter)' : p.charAt(0).toUpperCase() + p.slice(1)

          return (
            <div key={p} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PLATFORM_COLORS[p] }} />
                  <p className="text-sm font-semibold text-slate-700">{name}</p>
                </div>
                <span className={`text-xs font-bold ${textColor}`}>
                  {isOver ? `+${len - limit.caption} over` : `${len}/${limit.caption}`}
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${captionPct}%` }} />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Hashtags: {typeof limit.hashtags === 'number' ? `max ${limit.hashtags}` : limit.hashtags}</span>
                {hashCount > 0 && typeof limit.hashtags === 'number' && (
                  <span className={hashCount > limit.hashtags ? 'text-rose-500 font-semibold' : 'text-emerald-600'}>
                    {hashCount}/{limit.hashtags}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Tool: Image Dimension Guide ───────────────────────────────────────────────

function ImageGuide() {
  const specs = [
    {
      platform: 'Instagram', color: '#E1306C',
      formats: [
        { name: 'Feed Square',   dims: '1080 × 1080', ratio: '1:1',     note: 'Default, safest crop' },
        { name: 'Feed Portrait', dims: '1080 × 1350', ratio: '4:5',     note: 'Most screen real estate' },
        { name: 'Feed Landscape',dims: '1080 × 566',  ratio: '1.91:1',  note: 'Least visibility' },
        { name: 'Story / Reel',  dims: '1080 × 1920', ratio: '9:16',    note: 'Full screen' },
      ],
    },
    {
      platform: 'Facebook', color: '#1877F2',
      formats: [
        { name: 'Feed Photo',    dims: '1200 × 630',  ratio: '1.91:1',  note: 'Standard link post' },
        { name: 'Feed Square',   dims: '1080 × 1080', ratio: '1:1',     note: 'High engagement' },
        { name: 'Story',         dims: '1080 × 1920', ratio: '9:16',    note: 'Full screen' },
        { name: 'Cover Photo',   dims: '851 × 315',   ratio: '~2.7:1',  note: 'Page header' },
      ],
    },
    {
      platform: 'TikTok', color: '#010101',
      formats: [
        { name: 'Video',         dims: '1080 × 1920', ratio: '9:16',    note: 'Vertical only' },
        { name: 'Profile Photo', dims: '200 × 200',   ratio: '1:1',     note: 'Circular crop' },
      ],
    },
    {
      platform: 'LinkedIn', color: '#0A66C2',
      formats: [
        { name: 'Feed Image',    dims: '1200 × 627',  ratio: '1.91:1',  note: 'Standard post' },
        { name: 'Square Post',   dims: '1080 × 1080', ratio: '1:1',     note: 'Higher impressions' },
        { name: 'Company Logo',  dims: '300 × 300',   ratio: '1:1',     note: 'Page branding' },
        { name: 'Cover Image',   dims: '1584 × 396',  ratio: '4:1',     note: 'Company header' },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      {specs.map(({ platform, color, formats }) => (
        <div key={platform}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <h3 className="text-sm font-bold text-slate-700">{platform}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {formats.map(f => (
              <div key={f.name} className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-500 mb-1">{f.name}</p>
                <p className="text-base font-bold text-slate-900 tracking-tight font-mono">{f.dims}</p>
                <p className="text-[10px] text-slate-400 mt-1">{f.ratio} · {f.note}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Tool: Best Post Times ─────────────────────────────────────────────────────

function BestTimes() {
  const data = [
    {
      platform: 'Instagram', color: '#E1306C',
      slots: [
        { day: 'Mon–Fri',   time: '9–11am',    note: 'Highest consistent reach' },
        { day: 'Wednesday', time: '11am',       note: 'Peak mid-week engagement' },
        { day: 'Saturday',  time: '10am–12pm',  note: 'Weekend browse window' },
      ],
    },
    {
      platform: 'Facebook', color: '#1877F2',
      slots: [
        { day: 'Tue–Thu',  time: '10am–3pm', note: 'Business hours scroll' },
        { day: 'Friday',   time: '11am–1pm', note: 'Pre-weekend peak' },
        { day: 'Sunday',   time: '1–3pm',    note: 'Leisure browsing' },
      ],
    },
    {
      platform: 'TikTok', color: '#010101',
      slots: [
        { day: 'Tue–Fri',   time: '7–9pm',     note: 'Evening use spike' },
        { day: 'Sat–Sun',   time: '9–11am',    note: 'Morning leisure time' },
        { day: 'Daily',     time: '12–1pm',    note: 'Lunch break scroll' },
      ],
    },
    {
      platform: 'LinkedIn', color: '#0A66C2',
      slots: [
        { day: 'Tue–Thu',  time: '8–10am',     note: 'Pre-meeting check' },
        { day: 'Tuesday',  time: '10am–12pm',  note: 'Highest B2B reach' },
        { day: 'Wed–Thu',  time: '5–6pm',      note: 'End-of-day scroll' },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-400">
        Based on industry averages. Validate against your own platform analytics — dealership audiences skew toward evening and weekend windows.
      </p>
      {data.map(({ platform, color, slots }) => (
        <div key={platform}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <h3 className="text-sm font-bold text-slate-700">{platform}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {slots.map((s, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                  <p className="text-xs font-bold text-slate-500">{s.day}</p>
                </div>
                <p className="text-lg font-bold text-slate-900">{s.time}</p>
                <p className="text-[10px] text-slate-400 mt-1">{s.note}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Tool: Hashtag Planner ─────────────────────────────────────────────────────

function HashtagPlanner() {
  const [copied, setCopied] = useState(null)

  const sets = [
    {
      label: 'Automotive General',
      color: '#6366f1',
      tags: ['#automotive', '#carsofinstagram', '#car', '#vehicle', '#auto', '#newcar', '#usedcar', '#cardealer', '#dealership', '#ride'],
    },
    {
      label: 'New Vehicle Inventory',
      color: '#10b981',
      tags: ['#newcar', '#carsforsale', '#newarrival', '#shopmycars', '#carshopping', '#buyacar', '#newinventory', '#carlovers', '#dreamcar', '#vehiclesofinstagram'],
    },
    {
      label: 'Service & Maintenance',
      color: '#f59e0b',
      tags: ['#carservice', '#autorepair', '#oilchange', '#carcare', '#vehiclemaintenance', '#autoshop', '#mechanicsofinstagram', '#tiresafety', '#cardetailing', '#keepitrunning'],
    },
    {
      label: 'BMW',
      color: '#1d1d1b',
      tags: ['#BMW', '#BMWusa', '#BMWrepost', '#BMWofnorthamerica', '#bmwlife', '#bmwlove', '#bavarian', '#bmwm', '#ultimatedrivingmachine', '#bmwfan'],
    },
    {
      label: 'Honda',
      color: '#c00000',
      tags: ['#Honda', '#HondaUSA', '#HondaOfAmerica', '#hondalife', '#hondafamily', '#hondacivic', '#hondacrv', '#hondapilot', '#hondaaccord', '#powerofdreams'],
    },
    {
      label: 'Toyota',
      color: '#e60012',
      tags: ['#Toyota', '#ToyotaUSA', '#LetsGoPlaces', '#toyotalife', '#toyotanation', '#4runner', '#tacoma', '#camry', '#tundra', '#toyotafamily'],
    },
    {
      label: 'Local / Atlanta Market',
      color: '#8b5cf6',
      tags: ['#atlanta', '#atl', '#atlantacars', '#georgiacars', '#atlanta404', '#atlantadeals', '#atllife', '#georgiadealership', '#atlantaauto', '#visitatlanta'],
    },
  ]

  const copySet = (tags, label) => {
    navigator.clipboard.writeText(tags.join(' '))
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Pre-built hashtag sets for common content types. Copy a full set or cherry-pick individual tags.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sets.map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <p className="text-sm font-bold text-slate-700">{s.label}</p>
              </div>
              <button
                onClick={() => copySet(s.tags, s.label)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
                  copied === s.label ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {copied === s.label ? 'Copied!' : 'Copy all'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {s.tags.map(tag => (
                <span
                  key={tag}
                  onClick={() => { navigator.clipboard.writeText(tag) }}
                  className="text-xs font-medium px-2 py-0.5 rounded-full border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tool: Schema Validator ────────────────────────────────────────────────────

const SCHEMA_RULES = {
  LocalBusiness:  { required: ['name', 'address'], recommended: ['telephone', 'url', 'openingHours', 'priceRange', 'geo', 'sameAs'] },
  AutoDealer:     { required: ['name', 'address'], recommended: ['telephone', 'url', 'openingHours', 'priceRange', 'geo', 'sameAs', 'hasMap'] },
  Organization:   { required: ['name'],            recommended: ['url', 'logo', 'contactPoint', 'address', 'sameAs', 'telephone'] },
  Corporation:    { required: ['name'],            recommended: ['url', 'logo', 'address', 'sameAs'] },
  WebPage:        { required: ['name'],            recommended: ['url', 'description', 'breadcrumb', 'dateModified'] },
  WebSite:        { required: ['name', 'url'],     recommended: ['potentialAction', 'description'] },
  Article:        { required: ['headline', 'author', 'datePublished'], recommended: ['image', 'publisher', 'dateModified', 'description'],
    custom: (s, e, w) => { if (s.headline?.length > 110) w.push(`headline is ${s.headline.length} chars — Google truncates at 110`) } },
  NewsArticle:    { required: ['headline', 'author', 'datePublished'], recommended: ['image', 'publisher', 'dateModified', 'description'] },
  BlogPosting:    { required: ['headline', 'author', 'datePublished'], recommended: ['image', 'publisher', 'dateModified', 'description'] },
  Product:        { required: ['name'],            recommended: ['description', 'image', 'brand', 'offers', 'sku', 'aggregateRating'] },
  Vehicle:        { required: ['name'],            recommended: ['description', 'image', 'brand', 'offers', 'vehicleIdentificationNumber', 'mileageFromOdometer'] },
  Offer:          { required: ['price', 'priceCurrency'], recommended: ['availability', 'url', 'priceValidUntil', 'itemCondition'] },
  Review:         { required: ['itemReviewed', 'reviewRating', 'author'], recommended: ['datePublished', 'reviewBody', 'publisher'] },
  AggregateRating:{ required: ['ratingValue'],     recommended: ['bestRating', 'worstRating'],
    custom: (s, e) => { if (!s.reviewCount && !s.ratingCount) e.push('AggregateRating requires reviewCount or ratingCount') } },
  Event:          { required: ['name', 'startDate', 'location'], recommended: ['endDate', 'description', 'image', 'organizer', 'eventStatus'] },
  Person:         { required: ['name'],            recommended: ['url', 'email', 'jobTitle', 'affiliation', 'sameAs', 'image'] },
  Service:        { required: ['name'],            recommended: ['description', 'provider', 'serviceType', 'areaServed', 'url'] },
  FAQPage: {
    required: ['mainEntity'], recommended: [],
    custom: (s, e, w) => {
      const items = s.mainEntity
      if (!Array.isArray(items) || !items.length) { e.push('mainEntity must be a non-empty array of Question objects'); return }
      items.forEach((q, i) => {
        if (q['@type'] !== 'Question') w.push(`mainEntity[${i}] should have @type "Question"`)
        if (!q.name) e.push(`mainEntity[${i}] missing required property: name`)
        if (!q.acceptedAnswer) e.push(`mainEntity[${i}] missing required property: acceptedAnswer`)
        else if (!q.acceptedAnswer.text) e.push(`mainEntity[${i}].acceptedAnswer missing required property: text`)
      })
    },
  },
  BreadcrumbList: {
    required: ['itemListElement'], recommended: [],
    custom: (s, e) => {
      const items = s.itemListElement
      if (!Array.isArray(items) || !items.length) { e.push('itemListElement must be a non-empty array of ListItem objects'); return }
      items.forEach((item, i) => {
        if (item.position == null) e.push(`itemListElement[${i}] missing required property: position`)
        if (!item.name && !item.item) e.push(`itemListElement[${i}] must have name or item`)
      })
    },
  },
}

const KNOWN_TYPES = new Set([
  ...Object.keys(SCHEMA_RULES),
  'PostalAddress', 'GeoCoordinates', 'ImageObject', 'VideoObject', 'ContactPoint',
  'OpeningHoursSpecification', 'Rating', 'ListItem', 'Question', 'Answer',
  'ItemList', 'SearchAction', 'ReadAction', 'EntryPoint', 'AggregateOffer',
  'PropertyValue', 'MonetaryAmount', 'QuantitativeValue', 'Distance',
])

// ── Fix guidance ──────────────────────────────────────────────────────────────
// Returns { why, steps[], example? } for any error/warning message.
const PROPERTY_FIXES = {
  name: {
    why: 'The name property is how Google identifies and displays your entity in search results and knowledge panels.',
    steps: ['Add a "name" property with the official business or page name', 'Use the exact legal or brand name — no keyword stuffing'],
    example: '"name": "Toyota of Roswell"',
  },
  url: {
    why: 'The url property ties the schema to a specific page, strengthening entity association for Google.',
    steps: ['Add a "url" property pointing to the canonical URL of this page', 'Use the full https:// URL'],
    example: '"url": "https://www.yoursite.com/page"',
  },
  address: {
    why: 'Address enables Local SEO, Google Maps integration, and rich results for "near me" searches.',
    steps: [
      'Add an "address" property as a nested object',
      'Set "@type" to "PostalAddress" inside the nested object',
      'Include streetAddress, addressLocality (city), addressRegion (state), postalCode, and addressCountry',
    ],
    example: '"address": {\n  "@type": "PostalAddress",\n  "streetAddress": "123 Main St",\n  "addressLocality": "Roswell",\n  "addressRegion": "GA",\n  "postalCode": "30076",\n  "addressCountry": "US"\n}',
  },
  telephone: {
    why: 'A phone number enables Google to show a call button in local search results.',
    steps: ['Add a "telephone" property in E.164 format', 'Include country code and area code'],
    example: '"telephone": "+1-770-555-1234"',
  },
  description: {
    why: 'Descriptions help Google and AI engines understand what the page or entity is about — critical for AEO/GEO visibility.',
    steps: ['Write a 1–3 sentence description covering what you offer, where you are, and who you serve', 'Avoid keyword stuffing — write for humans and LLMs', 'Keep under 500 characters for best display in rich results'],
    example: '"description": "Toyota of Roswell is an authorized Toyota dealership in Roswell, GA offering new and used vehicles, certified service, and genuine Toyota parts."',
  },
  image: {
    why: 'An image is required for most rich result types and significantly increases click-through rate.',
    steps: ['Add an "image" property with the URL of a high-quality photo', 'Minimum 1200×630px recommended for rich results', 'Use your Google Business Profile photo or a professional exterior shot'],
    example: '"image": "https://www.yoursite.com/images/dealership-exterior.jpg"',
  },
  priceRange: {
    why: 'Price range helps Google categorize your business and can appear in local search results.',
    steps: ['Add a "priceRange" property using dollar signs ($, $$, $$$)', 'Most dealerships use "$$$"'],
    example: '"priceRange": "$$$"',
  },
  openingHours: {
    why: 'Opening hours enable Google to show your hours in local search and mark you as open/closed in real time.',
    steps: [
      'Add an "openingHours" array with entries in the format "Day HH:MM-HH:MM"',
      'Use two-letter day abbreviations: Mo, Tu, We, Th, Fr, Sa, Su',
      'Separate day ranges with a hyphen (Mo-Fr)',
    ],
    example: '"openingHours": ["Mo-Fr 09:00-20:00", "Sa 09:00-18:00", "Su 11:00-17:00"]',
  },
  geo: {
    why: 'GPS coordinates give Google a precise location signal, improving Maps accuracy and local ranking.',
    steps: ['Add a "geo" object with "@type": "GeoCoordinates"', 'Find your exact latitude/longitude on Google Maps (right-click → "What\'s here?")'],
    example: '"geo": {\n  "@type": "GeoCoordinates",\n  "latitude": 34.0232,\n  "longitude": -84.3616\n}',
  },
  sameAs: {
    why: 'sameAs links your entity to authoritative profiles (Google Business, Facebook, etc.) and builds entity trust for AI and search engines.',
    steps: ['Add a "sameAs" array listing all official profiles', 'Include: Google Business Profile URL, Facebook page, LinkedIn, Yelp, and manufacturer profile'],
    example: '"sameAs": [\n  "https://www.facebook.com/YourPage",\n  "https://maps.google.com/?cid=YOUR_CID",\n  "https://www.yelp.com/biz/your-listing"\n]',
  },
  review: {
    why: 'Review schema can unlock star ratings in search results, dramatically increasing click-through rate.',
    steps: ['Add a "review" or "aggregateRating" property', 'For aggregate ratings use "@type": "AggregateRating" with ratingValue and reviewCount', 'Ratings must reflect real reviews — do not fabricate values'],
    example: '"aggregateRating": {\n  "@type": "AggregateRating",\n  "ratingValue": "4.7",\n  "reviewCount": "312"\n}',
  },
  provider: {
    why: 'The provider property attributes a service to the business offering it, required for Service schema.',
    steps: ['Add a "provider" object referencing your organization', 'Include "@type" (typically "AutoDealer" or "Organization") and "@id"'],
    example: '"provider": {\n  "@type": "AutoDealer",\n  "@id": "https://www.yoursite.com/#dealer",\n  "name": "Your Dealership"\n}',
  },
  serviceType: {
    why: 'serviceType tells Google specifically what kind of service is being offered, enabling better categorization.',
    steps: ['Add a "serviceType" string describing the specific service', 'Be specific: "Oil Change", "Tire Rotation", "Brake Inspection"'],
    example: '"serviceType": "Oil Change and Filter Service"',
  },
  brand: {
    why: 'Brand schema connects your product to its manufacturer, improving accuracy in product search and shopping results.',
    steps: ['Add a "brand" object with "@type": "Brand"', 'Include the manufacturer name'],
    example: '"brand": {\n  "@type": "Brand",\n  "name": "Toyota"\n}',
  },
  offers: {
    why: 'Offers schema unlocks price and availability information in rich results and Google Shopping.',
    steps: ['Add an "offers" object with "@type": "Offer"', 'Include price, priceCurrency, and availability'],
    example: '"offers": {\n  "@type": "Offer",\n  "price": "29.99",\n  "priceCurrency": "USD",\n  "availability": "https://schema.org/InStock"\n}',
  },
  author: {
    why: 'Author establishes E-E-A-T (Experience, Expertise, Authority, Trust) — a key Google quality signal.',
    steps: ['Add an "author" object with "@type": "Person" or "Organization"', 'Include name and optionally url or sameAs links'],
    example: '"author": {\n  "@type": "Person",\n  "name": "John Smith"\n}',
  },
  datePublished: {
    why: 'Publication date helps Google understand content freshness and can appear in search snippets.',
    steps: ['Add "datePublished" in ISO 8601 format (YYYY-MM-DD or full datetime)', 'Also add "dateModified" if the content is updated regularly'],
    example: '"datePublished": "2026-05-28"',
  },
  headline: {
    why: 'Headline is the article title shown in Google News and Discover results.',
    steps: ['Add a "headline" property with the exact article title', 'Keep under 110 characters for full display in rich results'],
    example: '"headline": "Nalley Honda Introduces New 2026 Honda CR-V Hybrid Models"',
  },
  mainEntity: {
    why: 'mainEntity clarifies what the FAQ or QA page is primarily about, strengthening rich result eligibility.',
    steps: ['Add a "mainEntity" array containing your Question objects', 'Each Question needs acceptedAnswer with "@type": "Answer"'],
    example: '"mainEntity": [{\n  "@type": "Question",\n  "name": "What are your service hours?",\n  "acceptedAnswer": {\n    "@type": "Answer",\n    "text": "We are open Mon–Fri 7am–6pm."\n  }\n}]',
  },
}

function getFixGuidance(msg, schemaType) {
  // Missing @type
  if (msg === 'Missing @type') return {
    why: '@type is the most critical property — without it Google cannot interpret the schema at all and will ignore it entirely.',
    steps: [
      'Add "@type" as the second property (after "@context") in your JSON-LD',
      'For dealership pages use "AutoDealer" or "CarDealer"',
      'For service pages use "Service"',
      'For blog/news articles use "Article" or "NewsArticle"',
      'For FAQs use "FAQPage"',
      'Full type list: schema.org/docs/full.html',
    ],
    example: '{\n  "@context": "https://schema.org",\n  "@type": "AutoDealer",\n  "name": "Your Dealership",\n  ...\n}',
  }

  // Missing @context
  if (msg.includes('Missing @context')) return {
    why: '@context declares the vocabulary being used. Without it Google cannot parse any of the other properties.',
    steps: [
      'Add "@context": "https://schema.org" as the very first property in your JSON-LD object',
      'Always use https:// — the http:// version still works but https is preferred',
      'Do not abbreviate — use the full URL',
    ],
    example: '{\n  "@context": "https://schema.org",\n  "@type": "...",\n  ...\n}',
  }

  // Unexpected @context
  if (msg.includes('Unexpected @context')) return {
    why: 'A non-standard @context may cause Google to reject the schema or misinterpret the vocabulary.',
    steps: ['Replace the existing @context value with "https://schema.org"'],
    example: '"@context": "https://schema.org"',
  }

  // Unrecognized type
  if (msg.includes('is not a recognized schema.org type')) return {
    why: 'An unrecognized @type means Google cannot map this to any rich result type — the schema will be ignored.',
    steps: [
      'Check the spelling exactly — schema.org types are CamelCase (e.g. AutoDealer, not autodealer)',
      'Visit schema.org to find the correct type name',
      'Common automotive types: AutoDealer, CarDealer, Service, Product, Article, FAQPage, LocalBusiness',
    ],
  }

  // address should be a nested object
  if (msg.includes("'address' should be a nested object")) return {
    why: 'Google requires address as a structured PostalAddress object — a plain string will not qualify for rich results.',
    steps: [
      'Replace any string value for "address" with a nested object',
      'Add "@type": "PostalAddress" inside the nested object',
      'Include streetAddress, addressLocality, addressRegion, postalCode, addressCountry',
    ],
    example: PROPERTY_FIXES.address.example,
  }

  // Missing required property
  if (msg.startsWith('Missing required property:')) {
    const prop = msg.replace('Missing required property: ', '')
    const fix = PROPERTY_FIXES[prop]
    if (fix) return fix
    return {
      why: `"${prop}" is required for this schema type to qualify for rich results in Google Search.`,
      steps: [`Add "${prop}" to your schema`, `Visit schema.org/${schemaType || ''} for the correct format and accepted values`],
    }
  }

  // Missing recommended property
  if (msg.startsWith('Missing recommended property:')) {
    const prop = msg.replace('Missing recommended property: ', '')
    const fix = PROPERTY_FIXES[prop]
    if (fix) return {
      ...fix,
      why: fix.why + ' (Recommended — not required, but improves rich result eligibility and AI visibility.)',
    }
    return {
      why: `"${prop}" is not required but Google recommends it for better rich result coverage and AI citation accuracy.`,
      steps: [`Add "${prop}" to your schema`, `Visit schema.org/${schemaType || ''} for accepted values`],
    }
  }

  // Fallback
  return {
    why: 'This issue may prevent Google from displaying rich results for this page.',
    steps: ['Review the schema.org documentation for this type', 'Use Google\'s Rich Results Test at search.google.com/test/rich-results to verify after fixing'],
  }
}

// Validate a single schema node (no @context required — used for @graph items)
function validateSchemaNode(node) {
  const errors = [], warnings = []
  const type = Array.isArray(node['@type']) ? node['@type'][0] : node['@type']
  if (!type) { errors.push('Missing @type'); return { errors, warnings, type: null } }
  if (!KNOWN_TYPES.has(type)) warnings.push(`"${type}" is not a recognized schema.org type — verify spelling`)
  const rules = SCHEMA_RULES[type]
  if (rules) {
    rules.required?.forEach(p => { if (node[p] == null) errors.push(`Missing required property: ${p}`) })
    rules.recommended?.forEach(p => { if (node[p] == null) warnings.push(`Missing recommended property: ${p}`) })
    rules.custom?.(node, errors, warnings)
  }
  return { errors, warnings, type }
}

function validateOneSchema(schema) {
  const errors = [], warnings = []
  const ctx = schema['@context']
  if (!ctx) {
    errors.push('Missing @context — should be "https://schema.org"')
  } else if (!['https://schema.org', 'http://schema.org', 'https://schema.org/', 'http://schema.org/'].includes(ctx)) {
    warnings.push(`Unexpected @context: "${ctx}" — use "https://schema.org"`)
  }

  // @graph support — the container does NOT need @type; validate each item individually
  if (Array.isArray(schema['@graph'])) {
    const graphItems = schema['@graph'].map((item, i) => ({ index: i, ...validateSchemaNode(item) }))
    return { errors, warnings, type: '@graph', graphItems }
  }

  // Plain single schema
  const type = Array.isArray(schema['@type']) ? schema['@type'][0] : schema['@type']
  if (!type) { errors.push('Missing @type'); return { errors, warnings, type: null } }
  if (!KNOWN_TYPES.has(type)) warnings.push(`"${type}" is not a recognized schema.org type — verify spelling`)
  const rules = SCHEMA_RULES[type]
  if (rules) {
    rules.required?.forEach(p => { if (schema[p] == null) errors.push(`Missing required property: ${p}`) })
    rules.recommended?.forEach(p => { if (schema[p] == null) warnings.push(`Missing recommended property: ${p}`) })
    rules.custom?.(schema, errors, warnings)
  }
  return { errors, warnings, type }
}

function SchemaIssueRow({ msg, isError, schemaType }) {
  const [open, setOpen] = useState(false)
  const guidance = getFixGuidance(msg, schemaType)

  return (
    <div className={`px-4 py-3 ${open ? (isError ? 'bg-rose-50/40' : 'bg-amber-50/40') : ''} transition-colors`}>
      {/* Issue header */}
      <div className="flex items-start gap-2.5">
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${isError ? 'bg-rose-500' : 'bg-amber-400'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-700 font-medium">{msg}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
            open
              ? 'bg-slate-200 text-slate-700'
              : isError
                ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          }`}
        >
          {open ? 'Hide' : 'How to fix →'}
        </button>
      </div>

      {/* Expandable fix guidance */}
      {open && (
        <div className="mt-3 ml-4 space-y-3">
          {/* Why it matters */}
          <div className="flex items-start gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide w-12 flex-shrink-0 pt-0.5">Why</span>
            <p className="text-xs text-slate-600 leading-relaxed">{guidance.why}</p>
          </div>

          {/* Steps */}
          <div className="flex items-start gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide w-12 flex-shrink-0 pt-0.5">Fix</span>
            <ol className="space-y-1 flex-1">
              {guidance.steps.map((step, k) => (
                <li key={k} className="flex items-start gap-1.5 text-xs text-slate-700">
                  <span className={`flex-shrink-0 font-bold mt-0.5 ${isError ? 'text-rose-500' : 'text-amber-500'}`}>{k + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Code example */}
          {guidance.example && (
            <div className="flex items-start gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide w-12 flex-shrink-0 pt-0.5">Code</span>
              <pre className="flex-1 text-xs bg-slate-900 text-emerald-400 rounded-lg px-3 py-2.5 overflow-x-auto whitespace-pre font-mono leading-relaxed">{guidance.example}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SchemaValidator() {
  const [input,    setInput]    = useState('')
  const [results,  setResults]  = useState(null)
  const [parseErr, setParseErr] = useState('')

  // URL fetch state
  const [fetchUrl,  setFetchUrl]  = useState('')
  const [fetching,  setFetching]  = useState(false)
  const [fetchErr,  setFetchErr]  = useState('')
  const [fetchBlocks, setFetchBlocks] = useState(null)
  const [selBlock,  setSelBlock]  = useState(0)

  const prettify = () => {
    try { setInput(JSON.stringify(JSON.parse(input.trim()), null, 2)); setParseErr('') }
    catch (e) { setParseErr(`Invalid JSON: ${e.message}`) }
  }

  const clear = () => {
    setInput(''); setResults(null); setParseErr('')
    setFetchUrl(''); setFetchErr(''); setFetchBlocks(null)
  }

  const validate = () => {
    setParseErr(''); setResults(null)
    let parsed
    try { parsed = JSON.parse(input.trim()) }
    catch (e) { setParseErr(`Invalid JSON: ${e.message}`); return }
    const schemas = Array.isArray(parsed) ? parsed : [parsed]
    setResults(schemas.map((s, i) => ({ index: i, ...validateOneSchema(s) })))
    logToolEvent('schema')
  }

  const fetchFromUrl = async () => {
    const url = fetchUrl.trim()
    if (!url) return
    setFetching(true); setFetchErr(''); setFetchBlocks(null); setResults(null)
    try {
      const fullUrl = /^https?:\/\//.test(url) ? url : `https://${url}`
      const res = await fetch('/api/fetch-meta', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: fullUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch page')
      if (!data.jsonLdBlocks?.length) {
        setFetchErr('No JSON-LD structured data found on this page.')
      } else {
        setFetchBlocks(data.jsonLdBlocks)
        setSelBlock(0)
        // Load the first block directly into the textarea
        setInput(JSON.stringify(data.jsonLdBlocks[0], null, 2))
        setParseErr('')
      }
    } catch (e) {
      setFetchErr(e.message)
    } finally {
      setFetching(false)
    }
  }

  const loadBlock = (i) => {
    setSelBlock(i)
    setInput(JSON.stringify(fetchBlocks[i], null, 2))
    setResults(null); setParseErr('')
  }

  const countIssues = (results, key) => results?.reduce((n, r) => {
    const direct = r[key].length
    const nested = r.graphItems?.reduce((g, gi) => g + gi[key].length, 0) ?? 0
    return n + direct + nested
  }, 0) ?? 0
  const totalErrors   = countIssues(results, 'errors')
  const totalWarnings = countIssues(results, 'warnings')
  const isValid = results && totalErrors === 0

  return (
    <div className="space-y-4">

      {/* URL fetch bar */}
      <div className="flex gap-2">
        <input
          value={fetchUrl}
          onChange={e => { setFetchUrl(e.target.value); setFetchErr('') }}
          onKeyDown={e => e.key === 'Enter' && fetchUrl.trim() && !fetching && fetchFromUrl()}
          placeholder="Paste a URL to pull its JSON-LD — or type markup below"
          className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
        />
        <button
          onClick={fetchFromUrl}
          disabled={!fetchUrl.trim() || fetching}
          className="px-4 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          {fetching ? 'Fetching…' : 'Fetch Schema'}
        </button>
      </div>

      {fetchErr && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs text-rose-700">{fetchErr}</div>
      )}

      {/* Block selector — shown when page has multiple JSON-LD blocks */}
      {fetchBlocks && fetchBlocks.length > 1 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-400 font-medium">{fetchBlocks.length} blocks found:</span>
          {fetchBlocks.map((block, i) => {
            const t = Array.isArray(block['@type']) ? block['@type'].join('+') : block['@type'] || `Block ${i + 1}`
            return (
              <button key={i} onClick={() => loadBlock(i)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                  selBlock === i ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}>{t}</button>
            )
          })}
        </div>
      )}

      {fetchBlocks && fetchBlocks.length === 1 && (
        <p className="text-xs text-emerald-700 font-medium">
          1 JSON-LD block found — loaded into editor below.
        </p>
      )}

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">JSON-LD Markup</label>
          <div className="flex gap-2">
            <button onClick={prettify} disabled={!input.trim()} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors">Format</button>
            <button onClick={clear}    disabled={!input && !fetchUrl} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors">Clear</button>
          </div>
        </div>
        <textarea
          value={input}
          onChange={e => { setInput(e.target.value); setResults(null); setParseErr('') }}
          placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "AutoDealer",\n  "name": "Crown Honda",\n  "address": { "@type": "PostalAddress", "addressLocality": "Dublin", "addressRegion": "OH" }\n}'}
          rows={10}
          spellCheck={false}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none font-mono text-slate-700 leading-relaxed"
        />
        {parseErr && <p className="text-xs text-rose-600 mt-1 font-medium">{parseErr}</p>}
      </div>

      <button
        onClick={validate}
        disabled={!input.trim()}
        className="w-full py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
      >
        Validate Schema
      </button>

      {results && (
        <div className="space-y-3">
          <div className={`rounded-xl px-4 py-3 flex items-center gap-3 border ${isValid ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isValid ? 'bg-emerald-100' : 'bg-rose-100'}`}>
              {isValid
                ? <CheckCircle size={16} className="text-emerald-600" />
                : <AlertCircle size={16} className="text-rose-600" />}
            </div>
            <div>
              <p className={`text-sm font-semibold ${isValid ? 'text-emerald-800' : 'text-rose-800'}`}>
                {isValid ? 'Valid schema' : `${totalErrors} error${totalErrors !== 1 ? 's' : ''} found`}
              </p>
              <p className={`text-xs ${isValid ? 'text-emerald-600' : 'text-rose-600'}`}>
                {totalWarnings > 0 ? `${totalWarnings} warning${totalWarnings !== 1 ? 's' : ''}${isValid ? ' — consider adding recommended properties' : ''}` : isValid ? 'No issues detected' : ''}
              </p>
            </div>
          </div>

          {results.map((r, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {/* Container header */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    {r.type === '@graph'
                      ? <><span className="font-mono text-indigo-600 text-xs bg-indigo-50 px-1.5 py-0.5 rounded">@graph</span><span className="text-slate-700">{r.graphItems?.length} schema nodes</span></>
                      : r.type || 'Unknown type'
                    }
                    {results.length > 1 && <span className="text-slate-400 font-normal ml-1">#{i + 1}</span>}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {r.type === '@graph'
                      ? `@graph container · ${r.errors.length > 0 ? `${r.errors.length} container error${r.errors.length !== 1 ? 's' : ''}` : '✓ valid structure'}`
                      : r.errors.length === 0 && r.warnings.length === 0 ? '✓ No issues'
                      : `${r.errors.length} error${r.errors.length !== 1 ? 's' : ''} · ${r.warnings.length} warning${r.warnings.length !== 1 ? 's' : ''}`
                    }
                  </p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.errors.length === 0 && (!r.graphItems || r.graphItems.every(g => g.errors.length === 0)) ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {r.errors.length === 0 && (!r.graphItems || r.graphItems.every(g => g.errors.length === 0)) ? 'Pass' : 'Fail'}
                </span>
              </div>

              {/* Container-level errors (e.g. bad @context) */}
              {(r.errors.length > 0 || r.warnings.length > 0) && (
                <div className="divide-y divide-slate-50 border-b border-slate-100">
                  {r.errors.map((msg, j) => (
                    <SchemaIssueRow key={`e${j}`} msg={msg} isError schemaType={r.type} />
                  ))}
                  {r.warnings.map((msg, j) => (
                    <SchemaIssueRow key={`w${j}`} msg={msg} isError={false} schemaType={r.type} />
                  ))}
                </div>
              )}

              {/* @graph items — each validated individually */}
              {r.graphItems && (
                <div className="divide-y divide-slate-100">
                  {r.graphItems.map((gi, j) => (
                    <div key={j} className="bg-slate-50/50">
                      <div className="px-4 py-2.5 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-700">{gi.type || 'Unknown type'} <span className="font-normal text-slate-400 ml-1">#{j + 1}</span></p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {gi.errors.length === 0 && gi.warnings.length === 0 ? '✓ No issues' : `${gi.errors.length} error${gi.errors.length !== 1 ? 's' : ''} · ${gi.warnings.length} warning${gi.warnings.length !== 1 ? 's' : ''}`}
                          </p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${gi.errors.length === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {gi.errors.length === 0 ? 'Pass' : 'Fail'}
                        </span>
                      </div>
                      {(gi.errors.length > 0 || gi.warnings.length > 0) && (
                        <div className="divide-y divide-slate-100 border-t border-slate-100">
                          {gi.errors.map((msg, k) => <SchemaIssueRow key={`ge${k}`} msg={msg} isError schemaType={gi.type} />)}
                          {gi.warnings.map((msg, k) => <SchemaIssueRow key={`gw${k}`} msg={msg} isError={false} schemaType={gi.type} />)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tool: Meta Tag Inspector ──────────────────────────────────────────────────

function MetaRow({ label, value }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      <p className="text-[11px] font-mono text-indigo-600 font-semibold min-w-[160px] flex-shrink-0 pt-0.5 break-all">{label}</p>
      <p className="text-xs text-slate-600 break-all">{value || <span className="text-slate-300 italic">empty</span>}</p>
    </div>
  )
}

function MetaGroup({ label, tags }) {
  if (!tags.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label} <span className="text-slate-300 font-normal">({tags.length})</span></p>
      </div>
      <div className="divide-y divide-slate-50">
        {tags.map((tag, i) => {
          const key = tag.property || tag.name || tag['http-equiv'] || 'meta'
          return <MetaRow key={i} label={key} value={tag.content} />
        })}
      </div>
    </div>
  )
}

function MetaInspector() {
  const [url,     setUrl]     = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState('')

  const inspect = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/fetch-meta', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const cats = result ? (() => {
    const og      = result.metas.filter(m => m.property?.startsWith('og:'))
    const twitter = result.metas.filter(m => m.name?.startsWith('twitter:') || m.property?.startsWith('twitter:'))
    const seo     = result.metas.filter(m => !m.property?.startsWith('og:') && !m.name?.startsWith('twitter:') && !m.property?.startsWith('twitter:') && (m.name || m.property))
    return { og, twitter, seo }
  })() : null

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={url}
          onChange={e => { setUrl(e.target.value); setResult(null); setError('') }}
          onKeyDown={e => e.key === 'Enter' && url.trim() && !loading && inspect()}
          placeholder="https://asburyauto.com/dealers/crown-honda"
          className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
        />
        <button
          onClick={inspect}
          disabled={!url.trim() || loading}
          className="btn-press px-4 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          {loading ? 'Fetching…' : 'Inspect'}
        </button>
      </div>

      {error && <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">{error}</div>}

      {loading && (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-8 text-center">
          <div className="w-7 h-7 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Fetching {url}…</p>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Page Title</p>
            {result.title
              ? <>
                  <p className="text-sm font-semibold text-slate-800">{result.title}</p>
                  <p className={`text-xs mt-1 ${result.title.length > 60 ? 'text-rose-500' : 'text-slate-400'}`}>{result.title.length}/60 characters</p>
                </>
              : <p className="text-sm text-slate-400 italic">No title tag found</p>
            }
          </div>
          <MetaGroup label="SEO" tags={cats.seo} />
          <MetaGroup label="Open Graph" tags={cats.og} />
          <MetaGroup label="Twitter / X Card" tags={cats.twitter} />
          {result.jsonLdBlocks.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Structured Data <span className="text-slate-300 font-normal">({result.jsonLdBlocks.length} block{result.jsonLdBlocks.length !== 1 ? 's' : ''})</span>
                </p>
              </div>
              <div className="divide-y divide-slate-50">
                {result.jsonLdBlocks.map((block, i) => (
                  <div key={i} className="px-4 py-3">
                    <p className="text-xs font-semibold text-indigo-600 mb-1.5">
                      {Array.isArray(block['@type']) ? block['@type'].join(', ') : block['@type'] || 'Unknown'}
                    </p>
                    <pre className="text-[10px] text-slate-500 overflow-x-auto leading-relaxed whitespace-pre-wrap">{JSON.stringify(block, null, 2)}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tool: PageSpeed Score ─────────────────────────────────────────────────────

function PageSpeedScore() {
  const [url,      setUrl]      = useState('')
  const [strategy, setStrategy] = useState('mobile')
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState('')

  const run = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const res  = await fetch('/api/pagespeed', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), strategy }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'API error')
      setResult(data)
      logToolEvent('pagespeed')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const scoreStyle = s => {
    if (s == null) return { text: 'text-slate-400', ring: 'ring-slate-100' }
    if (s >= 0.9)  return { text: 'text-emerald-600', ring: 'ring-emerald-200' }
    if (s >= 0.5)  return { text: 'text-amber-600',   ring: 'ring-amber-200'   }
    return               { text: 'text-rose-600',    ring: 'ring-rose-200'    }
  }

  const perfScore = result?.lighthouseResult?.categories?.performance?.score
  const audits    = result?.lighthouseResult?.audits

  const METRICS = [
    { key: 'first-contentful-paint',  label: 'FCP',   desc: 'First Contentful Paint'  },
    { key: 'largest-contentful-paint',label: 'LCP',   desc: 'Largest Contentful Paint' },
    { key: 'speed-index',             label: 'SI',    desc: 'Speed Index'              },
    { key: 'total-blocking-time',     label: 'TBT',   desc: 'Total Blocking Time'      },
    { key: 'cumulative-layout-shift', label: 'CLS',   desc: 'Cumulative Layout Shift'  },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={url}
          onChange={e => { setUrl(e.target.value); setResult(null); setError('') }}
          onKeyDown={e => e.key === 'Enter' && url.trim() && !loading && run()}
          placeholder="https://asburyauto.com"
          className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
        />
        <div className="flex border border-slate-200 rounded-lg overflow-hidden">
          {([['mobile', Smartphone], ['desktop', Monitor]]).map(([s, Icon]) => (
            <button
              key={s}
              onClick={() => setStrategy(s)}
              className={`px-3 py-2 transition-colors ${strategy === s ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
        <button
          onClick={run}
          disabled={!url.trim() || loading}
          className="btn-press px-4 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          {loading ? 'Running…' : 'Run Test'}
        </button>
      </div>
      <p className="text-xs text-slate-400">Powered by Google PageSpeed Insights · Tests can take 15–30 seconds</p>

      {error && <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">{error}</div>}

      {loading && (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-10 text-center">
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Analyzing {url}…</p>
          <p className="text-xs text-slate-400 mt-1">This usually takes 15–30 seconds</p>
        </div>
      )}

      {result && perfScore != null && (
        <div className="space-y-3">
          <div className={`bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-5`}>
            <div className={`w-16 h-16 rounded-full ring-4 ${scoreStyle(perfScore).ring} flex items-center justify-center flex-shrink-0`}>
              <span className={`text-xl font-bold ${scoreStyle(perfScore).text}`}>{Math.round(perfScore * 100)}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Performance</p>
              <p className="text-xs text-slate-400 mt-0.5 capitalize">{strategy} · {result.lighthouseResult?.fetchTime ? new Date(result.lighthouseResult.fetchTime).toLocaleTimeString() : ''}</p>
              <p className="text-xs text-slate-500 mt-1">
                {perfScore >= 0.9 ? '✓ Good — fast for users' : perfScore >= 0.5 ? '⚠ Needs improvement' : '✗ Poor — users are impacted'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {METRICS.map(m => {
              const audit  = audits?.[m.key]
              const s      = audit?.score
              const styles = scoreStyle(s)
              return (
                <div key={m.key} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{m.label}</p>
                  <p className={`text-base font-bold mt-1 ${styles.text}`}>{audit?.displayValue || '—'}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{m.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tool: Open Graph Card Preview ─────────────────────────────────────────────

function OgPreview() {
  const [title, setTitle] = useState('')
  const [desc,  setDesc]  = useState('')
  const [image, setImage] = useState('')
  const [site,  setSite]  = useState('')

  const titleLen = title.length
  const descLen  = desc.length
  const titleWarn = titleLen > 60
  const descWarn  = descLen > 155

  const trunc = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s
  const sn = site || 'YOURSITE.COM'
  const placeholderTitle = 'Your shareable title goes here'
  const placeholderDesc  = 'Your Open Graph description appears here when the link is shared on Facebook or other platforms that support OG tags.'

  const previews = [
    { key: 'facebook', label: 'Facebook', color: '#1877F2', titleMax: 88,  descMax: 110, showDesc: true,  siteCaps: true,  footerSite: false },
    { key: 'twitter',  label: 'X',        color: '#000000', titleMax: 70,  descMax: 0,   showDesc: false, siteCaps: false, footerSite: false },
    { key: 'linkedin', label: 'LinkedIn', color: '#0A66C2', titleMax: 119, descMax: 0,   showDesc: false, siteCaps: false, footerSite: true  },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">OG Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Your shareable title..."
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
          <p className={`text-xs mt-1 ${titleWarn ? 'text-rose-500' : 'text-slate-400'}`}>{titleLen}/60 characters</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Site Name</label>
          <input value={site} onChange={e => setSite(e.target.value)} placeholder="Your Business Name"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">OG Image URL</label>
          <input value={image} onChange={e => setImage(e.target.value)} placeholder="https://..."
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">OG Description</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Your description..." rows={2}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none" />
          <p className={`text-xs mt-1 ${descWarn ? 'text-rose-500' : 'text-slate-400'}`}>{descLen}/155 characters</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {previews.map(p => {
          const dispTitle = trunc(title || placeholderTitle, p.titleMax)
          const dispDesc  = trunc(desc  || placeholderDesc,  p.descMax)
          return (
            <div key={p.key} className="bg-white border border-slate-200 rounded-xl overflow-hidden relative">
              <span className="absolute top-2 right-2 z-10 text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: p.color }}>{p.label}</span>
              <div className="aspect-[1.91/1] bg-slate-100 flex items-center justify-center overflow-hidden">
                {image
                  ? <img src={image} alt="" onError={e => { e.currentTarget.style.display = 'none' }} className="w-full h-full object-cover" />
                  : <Image size={28} className="text-slate-300" />}
              </div>
              <div className="p-3">
                {!p.footerSite && (
                  <p className={`text-[10px] text-slate-400 ${p.siteCaps ? 'uppercase' : ''} truncate`}>{p.siteCaps ? sn.toUpperCase() : sn}</p>
                )}
                <p className="text-sm font-bold text-slate-800 leading-snug mt-0.5">{dispTitle}</p>
                {p.showDesc && (
                  <p className="text-xs text-slate-500 mt-1 leading-snug">{dispDesc}</p>
                )}
                {p.footerSite && (
                  <p className="text-[10px] text-slate-400 mt-1 truncate">{sn}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Tool: Google Ads Copy Builder ─────────────────────────────────────────────

function AdsBuilder() {
  const [tab, setTab] = useState('google')
  const [h1, setH1] = useState('')
  const [h2, setH2] = useState('')
  const [h3, setH3] = useState('')
  const [d1, setD1] = useState('')
  const [d2, setD2] = useState('')
  const [domain, setDomain] = useState('')
  const [path1, setPath1] = useState('')
  const [path2, setPath2] = useState('')
  const [primary, setPrimary] = useState('')
  const [mHead, setMHead] = useState('')
  const [mDesc, setMDesc] = useState('')
  const [cta,   setCta]   = useState('Learn More')
  const [mImg,  setMImg]  = useState('')

  const inputCls = 'w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors'
  const labelCls = 'block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide'

  return (
    <div className="space-y-5">
      <div className="flex gap-2 border-b border-slate-200">
        {[['google','Google Search'],['meta','Meta Ads']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${tab === k ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{l}</button>
        ))}
      </div>

      {tab === 'google' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[[h1, setH1, 'Headline 1'], [h2, setH2, 'Headline 2'], [h3, setH3, 'Headline 3']].map(([v, set, l]) => (
              <div key={l}>
                <label className={labelCls}>{l}</label>
                <input value={v} onChange={e => set(e.target.value)} placeholder="Up to 30 chars" className={inputCls} />
                <p className={`text-xs mt-1 ${v.length > 30 ? 'text-rose-500' : 'text-slate-400'}`}>{v.length}/30</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[[d1, setD1, 'Description 1'], [d2, setD2, 'Description 2']].map(([v, set, l]) => (
              <div key={l}>
                <label className={labelCls}>{l}</label>
                <textarea value={v} onChange={e => set(e.target.value)} rows={2} placeholder="Up to 90 chars" className={`${inputCls} resize-none`} />
                <p className={`text-xs mt-1 ${v.length > 90 ? 'text-rose-500' : 'text-slate-400'}`}>{v.length}/90</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Display URL Domain</label>
              <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="asburyauto.com" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Path 1</label>
              <input value={path1} onChange={e => setPath1(e.target.value.slice(0, 15))} placeholder="inventory" className={inputCls} />
              <p className="text-xs mt-1 text-slate-400">{path1.length}/15</p>
            </div>
            <div>
              <label className={labelCls}>Path 2</label>
              <input value={path2} onChange={e => setPath2(e.target.value.slice(0, 15))} placeholder="new" className={inputCls} />
              <p className="text-xs mt-1 text-slate-400">{path2.length}/15</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 max-w-xl">
            <p className="text-xs">
              <span className="font-bold text-slate-800">Ad</span>
              <span className="text-slate-400"> · </span>
              <span className="text-emerald-700">{domain || 'yourdomain.com'}{path1 && `/${path1}`}{path2 && `/${path2}`}</span>
            </p>
            <p className="text-lg text-[#1a0dab] font-normal leading-tight mt-1 hover:underline cursor-pointer">
              {[h1, h2, h3].filter(Boolean).join(' | ') || 'Your headlines | Will show here | Like this'}
            </p>
            <p className="text-sm text-slate-600 mt-1 leading-snug">
              {[d1, d2].filter(Boolean).join(' ') || 'Your descriptions will appear here, joined together as one block of body copy.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Primary Text</label>
            <textarea value={primary} onChange={e => setPrimary(e.target.value)} rows={3} placeholder="Lead with the hook..." className={`${inputCls} resize-none`} />
            <p className={`text-xs mt-1 ${primary.length > 125 ? 'text-amber-500' : 'text-slate-400'}`}>{primary.length}/125 recommended</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Headline</label>
              <input value={mHead} onChange={e => setMHead(e.target.value.slice(0, 40))} placeholder="Up to 40 chars" className={inputCls} />
              <p className="text-xs mt-1 text-slate-400">{mHead.length}/40</p>
            </div>
            <div>
              <label className={labelCls}>Description (optional)</label>
              <input value={mDesc} onChange={e => setMDesc(e.target.value.slice(0, 30))} placeholder="Up to 30 chars" className={inputCls} />
              <p className="text-xs mt-1 text-slate-400">{mDesc.length}/30</p>
            </div>
            <div>
              <label className={labelCls}>Call to Action</label>
              <select value={cta} onChange={e => setCta(e.target.value)} className={`${inputCls} bg-white`}>
                {['Learn More', 'Shop Now', 'Get Quote', 'Contact Us', 'Book Test Drive', 'See Inventory', 'Get Offer'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Image URL (optional)</label>
              <input value={mImg} onChange={e => setMImg(e.target.value)} placeholder="https://..." className={inputCls} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden max-w-md">
            <div className="px-3 py-2 text-xs text-slate-500">Sponsored</div>
            <p className="px-3 pb-2 text-sm text-slate-700 whitespace-pre-wrap leading-snug">{primary || 'Your primary text will appear here as Facebook feed body copy.'}</p>
            <div className="aspect-[1.91/1] bg-slate-100 flex items-center justify-center overflow-hidden">
              {mImg
                ? <img src={mImg} alt="" onError={e => { e.currentTarget.style.display = 'none' }} className="w-full h-full object-cover" />
                : <Image size={28} className="text-slate-300" />}
            </div>
            <div className="px-3 py-3 flex items-center justify-between bg-slate-50 border-t border-slate-100">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-500 uppercase">asburyauto.com</p>
                <p className="text-sm font-bold text-slate-800 truncate">{mHead || 'Your headline'}</p>
                {mDesc && <p className="text-xs text-slate-500 truncate">{mDesc}</p>}
              </div>
              <button className="ml-3 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#1877F2] text-white whitespace-nowrap flex-shrink-0">{cta}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tool: Email Subject Line Tester ───────────────────────────────────────────

const SPAM_WORDS = [
  'free', 'win', 'winner', 'winning', 'prize', 'cash', 'guarantee', 'guaranteed',
  'no cost', 'no fees', 'no obligation', 'risk-free', '100%', 'act now', 'click here',
  'order now', 'buy now', 'limited time', 'offer expires', 'while supplies last',
  "don't miss", 'urgent', 'important', 'dear friend', 'congratulations',
  "you've been selected", 'pre-approved', 'approved', 'credit', 'loan', 'debt',
  'make money', 'earn money', 'extra income', 'work from home', 'lowest price',
  'best price', 'compare rates', 'save big', 'save up to', 'discount', 'as seen on',
]

function EmailSubjectTester() {
  const [subject, setSubject] = useState('')
  const [preview, setPreview] = useState('')
  const [sender,  setSender]  = useState('Your Business')
  const [dark,    setDark]    = useState(false)

  const subjLen = subject.length
  const prevLen = preview.length

  const lower = subject.toLowerCase()
  const found = SPAM_WORDS.filter(w => lower.includes(w))

  const initials = sender.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase() || '').join('') || 'A'

  const renderHighlighted = (text) => {
    if (!text) return null
    if (!found.length) return text
    const escaped = found.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const pattern = new RegExp(`(${escaped.join('|')})`, 'gi')
    const parts = text.split(pattern)
    return parts.map((part, i) => {
      const isMatch = found.some(w => w.toLowerCase() === part.toLowerCase())
      return isMatch
        ? <mark key={i} className="bg-amber-200 text-amber-900 px-0.5 rounded">{part}</mark>
        : <span key={i}>{part}</span>
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Subject Line</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Your subject..."
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
          <div className="flex gap-4 mt-1">
            <p className={`text-xs ${subjLen > 41 ? 'text-amber-500' : 'text-slate-400'}`}>{subjLen}/41 mobile</p>
            <p className={`text-xs ${subjLen > 60 ? 'text-rose-500' : 'text-slate-400'}`}>{subjLen}/60 desktop</p>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Preview Text / Preheader</label>
          <input value={preview} onChange={e => setPreview(e.target.value)} placeholder="Shows after subject in inbox..."
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
          <p className={`text-xs mt-1 ${prevLen > 90 ? 'text-rose-500' : 'text-slate-400'}`}>{prevLen}/90 characters</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Sender Name</label>
          <input value={sender} onChange={e => setSender(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
        </div>
      </div>

      <div className={`rounded-xl px-4 py-3 border ${found.length ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
        <p className={`text-sm font-semibold ${found.length ? 'text-amber-800' : 'text-emerald-800'}`}>
          {found.length ? `${found.length} spam word${found.length > 1 ? 's' : ''} detected` : 'No spam triggers found'}
        </p>
        {found.length > 0 && <p className="text-xs text-amber-700 mt-1">Flagged: {found.join(', ')}</p>}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Previews:</span>
        <button onClick={() => setDark(!dark)} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
          {dark ? 'Switch to light' : 'Switch to dark'}
        </button>
      </div>

      <div className={`rounded-xl border overflow-hidden ${dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className={`px-3 py-2 border-b ${dark ? 'border-slate-800' : 'border-slate-100'}`}>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-slate-500' : 'text-slate-400'}`}>iPhone Mail</p>
        </div>
        <div className="flex items-start gap-3 px-3 py-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{initials}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className={`text-sm font-semibold truncate ${dark ? 'text-white' : 'text-slate-800'}`}>{sender}</p>
              <span className={`text-xs ml-2 flex-shrink-0 ${dark ? 'text-slate-400' : 'text-slate-400'}`}>10:32 AM</span>
            </div>
            <p className={`text-sm font-semibold truncate ${dark ? 'text-white' : 'text-slate-800'}`}>
              {subject ? renderHighlighted(subject.slice(0, 41) + (subject.length > 41 ? '…' : '')) : <span className="text-slate-400 italic">Your subject line</span>}
            </p>
            <p className={`text-xs truncate ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{preview || 'Preview text...'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Gmail Desktop</p>
        </div>
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="w-7 h-7 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{initials}</div>
          <div className="flex-1 min-w-0 flex items-baseline gap-2 overflow-hidden">
            <p className="text-sm font-semibold text-slate-800 flex-shrink-0">{sender}</p>
            <p className="text-sm text-slate-600 truncate min-w-0">
              {subject ? renderHighlighted(subject.slice(0, 60) + (subject.length > 60 ? '…' : '')) : <span className="text-slate-400 italic">subject line</span>}
              {preview && <span className="text-slate-400"> - {preview}</span>}
            </p>
          </div>
          <span className="text-xs text-slate-400 flex-shrink-0">10:32 AM</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Gmail Mobile</p>
        </div>
        <div className="flex items-start gap-3 px-3 py-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{initials}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800 truncate">{sender}</p>
              <span className="text-xs text-slate-400 ml-2 flex-shrink-0">10:32 AM</span>
            </div>
            <p className="text-sm font-semibold text-slate-800 truncate">
              {subject ? renderHighlighted(subject.slice(0, 41) + (subject.length > 41 ? '…' : '')) : <span className="text-slate-400 italic">Your subject line</span>}
            </p>
            <p className="text-xs text-slate-500 truncate">{preview || 'Preview text...'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tool: SMS Counter + Compliance ────────────────────────────────────────────

const GSM7_BASIC = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
const GSM7_EXT = '^{}\\[~]|€'

function isGsm7(text) {
  for (const c of text) {
    if (!GSM7_BASIC.includes(c) && !GSM7_EXT.includes(c)) return false
  }
  return true
}

function gsm7Length(text) {
  let len = 0
  for (const c of text) {
    if (GSM7_EXT.includes(c)) len += 2
    else len += 1
  }
  return len
}

function SmsCounter() {
  const [body, setBody] = useState('')
  const isGsm = isGsm7(body)
  const segLimit   = isGsm ? 160 : 70
  const multiLimit = isGsm ? 153 : 67
  const charCount = isGsm ? gsm7Length(body) : body.length

  let segments = 0
  if (charCount === 0) segments = 0
  else if (charCount <= segLimit) segments = 1
  else segments = Math.ceil(charCount / multiLimit)

  const segCapacity = segments <= 1 ? segLimit : multiLimit * segments
  const remaining = Math.max(0, segCapacity - charCount)

  const hasStop  = /\b(stop|unsubscribe|opt[- ]?out|reply stop|text stop)\b/i.test(body)
  const hasBrand = /asbury/i.test(body)
  const allCapsWords = body.match(/\b[A-Z]{4,}\b/g) || []
  const linkCount = (body.match(/https?:\/\/\S+/gi) || []).length

  const segColor = segments === 0 ? 'text-slate-400' : segments === 1 ? 'text-emerald-600' : segments === 2 ? 'text-amber-600' : 'text-rose-600'

  const segs = []
  if (body) {
    const perSeg = segments > 1 ? multiLimit : segLimit
    let idx = 0
    while (idx < body.length) {
      const end = Math.min(idx + perSeg, body.length)
      segs.push(body.slice(idx, end))
      idx = end
    }
  }

  const checklist = [
    { ok: hasStop,            warn: !hasStop, label: 'Contains opt-out language (STOP, unsubscribe, etc.)' },
    { ok: hasBrand,           neutral: !hasBrand, label: 'Contains your business name' },
    { ok: !allCapsWords.length, warn: allCapsWords.length > 0, label: 'No ALL CAPS words longer than 3 chars', extra: allCapsWords.length ? `Flagged: ${allCapsWords.join(', ')}` : null },
    { ok: linkCount <= 1,     warn: linkCount > 1, label: 'No more than 1 link', extra: linkCount > 1 ? `${linkCount} links found` : null },
    { ok: segments <= 1,      warn: segments === 2, error: segments >= 3, label: 'Under 160 chars (1 segment)' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">SMS Message</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="Type your message..."
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Characters</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{charCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Segments</p>
          <p className={`text-2xl font-bold mt-1 ${segColor}`}>{segments}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Encoding</p>
          <p className="text-sm font-bold mt-2 text-slate-700">{isGsm ? 'GSM-7' : 'Unicode (UCS-2)'}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Remaining</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{remaining}</p>
        </div>
      </div>

      {!isGsm && body && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
          Non-GSM-7 characters detected (emoji, curly quotes, en/em dashes, etc.) — encoding has dropped to Unicode (UCS-2), reducing capacity to 70 chars per segment (67 if multi-part).
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {checklist.map((c, i) => {
            const color = c.error ? 'text-rose-600' : c.warn ? 'text-amber-600' : c.neutral ? 'text-slate-400' : c.ok ? 'text-emerald-600' : 'text-slate-400'
            const Icon = c.ok && !c.error && !c.warn ? CheckCircle : AlertCircle
            return (
              <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                <Icon size={14} className={`${color} flex-shrink-0 mt-0.5`} />
                <div className="flex-1">
                  <p className="text-xs text-slate-700">{c.label}</p>
                  {c.extra && <p className="text-[10px] text-slate-500 mt-0.5">{c.extra}</p>}
                </div>
              </div>
            )
          })}
        </div>

        {body && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Phone Preview</p>
            <div className="bg-slate-100 rounded-2xl p-4 w-full lg:w-72">
              {segs.map((s, i) => (
                <div key={i}>
                  {i > 0 && <p className="text-[10px] text-slate-400 text-center my-2 border-t border-dashed border-slate-300 pt-2">Segment break</p>}
                  <div className="bg-[#E5E5EA] text-slate-900 rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-snug break-words">{s}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tool: Schema Builder ──────────────────────────────────────────────────────

function SchemaBuilder() {
  const [type, setType] = useState('LocalBusiness')
  const [data, setData] = useState({})
  const [copied, setCopied] = useState(false)

  const [fetchUrl,  setFetchUrl]  = useState('')
  const [fetching,  setFetching]  = useState(false)
  const [fetched,   setFetched]   = useState(null)
  const [fetchErr,  setFetchErr]  = useState('')
  const [selBlock,  setSelBlock]  = useState(0)
  const [blockCopied, setBlockCopied] = useState(false)
  const [showOptional, setShowOptional] = useState(false)

  const changeType = (t) => { setType(t); setData({}); setShowOptional(false) }
  const upd = (key, val) => setData(d => ({ ...d, [key]: val }))

  const fetchFromUrl = async () => {
    const url = fetchUrl.trim()
    if (!url) return
    setFetching(true); setFetchErr(''); setFetched(null)
    try {
      const fullUrl = /^https?:\/\//.test(url) ? url : `https://${url}`
      const res = await fetch('/api/fetch-meta', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: fullUrl }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to fetch')
      if (!d.jsonLdBlocks?.length) {
        setFetchErr('No JSON-LD structured data found on this page.')
      } else {
        setFetched(d.jsonLdBlocks)
        setSelBlock(0)
      }
    } catch (e) {
      setFetchErr(e.message)
    } finally {
      setFetching(false)
    }
  }

  const copyBlock = (block) => {
    const json = JSON.stringify(block, null, 2)
    navigator.clipboard.writeText(`<script type="application/ld+json">\n${json}\n</script>`)
    setBlockCopied(true)
    setTimeout(() => setBlockCopied(false), 2000)
  }

  const TYPES = ['LocalBusiness', 'AutoDealer', 'Vehicle', 'FAQPage', 'BreadcrumbList', 'Organization']
  const faqs = data.faqs || [{ q: '', a: '' }, { q: '', a: '' }]
  const crumbs = data.crumbs || [{ name: '', url: '' }, { name: '', url: '' }]

  const inputCls = 'w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors'
  const labelCls = 'block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide'

  const renderField = (k, label, placeholder, textarea = false) => (
    <div>
      <label className={labelCls}>{label}</label>
      {textarea
        ? <textarea value={data[k] || ''} onChange={e => upd(k, e.target.value)} placeholder={placeholder} rows={3} className={`${inputCls} resize-none`} />
        : <input value={data[k] || ''} onChange={e => upd(k, e.target.value)} placeholder={placeholder} className={inputCls} />}
    </div>
  )

  const buildSchema = () => {
    const base = { '@context': 'https://schema.org', '@type': type }
    if (type === 'LocalBusiness' || type === 'AutoDealer') {
      if (!data.name || !data.address) return null
      base.name = data.name
      if (data.url) base.url = data.url
      if (data.phone) base.telephone = data.phone
      base.address = {
        '@type': 'PostalAddress',
        streetAddress: data.address,
        addressLocality: data.city || '',
        addressRegion: data.state || '',
        postalCode: data.zip || '',
        addressCountry: data.country || 'US',
      }
      if (data.lat && data.lng) base.geo = { '@type': 'GeoCoordinates', latitude: data.lat, longitude: data.lng }
      if (data.hours) base.openingHours = data.hours.split('\n').filter(Boolean)
      if (type === 'AutoDealer') {
        if (data.brand) base.brand = data.brand
        if (data.description) base.description = data.description
        if (data.logo) base.logo = data.logo
        if (data.image) base.image = data.image
        if (data.priceRange) base.priceRange = data.priceRange
      }
    } else if (type === 'Vehicle') {
      if (!data.name) return null
      base.name = data.name
      if (data.brand) base.brand = { '@type': 'Brand', name: data.brand }
      if (data.model) base.model = data.model
      if (data.year) base.vehicleModelDate = data.year
      if (data.color) base.color = data.color
      if (data.condition) base.itemCondition = `https://schema.org/${data.condition}Condition`
      if (data.mileage) base.mileageFromOdometer = { '@type': 'QuantitativeValue', value: data.mileage, unitCode: 'SMI' }
      if (data.price) base.offers = { '@type': 'Offer', price: data.price, priceCurrency: data.currency || 'USD' }
      if (data.vin) base.vehicleIdentificationNumber = data.vin
      if (data.url) base.url = data.url
      if (data.image) base.image = data.image
      if (data.description) base.description = data.description
    } else if (type === 'FAQPage') {
      const validFaqs = faqs.filter(f => f.q && f.a)
      if (!validFaqs.length) return null
      base.mainEntity = validFaqs.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      }))
    } else if (type === 'BreadcrumbList') {
      const valid = crumbs.filter(c => c.name)
      if (!valid.length) return null
      base.itemListElement = valid.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        ...(c.url ? { item: c.url } : {}),
      }))
    } else if (type === 'Organization') {
      if (!data.name) return null
      base.name = data.name
      if (data.url) base.url = data.url
      if (data.logo) base.logo = data.logo
      if (data.description) base.description = data.description
      if (data.social) base.sameAs = data.social.split('\n').filter(Boolean)
    }
    return base
  }

  const schema = buildSchema()
  const json = schema ? JSON.stringify(schema, null, 2) : null

  const copy = () => {
    if (!json) return
    navigator.clipboard.writeText(`<script type="application/ld+json">\n${json}\n</script>`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5">

      {/* ── Fetch from URL ─────────────────────────────────────────────── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
          <FileSearch size={12} />Inspect Live Page
        </p>
        <p className="text-xs text-slate-400">Enter any URL to pull the JSON-LD structured data currently on that page.</p>
        <div className="flex gap-2">
          <input
            value={fetchUrl}
            onChange={e => { setFetchUrl(e.target.value); setFetchErr(''); setFetched(null) }}
            onKeyDown={e => e.key === 'Enter' && fetchUrl.trim() && !fetching && fetchFromUrl()}
            placeholder="https://asburyauto.com/dealers/crown-honda"
            className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors bg-white"
          />
          <button
            onClick={fetchFromUrl}
            disabled={!fetchUrl.trim() || fetching}
            className="px-4 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            {fetching ? 'Fetching…' : 'Fetch JSON-LD'}
          </button>
        </div>

        {fetchErr && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5 text-xs text-rose-700">{fetchErr}</div>
        )}

        {fetching && (
          <div className="flex items-center gap-2 py-1">
            <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin flex-shrink-0" />
            <p className="text-xs text-slate-400">Fetching structured data…</p>
          </div>
        )}

        {fetched && (
          <div className="space-y-3">
            {fetched.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {fetched.map((block, i) => {
                  const t = Array.isArray(block['@type']) ? block['@type'].join('+') : block['@type'] || `Block ${i + 1}`
                  return (
                    <button key={i} onClick={() => setSelBlock(i)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                        selBlock === i ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}>{t}</button>
                  )
                })}
              </div>
            )}

            {fetched[selBlock] && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-slate-500">
                    {fetched.length === 1 ? 'JSON-LD found on page' : `Block ${selBlock + 1} of ${fetched.length}`}
                  </p>
                  <button
                    onClick={() => copyBlock(fetched[selBlock])}
                    className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all ${blockCopied ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
                  >
                    {blockCopied ? 'Copied!' : 'Copy <script> tag'}
                  </button>
                </div>
                <pre className="bg-slate-950 text-green-400 text-xs font-mono p-4 rounded-xl overflow-x-auto leading-relaxed max-h-80">
                  <code>{JSON.stringify(fetched[selBlock], null, 2)}</code>
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Schema type selector ────────────────────────────────────────── */}
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Build Schema</p>
      <div className="flex flex-wrap gap-2">
        {TYPES.map(t => (
          <button key={t} onClick={() => changeType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              type === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}>{t}</button>
        ))}
      </div>

      {(type === 'LocalBusiness' || type === 'AutoDealer') && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderField('name',    'Business Name *', 'Crown Honda')}
            {renderField('address', 'Street Address *','123 Main St')}
          </div>
          {!showOptional ? (
            <button onClick={() => setShowOptional(true)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">
              + Phone, city, state, hours, coordinates…
            </button>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {renderField('url',     'URL',          'https://...')}
                {renderField('phone',   'Phone',        '(555) 123-4567')}
                {renderField('city',    'City',         'Atlanta')}
                {renderField('state',   'State',        'GA')}
                {renderField('zip',     'ZIP',          '30303')}
                {renderField('country', 'Country',      'US')}
                {renderField('lat',     'Latitude',     '33.7490')}
                {renderField('lng',     'Longitude',    '-84.3880')}
                <div className="sm:col-span-2">
                  {renderField('hours', 'Opening Hours (one per line)', 'Mo-Fr 09:00-18:00\nSa 10:00-16:00', true)}
                </div>
                {type === 'AutoDealer' && (
                  <>
                    <div>
                      <label className={labelCls}>Brand</label>
                      <select value={data.brand || ''} onChange={e => upd('brand', e.target.value)} className={`${inputCls} bg-white`}>
                        <option value="">— select —</option>
                        {['BMW', 'Honda', 'Toyota', 'Lexus', 'Acura', 'Mercedes-Benz', 'Volkswagen', 'Hyundai', 'Other'].map(b => <option key={b}>{b}</option>)}
                      </select>
                    </div>
                    {renderField('priceRange', 'Price Range', '$$')}
                    {renderField('logo',  'Logo URL',  'https://...')}
                    {renderField('image', 'Image URL', 'https://...')}
                    <div className="sm:col-span-2">
                      {renderField('description', 'Description', '...', true)}
                    </div>
                  </>
                )}
              </div>
              <button onClick={() => setShowOptional(false)}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors">↑ Fewer fields</button>
            </div>
          )}
        </div>
      )}

      {type === 'Vehicle' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {renderField('name',  'Name *',     '2024 BMW 3 Series')}
          {renderField('brand', 'Brand',      'BMW')}
          {renderField('model', 'Model',      '3 Series')}
          {renderField('year',  'Vehicle Year','2024')}
          {renderField('color', 'Color',      'Black')}
          <div>
            <label className={labelCls}>Condition</label>
            <select value={data.condition || ''} onChange={e => upd('condition', e.target.value)} className={`${inputCls} bg-white`}>
              <option value="">— select —</option>
              {['New', 'Used', 'Refurbished'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          {renderField('mileage',  'Mileage',  '15000')}
          {renderField('price',    'Price',    '42999')}
          {renderField('currency', 'Currency', 'USD')}
          {renderField('vin',      'VIN',      '...')}
          {renderField('url',      'URL',      'https://...')}
          {renderField('image',    'Image URL','https://...')}
          <div className="sm:col-span-2">
            {renderField('description', 'Description', '...', true)}
          </div>
        </div>
      )}

      {type === 'FAQPage' && (
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500">Q&amp;A #{i + 1}</p>
                <button onClick={() => upd('faqs', faqs.filter((_, j) => j !== i))} disabled={faqs.length <= 1}
                  className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 disabled:opacity-40 transition-colors">Remove</button>
              </div>
              <input value={f.q} onChange={e => upd('faqs', faqs.map((x, j) => j === i ? { ...x, q: e.target.value } : x))} placeholder="Question..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
              <textarea value={f.a} onChange={e => upd('faqs', faqs.map((x, j) => j === i ? { ...x, a: e.target.value } : x))} placeholder="Answer..." rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none" />
            </div>
          ))}
          <button onClick={() => upd('faqs', [...faqs, { q: '', a: '' }])}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors">+ Add Question</button>
        </div>
      )}

      {type === 'BreadcrumbList' && (
        <div className="space-y-3">
          {crumbs.map((c, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
              <div>
                <label className={labelCls}>Item #{i + 1} Name</label>
                <input value={c.name} onChange={e => upd('crumbs', crumbs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Home"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
              </div>
              <div>
                <label className={labelCls}>URL</label>
                <input value={c.url} onChange={e => upd('crumbs', crumbs.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
              </div>
              <button onClick={() => upd('crumbs', crumbs.filter((_, j) => j !== i))} disabled={crumbs.length <= 1}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 disabled:opacity-40 transition-colors">×</button>
            </div>
          ))}
          <button onClick={() => upd('crumbs', [...crumbs, { name: '', url: '' }])}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors">+ Add Item</button>
        </div>
      )}

      {type === 'Organization' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {renderField('name', 'Name *',   'Your Business Name')}
          {renderField('url',  'URL',      'https://...')}
          {renderField('logo', 'Logo URL', 'https://...')}
          <div className="sm:col-span-2">
            {renderField('description', 'Description', '...', true)}
          </div>
          <div className="sm:col-span-2">
            {renderField('social', 'Social Profiles (one URL per line)', 'https://twitter.com/...&#10;https://facebook.com/...', true)}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">JSON-LD Output</p>
          {json && (
            <button onClick={copy}
              className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}>
              {copied ? 'Copied!' : 'Copy <script> tag'}
            </button>
          )}
        </div>
        {json ? (
          <pre className="bg-slate-950 text-green-400 text-xs font-mono p-4 rounded-xl overflow-x-auto leading-relaxed"><code>{json}</code></pre>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
            Fill in required fields to generate valid schema.
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tool: Schema (Validate + Build combined) ─────────────────────────────────

function SchemaTool() {
  const [mode, setMode] = useState('validate')
  return (
    <div>
      <div className="flex gap-0.5 p-1 bg-slate-100 rounded-xl w-fit mb-5 border border-slate-100">
        {[['validate', 'Validate'], ['build', 'Build']].map(([v, label]) => (
          <button
            key={v}
            onClick={() => setMode(v)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >{label}</button>
        ))}
      </div>
      {mode === 'validate' ? <SchemaValidator /> : <SchemaBuilder />}
    </div>
  )
}

// ── Tool: Readability Scorer ──────────────────────────────────────────────────

function countSyllables(word) {
  const w0 = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w0) return 0
  let w = w0
  if (w.length > 2 && w.endsWith('e') && !/[aeiouy]e$/.test(w) && !/le$/.test(w)) {
    w = w.slice(0, -1)
  }
  const groups = w.match(/[aeiouy]+/g) || []
  return Math.max(1, groups.length)
}

function ReadabilityScorer() {
  const [text, setText] = useState('')

  const rawSentences = text.match(/[^.!?]+[.!?]+/g) || []
  const sentenceList = rawSentences.length ? rawSentences : (text.trim() ? [text.trim()] : [])
  const sentenceCount = sentenceList.length
  const words = text.trim().split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const syllableCount = words.reduce((sum, w) => sum + countSyllables(w), 0)

  const flesch = wordCount > 0 && sentenceCount > 0
    ? Math.max(0, Math.min(100, 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllableCount / wordCount)))
    : null
  const grade = wordCount > 0 && sentenceCount > 0
    ? 0.39 * (wordCount / sentenceCount) + 11.8 * (syllableCount / wordCount) - 15.59
    : null

  const avgWordsPerSent = sentenceCount ? wordCount / sentenceCount : 0
  const avgSyllablesPerWord = wordCount ? syllableCount / wordCount : 0

  const interp = flesch == null ? '' :
    flesch >= 90 ? 'Very Easy (grade 5)' :
    flesch >= 80 ? 'Easy (grade 6)' :
    flesch >= 70 ? 'Fairly Easy (grade 7)' :
    flesch >= 60 ? 'Standard (grade 8–9) — target' :
    flesch >= 50 ? 'Fairly Difficult (grade 10–12)' :
    flesch >= 30 ? 'Difficult (college)' :
                   'Very Difficult (professional)'

  const fleschColor = flesch == null ? 'text-slate-400' :
    (flesch >= 60 && flesch < 80) ? 'text-emerald-600' :
    flesch < 50 ? 'text-rose-600' :
    'text-amber-600'

  const longSents = sentenceList
    .map(s => ({ text: s.trim(), wc: s.trim().split(/\s+/).filter(Boolean).length }))
    .filter(s => s.wc > 25)
    .sort((a, b) => b.wc - a.wc)
    .slice(0, 5)

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Text to Analyze</label>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={8}
          placeholder="Paste any copy — email body, landing page, ad copy, social caption..."
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none" />
      </div>

      {flesch != null && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center col-span-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Reading Ease</p>
              <p className={`text-4xl font-bold mt-1 ${fleschColor}`}>{flesch.toFixed(0)}</p>
              <p className="text-[10px] text-slate-500 mt-1">{interp}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Grade</p>
              <p className="text-xl font-bold text-slate-900 mt-2">{grade.toFixed(1)}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Words</p>
              <p className="text-xl font-bold text-slate-900 mt-2">{wordCount}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sentences</p>
              <p className="text-xl font-bold text-slate-900 mt-2">{sentenceCount}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Avg w/s</p>
              <p className={`text-xl font-bold mt-2 ${avgWordsPerSent > 20 ? 'text-amber-600' : 'text-slate-900'}`}>{avgWordsPerSent.toFixed(1)}</p>
            </div>
          </div>

          <div>
            <div className="relative h-3 rounded-full overflow-hidden"
              style={{ background: 'linear-gradient(to right, #fda4af 0%, #fda4af 30%, #fcd34d 30%, #fcd34d 50%, #6ee7b7 60%, #6ee7b7 80%, #fcd34d 80%, #fcd34d 100%)' }}>
              <div className="absolute top-0 bottom-0 w-1 bg-slate-900 rounded-full" style={{ left: `calc(${flesch}% - 2px)` }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>0 Difficult</span>
              <span className="font-bold text-emerald-600">60–79 Target</span>
              <span>100 Easy</span>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm text-indigo-800">
            Aim for <span className="font-bold">60–69 (Grade 8–9)</span> for mass-market automotive copy. Current: <span className="font-bold">{flesch.toFixed(0)}</span>
          </div>

          <p className="text-xs text-slate-400">Avg syllables per word: <span className="text-slate-600 font-mono">{avgSyllablesPerWord.toFixed(2)}</span></p>

          {longSents.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Long Sentences (over 25 words)</p>
              <div className="space-y-2">
                {longSents.map((s, i) => (
                  <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                    <p className="text-[10px] font-bold text-amber-700 mb-1">{s.wc} words</p>
                    <p className="text-xs text-slate-700">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Tool: Color Contrast ──────────────────────────────────────────────────────

function hexToRgb(hex) {
  const h = (hex || '').replace('#', '').trim()
  if (h.length !== 6 && h.length !== 3) return null
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  if (!/^[0-9a-f]{6}$/i.test(full)) return null
  const num = parseInt(full, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

function luminance({ r, g, b }) {
  const a = [r, g, b].map(v => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]
}

function contrastRatio(fg, bg) {
  const L1 = luminance(fg), L2 = luminance(bg)
  const lighter = Math.max(L1, L2), darker = Math.min(L1, L2)
  return (lighter + 0.05) / (darker + 0.05)
}

function ColorContrast() {
  const [fg, setFg] = useState('#1e293b')
  const [bg, setBg] = useState('#ffffff')

  const fgRgb = hexToRgb(fg)
  const bgRgb = hexToRgb(bg)
  const ratio = fgRgb && bgRgb ? contrastRatio(fgRgb, bgRgb) : null

  const swap = () => { const a = fg; setFg(bg); setBg(a) }

  const setHex = (set, val) => {
    let v = val.trim()
    if (!v.startsWith('#')) v = `#${v}`
    set(v)
  }

  const Badge = ({ pass, label }) => (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${pass ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
      {pass ? <CheckCircle size={14} className="text-emerald-600" /> : <AlertCircle size={14} className="text-rose-600" />}
      <p className={`text-xs font-semibold ${pass ? 'text-emerald-700' : 'text-rose-700'}`}>{label}</p>
      <span className={`ml-auto text-[10px] font-bold ${pass ? 'text-emerald-600' : 'text-rose-600'}`}>{pass ? 'PASS' : 'FAIL'}</span>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Foreground</label>
          <div className="flex gap-2">
            <input type="color" value={fg} onChange={e => setFg(e.target.value)} className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer" />
            <input value={fg} onChange={e => setHex(setFg, e.target.value)}
              className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors font-mono" />
          </div>
        </div>
        <button onClick={swap} className="px-3 py-2.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">Swap</button>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Background</label>
          <div className="flex gap-2">
            <input type="color" value={bg} onChange={e => setBg(e.target.value)} className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer" />
            <input value={bg} onChange={e => setHex(setBg, e.target.value)}
              className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors font-mono" />
          </div>
        </div>
      </div>

      {ratio != null && (
        <>
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contrast Ratio</p>
            <p className="text-5xl font-bold text-slate-900 mt-2 tracking-tight">{ratio.toFixed(2)}:1</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Badge pass={ratio >= 4.5} label="WCAG AA Normal (≥4.5:1)" />
            <Badge pass={ratio >= 3}   label="WCAG AA Large (≥3:1)" />
            <Badge pass={ratio >= 7}   label="WCAG AAA Normal (≥7:1)" />
            <Badge pass={ratio >= 4.5} label="WCAG AAA Large (≥4.5:1)" />
          </div>

          <div className="rounded-xl p-6 border border-slate-200" style={{ backgroundColor: bg, color: fg }}>
            <p className="text-base">Aa Sample Text 123</p>
            <p className="text-2xl font-bold mt-2">Aa Sample Text 123</p>
          </div>
        </>
      )}
    </div>
  )
}

// ── Tool: QR Code Generator ───────────────────────────────────────────────────

function QrGenerator() {
  const [type,        setType]        = useState('url')
  const [value,       setValue]       = useState('')
  const [label,       setLabel]       = useState('')
  const [size,        setSize]        = useState(256)
  const [ecc,         setEcc]         = useState('M')
  const [fgColor,     setFgColor]     = useState('#000000')
  const [bgColor,     setBgColor]     = useState('#ffffff')
  const [hasRendered, setHasRendered] = useState(false)
  const [error,       setError]       = useState('')
  const [tracking,    setTracking]    = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [savedCode,   setSavedCode]   = useState(null)
  const [myCodes,     setMyCodes]     = useState([])
  const [loadingCodes,setLoadingCodes]= useState(false)
  const canvasRef = useRef(null)

  const inputCls = 'w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors'
  const labelCls = 'block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide'

  useEffect(() => { loadMyCodes() }, [])

  const loadMyCodes = async () => {
    setLoadingCodes(true)
    try {
      const [{ data: codes }, { data: scans }] = await Promise.all([
        supabase.from('qr_codes').select('*').order('created_at', { ascending: false }),
        supabase.from('qr_scans').select('qr_code_id'),
      ])
      const counts = (scans || []).reduce((acc, s) => {
        acc[s.qr_code_id] = (acc[s.qr_code_id] || 0) + 1
        return acc
      }, {})
      setMyCodes((codes || []).map(c => ({ ...c, scan_count: counts[c.id] || 0 })))
    } catch { /* silent */ } finally {
      setLoadingCodes(false)
    }
  }

  const buildContent = () => {
    if (!value.trim()) return ''
    if (type === 'url') return /^https?:\/\//.test(value) ? value : `https://${value}`
    if (type === 'phone') return `tel:${value.replace(/[^0-9+]/g, '')}`
    return value
  }

  const drawQR = async (content) => {
    if (!canvasRef.current) return
    await QRCode.toCanvas(canvasRef.current, content, {
      width: size, errorCorrectionLevel: ecc,
      color: { dark: fgColor, light: bgColor }, margin: 2,
    })
    setHasRendered(true)
  }

  const generate = async () => {
    const content = buildContent()
    if (!content || !canvasRef.current) return
    setError(''); setSavedCode(null)

    // Tracked mode (URL only): save to Supabase first, encode redirect URL
    if (tracking && type === 'url') {
      setSaving(true)
      try {
        const { data, error: err } = await supabase
          .from('qr_codes')
          .insert({ target_url: content, label: label.trim() || content })
          .select().single()
        if (err) throw err
        const appOrigin = import.meta.env.VITE_APP_URL || window.location.origin
        const trackingUrl = `${appOrigin}/api/r/${data.id}`
        await drawQR(trackingUrl)
        setSavedCode({ ...data, scan_count: 0 })
        logToolEvent('qr')
        loadMyCodes()
      } catch (e) {
        setError('Failed to save tracked QR: ' + (e.message || ''))
      } finally { setSaving(false) }
      return
    }

    // Basic mode
    try {
      await drawQR(content)
      logToolEvent('qr')
    } catch (e) { setError(e.message || 'Failed to generate QR code') }
  }

  const download = () => {
    if (!canvasRef.current || !hasRendered) return
    canvasRef.current.toBlob(blob => {
      if (!blob) return
      const u = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = u; a.download = `asbury-qr-${Date.now()}.png`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(u)
    })
  }

  const reloadCode = async (code) => {
    if (!canvasRef.current) return
    const url = `${import.meta.env.VITE_APP_URL || window.location.origin}/api/r/${code.id}`
    try { await drawQR(url); setSavedCode(code); setValue(code.target_url); setLabel(code.label) }
    catch (e) { setError(e.message) }
  }

  return (
    <div className="space-y-4">

      {/* Tracking toggle (URL only) */}
      {type === 'url' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100">
          <button
            onClick={() => setTracking(t => !t)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${tracking ? 'bg-indigo-600' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${tracking ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
          <div>
            <p className="text-xs font-semibold text-indigo-800">{tracking ? 'Tracked QR — scan count logged' : 'Basic QR — no analytics'}</p>
            <p className="text-[10px] text-indigo-500 mt-0.5">{tracking ? 'Encodes a redirect URL; each scan is recorded in Analytics.' : 'Encodes the URL directly; no server call on scan.'}</p>
          </div>
        </div>
      )}

      {/* Type tabs */}
      <div className="flex flex-wrap gap-2">
        {[['url', 'URL'], ['phone', 'Phone'], ['text', 'Text']].map(([t, l]) => (
          <button key={t} onClick={() => { setType(t); setHasRendered(false); setSavedCode(null) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              type === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}>{l}</button>
        ))}
      </div>

      {/* URL / text input */}
      <div>
        <label className={labelCls}>{type === 'url' ? 'URL' : type === 'phone' ? 'Phone Number' : 'Text'}</label>
        {type === 'text'
          ? <textarea value={value} onChange={e => setValue(e.target.value)} rows={3} placeholder="Any plain text..." className={`${inputCls} resize-none`} />
          : <input value={value} onChange={e => setValue(e.target.value)} placeholder={type === 'url' ? 'asburyauto.com' : '(555) 123-4567'} className={inputCls} />
        }
      </div>

      {/* Label (tracked mode only) */}
      {tracking && type === 'url' && (
        <div>
          <label className={labelCls}>Label <span className="normal-case font-normal text-slate-300">(optional)</span></label>
          <input value={label} onChange={e => setLabel(e.target.value)}
            placeholder="e.g. Crown Honda — June Service Promo" className={inputCls} />
        </div>
      )}

      {/* Style options */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className={labelCls}>Size</label>
          <select value={size} onChange={e => setSize(Number(e.target.value))} className={`${inputCls} bg-white`}>
            <option value={128}>Small (128px)</option>
            <option value={256}>Medium (256px)</option>
            <option value={512}>Large (512px)</option>
          </select>
        </div>
        <div>
          <label className={labelCls} title="Higher = damage-resistant but denser">Error Correction</label>
          <select value={ecc} onChange={e => setEcc(e.target.value)} className={`${inputCls} bg-white`}>
            {['L','M','Q','H'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Foreground</label>
          <input value={fgColor} onChange={e => setFgColor(e.target.value)} className={`${inputCls} font-mono`} />
        </div>
        <div>
          <label className={labelCls}>Background</label>
          <input value={bgColor} onChange={e => setBgColor(e.target.value)} className={`${inputCls} font-mono`} />
        </div>
      </div>

      <p className="text-[10px] text-slate-400">Q/H error correction lets scanners read the code even if part of it is covered or damaged.</p>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={generate} disabled={!value.trim() || saving}
          className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors">
          {saving ? 'Saving…' : 'Generate'}
        </button>
        <button onClick={download} disabled={!hasRendered}
          className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 transition-colors">
          Download PNG
        </button>
      </div>

      {error && <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">{error}</div>}

      {/* Saved confirmation */}
      {savedCode && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle size={14} className="text-emerald-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-emerald-800">Tracked QR saved</p>
            <p className="text-[10px] text-emerald-600 truncate">{savedCode.label || savedCode.target_url}</p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex-shrink-0">
            {(myCodes.find(c => c.id === savedCode.id)?.scan_count ?? 0)} scans
          </span>
        </div>
      )}

      {/* Canvas preview */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex justify-center items-center min-h-[200px]">
        <canvas ref={canvasRef} className={hasRendered ? '' : 'hidden'} />
        {!hasRendered && <p className="text-sm text-slate-400 italic">Click Generate to render the QR code</p>}
      </div>

      {/* QR code history */}
      {myCodes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tracked QR History</p>
            <button onClick={loadMyCodes} disabled={loadingCodes}
              className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors disabled:opacity-40">
              <RefreshCw size={11} className={loadingCodes ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {myCodes.map(code => (
              <button
                key={code.id}
                onClick={() => reloadCode(code)}
                className="w-full flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{code.label || code.target_url}</p>
                  <p className="text-[10px] text-slate-400 truncate">{code.target_url}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    code.scan_count > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {code.scan_count} scan{code.scan_count !== 1 ? 's' : ''}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(code.created_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Interactive tools config ──────────────────────────────────────────────────

const TOOLS = [
  { id: 'serp',        label: 'SERP Preview',    icon: Search,      desc: 'Preview how your page renders in Google results',                    component: SerpPreview        },
  { id: 'utm',         label: 'UTM Builder',     icon: Link2,       desc: 'Build tracking links for every social post',                         component: UtmBuilder         },
  { id: 'schema',      label: 'Schema',          icon: Code2,       desc: 'Validate or generate JSON-LD structured data',                       component: SchemaTool         },
  { id: 'meta',        label: 'Meta Inspector',  icon: FileSearch,  desc: 'Inspect meta tags, OG data, and structured data on any URL',         component: MetaInspector      },
  { id: 'pagespeed',   label: 'PageSpeed',       icon: Gauge,       desc: 'Check Core Web Vitals and performance scores for any URL',           component: PageSpeedScore     },
  { id: 'caption',     label: 'Caption Counter', icon: Tag,         desc: 'Check character and hashtag limits per platform',                    component: CaptionCounter     },
  { id: 'hashtags',    label: 'Hashtag Sets',    icon: Hash,        desc: 'Pre-built hashtag collections for your content library',            component: HashtagPlanner     },
  { id: 'sms',         label: 'SMS Counter',     icon: Smartphone,  desc: 'Count segments, flag compliance gaps, and preview the message',     component: SmsCounter         },
  { id: 'email',       label: 'Email Subject',   icon: Tag,         desc: 'Preview inbox rendering and check for spam triggers',                component: EmailSubjectTester },
  { id: 'gads',        label: 'Ads Copy',        icon: FileSearch,  desc: 'Build and preview Google Search and Meta ads',                      component: AdsBuilder         },
  { id: 'og',          label: 'OG Card Preview', icon: Share2,      desc: 'See how links render when shared on social platforms',               component: OgPreview          },
  { id: 'image',       label: 'Image Sizes',     icon: Image,       desc: 'Optimal dimensions for every platform and format',                   component: ImageGuide         },
  { id: 'contrast',    label: 'Color Contrast',  icon: CheckCircle, desc: 'Check WCAG AA/AAA contrast ratios for text on background',           component: ColorContrast      },
  { id: 'qr',          label: 'QR Code',         icon: QrCode,      desc: 'Generate tracked QR codes — scan counts appear in Analytics',       component: QrGenerator        },
  { id: 'readability', label: 'Readability',     icon: Gauge,       desc: 'Score any copy for reading level, clarity, and complexity',         component: ReadabilityScorer  },
  { id: 'times',       label: 'Posting Times',   icon: Clock,       desc: 'Industry benchmark publishing windows by platform',                  component: BestTimes          },
]

const TOOL_CATEGORIES = [
  { id: 'seo',      label: 'SEO & Schema',    ids: ['serp', 'utm', 'schema', 'meta', 'pagespeed'] },
  { id: 'social',   label: 'Social Writing',  ids: ['caption', 'hashtags', 'sms', 'email', 'gads'] },
  { id: 'media',    label: 'Visual & Media',  ids: ['og', 'image', 'contrast', 'qr', 'readability'] },
  { id: 'planning', label: 'Planning',        ids: ['times'] },
]

// ── Resource Directory config ─────────────────────────────────────────────────

const RESOURCE_SECTIONS = [
  {
    label: 'Technical SEO',
    icon: Globe,
    tools: [
      { name: 'Google Search Console', url: 'https://search.google.com/search-console', desc: 'Coverage errors and query performance. Check this before anything else.' },
      { name: 'PageSpeed Insights',    url: 'https://pagespeed.web.dev',                desc: 'Core Web Vitals per page. INP failures alone have killed conversion rates.' },
      { name: 'Schema.org Validator',  url: 'https://validator.schema.org',             desc: 'Cross-reference with Google Rich Results Test. Both must pass.' },
      { name: 'Screaming Frog',        url: 'https://www.screamingfrog.co.uk/seo-spider/', desc: 'Custom extraction rules surface redirect chains and orphaned pages.' },
    ],
  },
  {
    label: 'AI Search & AEO',
    icon: Zap,
    tools: [
      { name: 'Perplexity',          url: 'https://www.perplexity.ai',  desc: 'Run target queries here first. Shows sources inline — you see exactly who is cited.' },
      { name: 'ChatGPT',             url: 'https://chatgpt.com',        desc: 'Test brand mention queries weekly. Competitor cited and you are not? That is an AEO gap.' },
      { name: 'Google AI Overviews', url: 'https://www.google.com',     desc: 'Check highest-volume branded and category queries. Fastest-growing citation source.' },
      { name: 'Claude',              url: 'https://claude.ai',          desc: 'Best model for reasoning through strategy. Most likely to cite you if AEO signals are clean.' },
    ],
  },
  {
    label: 'Social Media',
    icon: Share2,
    tools: [
      { name: 'Meta Business Suite',       url: 'https://business.facebook.com',            desc: 'Manage Facebook and Instagram posts, ads, and insights from one dashboard.' },
      { name: 'TikTok Business Center',    url: 'https://business.tiktok.com',              desc: 'Post scheduling, analytics, and ad management for TikTok content.' },
      { name: 'LinkedIn Campaign Manager', url: 'https://www.linkedin.com/campaignmanager', desc: 'LinkedIn analytics, ad creation, and audience targeting.' },
      { name: 'Canva',                     url: 'https://www.canva.com',                    desc: 'Quick design for social graphics. Use your brand kit for consistent visuals.' },
    ],
  },
  {
    label: 'Analytics',
    icon: BarChart2,
    tools: [
      { name: 'Google Analytics 4',      url: 'https://analytics.google.com',    desc: 'Event-based analytics. Set up UTM discipline before relying on source/medium data.' },
      { name: 'Google Tag Manager',      url: 'https://tagmanager.google.com',   desc: 'All tracking pixels and conversion events — managed without code deploys.' },
      { name: 'Looker Studio',           url: 'https://lookerstudio.google.com', desc: 'Custom dashboards pulling GA4, GSC, and ad platforms into one view.' },
      { name: 'Google Business Profile', url: 'https://business.google.com',     desc: 'Manage dealership listings. Keep NAP consistent across all 175+ locations.' },
    ],
  },
  {
    label: 'Local SEO',
    icon: Map,
    tools: [
      { name: 'BrightLocal', url: 'https://www.brightlocal.com',      desc: 'Local rank tracking, citation audit, and GBP monitoring per location.' },
      { name: 'Whitespark',  url: 'https://whitespark.ca',            desc: 'Citation building and local SEO audit. Strong for multi-location enterprises.' },
      { name: 'Moz Local',   url: 'https://moz.com/products/local',  desc: 'Listing distribution and NAP consistency monitoring at scale.' },
    ],
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState('serp')
  const ActiveComponent = TOOLS.find(t => t.id === activeTool)?.component || null
  const activeMeta      = TOOLS.find(t => t.id === activeTool)

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tools</h1>
        <p className="text-sm text-slate-400 mt-0.5">Interactive utilities and resource directory for the social team</p>
      </div>

      {/* ── Interactive Tools ──────────────────────────────────────────── */}
      <section>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-4">
          <Wrench size={11} />Interactive Tools
        </p>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row" style={{ minHeight: '520px' }}>

          {/* Left sidebar — desktop */}
          <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-slate-100 bg-slate-50/60">
            {TOOL_CATEGORIES.map((cat, ci) => {
              const catTools = cat.ids.map(id => TOOLS.find(t => t.id === id)).filter(Boolean)
              return (
                <div key={cat.id} className={ci > 0 ? 'border-t border-slate-100' : ''}>
                  <p className="px-4 pt-3.5 pb-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">{cat.label}</p>
                  {catTools.map(tool => {
                    const Icon     = tool.icon
                    const isActive = activeTool === tool.id
                    return (
                      <button
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id)}
                        className={`w-full flex items-center gap-2.5 px-4 py-2 text-[12px] font-medium transition-all text-left ${
                          isActive
                            ? 'bg-white text-slate-900 border-r-2 border-indigo-500'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-white/80'
                        }`}
                      >
                        <Icon size={11} className={isActive ? 'text-indigo-500' : 'text-slate-300'} />
                        {tool.label}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </aside>

          {/* Mobile: horizontal scroll chip bar */}
          <div className="md:hidden flex gap-2 overflow-x-auto px-4 py-3 border-b border-slate-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TOOLS.map(tool => {
              const isActive = activeTool === tool.id
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    isActive ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {tool.label}
                </button>
              )
            })}
          </div>

          {/* Right: tool header + content */}
          <div className="flex flex-col flex-1 min-w-0">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              {activeMeta?.icon && (() => {
                const Icon = activeMeta.icon
                return (
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <Icon size={15} className="text-indigo-600" />
                  </div>
                )
              })()}
              <div>
                <h2 className="font-semibold text-slate-900 text-sm">{activeMeta?.label}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{activeMeta?.desc}</p>
              </div>
            </div>
            <div className="p-5 flex-1">
              {ActiveComponent && <ActiveComponent />}
            </div>
          </div>

        </div>
      </section>

      {/* ── Resource Directory ─────────────────────────────────────────── */}
      <section>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-4">
          <ExternalLink size={11} />Resource Directory
        </p>

        <div className="space-y-6">
          {RESOURCE_SECTIONS.map(section => {
            const Icon = section.icon
            return (
              <div key={section.label}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Icon size={12} className="text-slate-500" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">{section.label}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {section.tools.map(tool => (
                    <a
                      key={tool.name}
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-semibold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors leading-snug">{tool.name}</p>
                        <ExternalLink size={11} className="text-slate-300 group-hover:text-indigo-400 flex-shrink-0 mt-0.5 transition-colors" />
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed flex-1">{tool.desc}</p>
                      <p className="text-[11px] font-semibold text-indigo-400 mt-3 group-hover:text-indigo-600 transition-colors">Visit →</p>
                    </a>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

    </div>
  )
}
