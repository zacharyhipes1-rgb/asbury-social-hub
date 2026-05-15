import { useState } from 'react'
import {
  Wrench, Search, Link2, Tag, Hash, Image, Clock,
  Globe, Zap, Share2, BarChart2, Map,
  ExternalLink, ChevronRight, Monitor, Smartphone,
  Code2, CheckCircle, AlertCircle, FileSearch, Gauge
} from 'lucide-react'

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
        Pre-built hashtag sets for common Asbury content types. Copy a full set or cherry-pick individual tags.
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

function validateOneSchema(schema) {
  const errors = [], warnings = []
  const ctx = schema['@context']
  if (!ctx) {
    errors.push('Missing @context — should be "https://schema.org"')
  } else if (!['https://schema.org', 'http://schema.org', 'https://schema.org/', 'http://schema.org/'].includes(ctx)) {
    warnings.push(`Unexpected @context: "${ctx}" — use "https://schema.org"`)
  }
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

function SchemaValidator() {
  const [input, setInput]   = useState('')
  const [results, setResults] = useState(null)
  const [parseErr, setParseErr] = useState('')

  const prettify = () => {
    try { setInput(JSON.stringify(JSON.parse(input.trim()), null, 2)); setParseErr('') }
    catch (e) { setParseErr(`Invalid JSON: ${e.message}`) }
  }

  const clear = () => { setInput(''); setResults(null); setParseErr('') }

  const validate = () => {
    setParseErr(''); setResults(null)
    let parsed
    try { parsed = JSON.parse(input.trim()) }
    catch (e) { setParseErr(`Invalid JSON: ${e.message}`); return }
    const schemas = Array.isArray(parsed) ? parsed : [parsed]
    setResults(schemas.map((s, i) => ({ index: i, ...validateOneSchema(s) })))
  }

  const totalErrors   = results?.reduce((n, r) => n + r.errors.length, 0) ?? 0
  const totalWarnings = results?.reduce((n, r) => n + r.warnings.length, 0) ?? 0
  const isValid = results && totalErrors === 0

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">JSON-LD Markup</label>
          <div className="flex gap-2">
            <button onClick={prettify} disabled={!input.trim()} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors">Format</button>
            <button onClick={clear}    disabled={!input}        className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors">Clear</button>
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
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {r.type || 'Unknown type'}
                    {results.length > 1 && <span className="text-slate-400 font-normal ml-2">#{i + 1}</span>}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {r.errors.length === 0 && r.warnings.length === 0 ? '✓ No issues' : `${r.errors.length} error${r.errors.length !== 1 ? 's' : ''} · ${r.warnings.length} warning${r.warnings.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.errors.length === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {r.errors.length === 0 ? 'Pass' : 'Fail'}
                </span>
              </div>
              {(r.errors.length > 0 || r.warnings.length > 0) && (
                <div className="divide-y divide-slate-50">
                  {r.errors.map((msg, j) => (
                    <div key={`e${j}`} className="flex items-start gap-2.5 px-4 py-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0 mt-1.5" />
                      <p className="text-xs text-slate-700">{msg}</p>
                    </div>
                  ))}
                  {r.warnings.map((msg, j) => (
                    <div key={`w${j}`} className="flex items-start gap-2.5 px-4 py-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                      <p className="text-xs text-slate-600">{msg}</p>
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
          className="px-4 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors whitespace-nowrap"
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
          className="px-4 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors whitespace-nowrap"
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

// ── Interactive tools config ──────────────────────────────────────────────────

const TOOLS = [
  { id: 'serp',      label: 'SERP Preview',    icon: Search,      desc: 'Preview how your page renders in Google results',              component: SerpPreview     },
  { id: 'utm',       label: 'UTM Builder',     icon: Link2,       desc: 'Build tracking links for every social post',                   component: UtmBuilder      },
  { id: 'caption',   label: 'Caption Counter', icon: Tag,         desc: 'Check character and hashtag limits per platform',              component: CaptionCounter  },
  { id: 'hashtags',  label: 'Hashtag Sets',    icon: Hash,        desc: 'Pre-built hashtag collections for Asbury content',            component: HashtagPlanner  },
  { id: 'image',     label: 'Image Sizes',     icon: Image,       desc: 'Optimal dimensions for every platform and format',            component: ImageGuide      },
  { id: 'times',     label: 'Posting Times',    icon: Clock,       desc: 'Industry benchmark publishing windows by platform',           component: BestTimes       },
  { id: 'schema',    label: 'Schema Validator',icon: Code2,       desc: 'Validate JSON-LD structured data against schema.org',         component: SchemaValidator },
  { id: 'meta',      label: 'Meta Inspector',  icon: FileSearch,  desc: 'Inspect meta tags, OG data, and structured data on any URL',  component: MetaInspector   },
  { id: 'pagespeed', label: 'PageSpeed',       icon: Gauge,       desc: 'Check Core Web Vitals and performance scores for any URL',    component: PageSpeedScore  },
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
      { name: 'Meta Business Suite',          url: 'https://business.facebook.com',          desc: 'Manage Facebook and Instagram posts, ads, and insights from one dashboard.' },
      { name: 'TikTok Business Center',       url: 'https://business.tiktok.com',            desc: 'Post scheduling, analytics, and ad management for TikTok content.' },
      { name: 'LinkedIn Campaign Manager',    url: 'https://www.linkedin.com/campaignmanager', desc: 'LinkedIn analytics, ad creation, and audience targeting.' },
      { name: 'Canva',                        url: 'https://www.canva.com',                  desc: 'Quick design for social graphics. Use the brand kit for consistent Asbury visuals.' },
    ],
  },
  {
    label: 'Analytics',
    icon: BarChart2,
    tools: [
      { name: 'Google Analytics 4',   url: 'https://analytics.google.com',      desc: 'Event-based analytics. Set up UTM discipline before relying on source/medium data.' },
      { name: 'Google Tag Manager',   url: 'https://tagmanager.google.com',     desc: 'All tracking pixels and conversion events — managed without code deploys.' },
      { name: 'Looker Studio',        url: 'https://lookerstudio.google.com',   desc: 'Custom dashboards pulling GA4, GSC, and ad platforms into one view.' },
      { name: 'Google Business Profile', url: 'https://business.google.com',   desc: 'Manage dealership listings. Keep NAP consistent across all 175+ locations.' },
    ],
  },
  {
    label: 'Local SEO',
    icon: Map,
    tools: [
      { name: 'BrightLocal', url: 'https://www.brightlocal.com', desc: 'Local rank tracking, citation audit, and GBP monitoring per location.' },
      { name: 'Whitespark',  url: 'https://whitespark.ca',       desc: 'Citation building and local SEO audit. Strong for multi-location enterprises.' },
      { name: 'Moz Local',   url: 'https://moz.com/products/local', desc: 'Listing distribution and NAP consistency monitoring at scale.' },
    ],
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState('serp')
  const ActiveComponent = TOOLS.find(t => t.id === activeTool)?.component || null

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tools</h1>
        <p className="text-sm text-slate-400 mt-0.5">Interactive utilities and resource directory for the social team</p>
      </div>

      {/* Interactive Tools */}
      <section>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-4">
          <Wrench size={11} />Interactive Tools
        </p>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-2 mb-5">
          {TOOLS.map(t => {
            const Icon     = t.icon
            const isActive = activeTool === t.id
            return (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all border ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-800'
                }`}
              >
                <Icon size={14} />{t.label}
              </button>
            )
          })}
        </div>

        {/* Active panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {(() => {
            const tool = TOOLS.find(t => t.id === activeTool)
            const Icon = tool?.icon
            return (
              <>
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                  {Icon && (
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <Icon size={15} className="text-indigo-600" />
                    </div>
                  )}
                  <div>
                    <h2 className="font-semibold text-slate-900 text-sm">{tool?.label}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{tool?.desc}</p>
                  </div>
                </div>
                <div className="p-5">
                  {ActiveComponent && <ActiveComponent />}
                </div>
              </>
            )
          })()}
        </div>
      </section>

      {/* Resource Directory */}
      <section>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-4">
          <ExternalLink size={11} />Resource Directory
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {RESOURCE_SECTIONS.map(section => {
            const Icon = section.icon
            return (
              <div key={section.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Icon size={13} className="text-slate-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm">{section.label}</h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {section.tools.map(tool => (
                    <a
                      key={tool.name}
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                          {tool.name}
                          <ExternalLink size={10} className="text-slate-300 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{tool.desc}</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-200 group-hover:text-slate-400 transition-colors flex-shrink-0 mt-0.5" />
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
