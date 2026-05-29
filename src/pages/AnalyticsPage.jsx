import { useMemo, useState, useEffect, useRef, Fragment, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  format, parseISO, subWeeks, startOfWeek, endOfWeek,
  isWithinInterval, differenceInHours, subMonths, formatDistanceToNow,
  subDays, startOfDay
} from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import {
  TrendingUp, Clock, AlertTriangle, Zap, Info, BarChart2,
  ChevronDown, ChevronUp, AlertCircle, Calendar, ArrowUpDown, X,
  QrCode, Wrench, RefreshCw, ExternalLink, Sparkles, Send, MessageSquare,
  ChevronRight, Lightbulb
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { usePosts } from '../context/PostsContext'
import { DEALERSHIPS } from '../data/dealerships'
import { getPlatform } from '../data/platforms'

const PLATFORM_COLORS = {
  instagram: '#E1306C',
  facebook:  '#1877F2',
  tiktok:    '#010101',
  linkedin:  '#0A66C2',
}

const BRAND_COLORS = {
  BMW:       'bg-slate-900 text-white',
  Honda:     'bg-red-600 text-white',
  Toyota:    'bg-red-700 text-white',
  Lexus:     'bg-slate-700 text-white',
  Acura:     'bg-slate-800 text-white',
  Corporate: 'bg-indigo-600 text-white',
}

const STATUS_STYLES = {
  pending:   'bg-amber-50 text-amber-700',
  approved:  'bg-emerald-50 text-emerald-700',
  published: 'bg-blue-50 text-blue-700',
  flagged:   'bg-orange-50 text-orange-700',
}

const BRANDS = ['All', 'BMW', 'Honda', 'Toyota', 'Lexus', 'Acura', 'Corporate']

// ─── Seeded mock engagement (deterministic, no flicker) ───────────────────────
function mockEng(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0
  const a = Math.abs(h)
  return {
    impressions: 800  + (a % 12000),
    reach:       600  + (a % 9000),
    likes:       30   + (a % 800),
    comments:    2    + (a % 60),
    shares:      1    + (a % 40),
    clicks:      10   + (a % 300),
  }
}

const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)

// ─── Approval rate bar ────────────────────────────────────────────────────────
// ── Metric guidance ───────────────────────────────────────────────────────────
const METRIC_GUIDANCE = {
  impressions: {
    icon: '👁️',
    plain: 'How many times your posts appeared in someone\'s feed — including repeat views by the same person.',
    benchmark: 'Local dealerships typically see 1,500–8,000 impressions per published post depending on follower count and content type.',
    evaluate: (v) => v > 5000
      ? 'Your impressions are strong. Reels and carousels are likely driving above-average distribution.'
      : v > 2000
        ? 'Solid reach for a dealership your size. Consistency in posting frequency will grow this further.'
        : 'Below average. Prioritize Reels (2–3× higher impressions than static images) and optimize posting times.',
    tips: [
      'Post Reels — they get 2–3× more impressions than static images on Instagram',
      'Use 8–12 relevant hashtags per post (mix of broad, local, and niche)',
      'Post between 9am–11am or 5pm–7pm in your dealership\'s local time zone',
      'Respond to every comment within 1 hour — engagement signals boost algorithmic distribution',
      'Repost or "boost" top-performing organic posts as paid ads for amplified reach',
    ],
  },
  reach: {
    icon: '📡',
    plain: 'The number of unique people who saw your posts. Unlike impressions, seeing the same post twice doesn\'t count twice.',
    benchmark: 'A healthy reach-to-follower ratio is 15–30% per post for organic content. Under 10% suggests distribution problems.',
    evaluate: (v) => v > 3000
      ? 'Strong unique reach — your content is being shown to new audiences beyond just your followers.'
      : v > 1000
        ? 'Moderate reach. Adding location tags and collaborating with local businesses can expand your audience.'
        : 'Low reach relative to published post count. Focus on content formats the algorithm favors (Reels, carousels).',
    tips: [
      'Tag your dealership\'s location on every post — it makes posts discoverable in local searches',
      'Collaborate with local businesses or community organizations for co-posted content',
      'Share posts to Stories immediately after publishing — it drives a second wave of reach',
      'Carousel posts keep people swiping longer, which signals quality to the algorithm',
      'Run a low-budget "reach" campaign ($5–10/day) on your best-performing organic posts',
    ],
  },
  engRate: {
    icon: '💬',
    plain: 'What percentage of people who saw your post actually interacted with it (likes, comments, shares, saves). This is the most important metric for organic growth.',
    benchmark: 'Industry average engagement rate is 1–3%. For automotive, 2–4% is good. Anything above 5% is excellent.',
    evaluate: (v) => {
      const num = parseFloat(v)
      if (num >= 5) return 'Excellent engagement. Your audience is highly active — this content style is working. Scale it.'
      if (num >= 2) return 'Good engagement rate. Above industry average for automotive. Focus on maintaining content consistency.'
      if (num >= 1) return 'Average engagement. Try more conversational captions with direct questions to drive comments.'
      return 'Below average. Engagement rate is the top signal for algorithmic reach. Prioritize content that prompts reactions.'
    },
    tips: [
      'End every caption with a direct question (e.g. "Which color would you choose? 👇")',
      'Use polls and question stickers in Stories — they\'re the easiest way to drive interaction',
      'Feature real customers and employees — human-face content consistently outperforms vehicle-only shots',
      'Reply to every comment to double your engagement count and build community',
      '"Save-worthy" content (tips, checklists, comparisons) drives the highest-quality engagement signals',
    ],
  },
  clicks: {
    icon: '🔗',
    plain: 'Estimated number of times people clicked your profile, bio link, or any link in your posts. Clicks represent genuine purchase intent.',
    benchmark: 'A 1–3% click-through rate on social content is typical. Car dealerships with clear CTAs see 2–5% CTR.',
    evaluate: (v) => v > 100
      ? 'Strong click volume — your CTAs are working. Make sure your bio link goes to a high-converting landing page.'
      : v > 30
        ? 'Moderate clicks. Adding a clear CTA in every caption ("Link in bio to schedule a test drive") will boost this.'
        : 'Low clicks relative to impressions. Every post needs a specific CTA directing followers to take action.',
    tips: [
      'Every caption should end with a clear CTA: "Schedule your test drive — link in bio"',
      'Use a link-in-bio tool (Linktree, etc.) to route traffic to inventory, service scheduling, or specials',
      'Facebook and LinkedIn allow clickable links in posts — use them with every promotional post',
      'Stories with "Swipe Up" or link stickers convert at 3–5× the rate of bio link clicks',
      'Run retargeting ads to people who clicked but didn\'t convert — high-intent audience',
    ],
  },
  approvalRate: {
    icon: '✅',
    plain: 'The percentage of submitted posts that were approved vs. flagged for revision. A high approval rate means content is aligned with brand guidelines and is submission-ready.',
    benchmark: 'Target: 80%+ approval rate. Under 70% indicates a content quality or brand alignment issue that needs training.',
    evaluate: (v) => v >= 85
      ? 'Excellent approval rate. Your team understands the content standards. Focus on volume and consistency.'
      : v >= 70
        ? 'Good approval rate. Some revision patterns may indicate gaps in brand guideline clarity.'
        : 'Below target. Hold a brief content standards review with the team. Most revisions are preventable with clearer upfront guidelines.',
    tips: [
      'Create a 1-page "Content Standards" cheat sheet with do/don\'t examples for your team',
      'Review the most common revision reasons — if the same issues repeat, they\'re training opportunities',
      'Use the AI caption generator — it\'s pre-trained on brand and platform best practices',
      'Have the content creator self-review against a checklist before submitting',
      'Approved content templates in the Asset Library give the team a starting point that already passes review',
    ],
  },
  reviewTime: {
    icon: '⏱️',
    plain: 'How long it takes from when content is submitted to when a manager approves or flags it. Fast review keeps social media timely and your team motivated.',
    benchmark: 'Target: under 12 hours. Social media is time-sensitive — a 24h+ review cycle means you miss trending moments.',
    evaluate: (v) => {
      if (!v) return 'No review time data yet.'
      const hrs = typeof v === 'number' ? v : 0
      if (hrs <= 12) return 'Excellent review speed — under 12 hours keeps your content timely and your team unblocked.'
      if (hrs <= 24) return 'Acceptable, but slower than ideal. Consider setting a daily review window to batch approvals.'
      return 'Review time is too slow. Delayed approvals kill post timing and demotivate creators. Set a daily review SLA.'
    },
    tips: [
      'Set a daily review window (e.g. 9am and 5pm) so submitters know when to expect feedback',
      'Enable email notifications so approval requests don\'t get buried',
      'Pre-approve content templates for recurring post types (monthly specials, service reminders)',
      'Delegate review authority to a social media lead for non-critical content',
      'Use the "Flagged" status with specific notes rather than leaving posts in limbo',
    ],
  },
}

function MetricCard({ metricKey, label, value, note }) {
  const [open, setOpen] = useState(false)
  const g = METRIC_GUIDANCE[metricKey]
  if (!g) return (
    <div className="bg-white rounded-xl border border-slate-100 px-4 py-3">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      {note && <p className="text-[10px] text-slate-400 mt-0.5">{note}</p>}
    </div>
  )
  const evalText = value && value !== '—'
    ? typeof g.evaluate === 'function' ? g.evaluate(value) : g.evaluate
    : null

  return (
    <div className={`rounded-xl border transition-all cursor-pointer ${open ? 'bg-indigo-50/40 border-indigo-200' : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm'}`}
      onClick={() => setOpen(o => !o)}>
      <div className="px-4 py-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          {note && <p className="text-[10px] text-slate-400 mt-0.5">{note}</p>}
        </div>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${open ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
          {open ? <ChevronDown size={12} /> : <Info size={11} />}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-indigo-100 pt-3" onClick={e => e.stopPropagation()}>
          {/* What it means */}
          <div>
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">What this means</p>
            <p className="text-xs text-slate-600 leading-relaxed">{g.plain}</p>
          </div>
          {/* Benchmark */}
          <div className="bg-slate-50 rounded-lg px-3 py-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Industry benchmark</p>
            <p className="text-xs text-slate-600">{g.benchmark}</p>
          </div>
          {/* Your performance */}
          {evalText && (
            <div className="bg-indigo-50 rounded-lg px-3 py-2">
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-0.5">Your performance</p>
              <p className="text-xs text-indigo-800">{evalText}</p>
            </div>
          )}
          {/* Tips */}
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">How to improve</p>
            <ul className="space-y-1.5">
              {g.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="text-indigo-400 font-bold flex-shrink-0 mt-0.5">{i + 1}.</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Analytics Chat Panel ──────────────────────────────────────────────────────
function AnalyticsChatPanel({ dealer, scoreData, drillEng, platformMix, range }) {
  const [open, setOpen]       = useState(false)
  const [input, setInput]     = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const context = {
    dealershipName: dealer?.name,
    location:       dealer?.location,
    brand:          dealer?.brand,
    total:          scoreData?.total,
    published:      scoreData?.published,
    pending:        scoreData?.pending,
    flagged:        scoreData?.flagged,
    approvalRate:   scoreData?.approvalRate,
    avgReviewHrs:   scoreData?.avgReviewHrs,
    thisWeek:       scoreData?.thisWeek,
    platformMix:    platformMix?.map(p => `${p.name}: ${p.value}`),
    impressions:    drillEng ? fmt(drillEng.impressions) : null,
    reach:          drillEng ? fmt(drillEng.reach) : null,
    engRate:        drillEng?.engRate ? `${drillEng.engRate}%` : null,
    clicks:         drillEng ? fmt(drillEng.clicks) : null,
    range,
  }

  const STARTERS = [
    'Why is our approval rate what it is?',
    'What content should we post more of?',
    'How do we improve engagement?',
    'What are the best times to post for this dealership?',
  ]

  const send = useCallback(async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    setError('')
    const updated = [...messages, { role: 'user', content: msg }]
    setMessages(updated)
    setLoading(true)
    try {
      const res = await fetch('/api/analytics-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: updated, context }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [input, messages, loading, context])

  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
          <Sparkles size={13} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">Chat with your data</p>
          <p className="text-xs text-slate-400">Ask AI for insights, recommendations, or content ideas</p>
        </div>
        <ChevronRight size={14} className={`text-slate-300 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-slate-100">
          {/* Starter prompts */}
          {messages.length === 0 && (
            <div className="px-4 pt-3 pb-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Try asking</p>
              <div className="flex flex-wrap gap-2">
                {STARTERS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <div className="px-4 py-3 space-y-3 max-h-80 overflow-y-auto">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-indigo-100 text-indigo-600'
                  }`}>
                    {m.role === 'user' ? 'U' : <Sparkles size={11} />}
                  </div>
                  <div className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed max-w-[85%] ${
                    m.role === 'user'
                      ? 'bg-slate-900 text-white rounded-tr-sm'
                      : 'bg-slate-50 text-slate-700 rounded-tl-sm'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={11} />
                  </div>
                  <div className="bg-slate-50 rounded-2xl rounded-tl-sm px-3.5 py-3 flex items-center gap-1">
                    {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                  </div>
                </div>
              )}
              {error && <p className="text-xs text-rose-600 pl-8">{error}</p>}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Input */}
          <div className="px-4 pb-3 pt-2 border-t border-slate-100 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask about this dealership's performance…"
              disabled={loading}
              className="flex-1 text-xs px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 disabled:opacity-50"
            />
            <button onClick={() => send()} disabled={!input.trim() || loading}
              className="px-3 py-2.5 rounded-lg text-white disabled:opacity-40 transition-colors flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
              <Send size={13} />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 px-4 pb-3 -mt-1">
            Responses are based on your platform's analytics data + AI training. Not live web data — always verify recommendations.
          </p>
        </div>
      )}
    </div>
  )
}

function ApprovalBar({ rate }) {
  const color     = rate >= 80 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-400' : 'bg-rose-500'
  const textColor = rate >= 80 ? 'text-emerald-700' : rate >= 60 ? 'text-amber-700' : 'text-rose-700'
  const bgColor   = rate >= 80 ? 'bg-emerald-50' : rate >= 60 ? 'bg-amber-50' : 'bg-rose-50'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden min-w-[48px]">
        <div className={`h-2 ${color} rounded-full`} style={{ width: `${rate}%` }} />
      </div>
      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${bgColor} ${textColor} flex-shrink-0`}>{rate}%</span>
    </div>
  )
}

// ─── Sort icon ────────────────────────────────────────────────────────────────
function SortIcon({ col, sortBy, sortDir }) {
  if (col !== sortBy) return <ArrowUpDown size={11} className="text-slate-300" />
  return sortDir === 'asc'
    ? <ChevronUp size={11} className="text-indigo-500" />
    : <ChevronDown size={11} className="text-indigo-500" />
}

export default function AnalyticsPage() {
  const { posts } = usePosts()

  const [brandFilter,     setBrandFilter]     = useState('All')
  const [range,           setRange]           = useState('30d')
  const [sortBy,          setSortBy]          = useState('approvalRate')
  const [sortDir,         setSortDir]         = useState('asc')   // asc = worst first for approvalRate
  const [selectedDealer,  setSelectedDealer]  = useState(null)
  const scoreboardRef = useRef(null)

  const focusScoreboard = (col, dir) => {
    setSortBy(col)
    setSortDir(dir)
    setSelectedDealer(null)
    setTimeout(() => scoreboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  // ── QR Analytics ──────────────────────────────────────────────────────────
  const [qrCodes,        setQrCodes]        = useState([])
  const [qrLoading,      setQrLoading]      = useState(false)

  // ── Tool Usage ────────────────────────────────────────────────────────────
  const [toolEvents,     setToolEvents]     = useState([])
  const [toolLoading,    setToolLoading]    = useState(false)

  useEffect(() => {
    loadQrData()
    loadToolData()
  }, [])

  const loadQrData = async () => {
    setQrLoading(true)
    try {
      const [{ data: codes }, { data: scans }] = await Promise.all([
        supabase.from('qr_codes').select('*').order('created_at', { ascending: false }),
        supabase.from('qr_scans').select('qr_code_id, scanned_at'),
      ])
      const counts = (scans || []).reduce((acc, s) => {
        acc[s.qr_code_id] = (acc[s.qr_code_id] || 0) + 1
        return acc
      }, {})
      setQrCodes((codes || []).map(c => ({ ...c, scan_count: counts[c.id] || 0 })))
    } catch { /* silent */ } finally { setQrLoading(false) }
  }

  const loadToolData = async () => {
    setToolLoading(true)
    try {
      const { data } = await supabase.from('tool_events').select('tool_id, used_at')
      setToolEvents(data || [])
    } catch { /* silent */ } finally { setToolLoading(false) }
  }

  // Derived: tool usage counts for chart
  const toolUsageCounts = useMemo(() => {
    const map = {}
    toolEvents.forEach(e => { map[e.tool_id] = (map[e.tool_id] || 0) + 1 })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, count]) => ({ id, count }))
  }, [toolEvents])

  // Derived: QR scans summary
  const totalQrScans = useMemo(() => qrCodes.reduce((s, c) => s + c.scan_count, 0), [qrCodes])

  const now = new Date()

  const rangeStart = useMemo(() => {
    if (range === '7d')  return subWeeks(now, 1)
    if (range === '30d') return subMonths(now, 1)
    return new Date(0)
  }, [range])

  const activePosts = useMemo(() => posts.filter(p => p.approval_status !== 'deleted'), [posts])

  const inRange = (dateStr) => {
    try { return parseISO(dateStr) >= rangeStart } catch { return false }
  }

  // ── Per-dealership scoreboard ─────────────────────────────────────────────
  const scorecard = useMemo(() => {
    return DEALERSHIPS
      .filter(d => brandFilter === 'All' || d.brand === brandFilter)
      .map(d => {
        const all      = activePosts.filter(p => p.dealership_id === d.id)
        const inRangeP = all.filter(p => inRange(p.uploaded_at))
        const decided  = inRangeP.filter(p => ['approved','published','flagged'].includes(p.approval_status))
        const approved = decided.filter(p => ['approved','published'].includes(p.approval_status))
        const flaggedP = inRangeP.filter(p => p.approval_status === 'flagged')
        const pendingP = inRangeP.filter(p => p.approval_status === 'pending')
        const publishedP = inRangeP.filter(p => p.approval_status === 'published')

        const wStart   = startOfWeek(now, { weekStartsOn: 1 })
        const wEnd     = endOfWeek(now, { weekStartsOn: 1 })
        const thisWeek = all.filter(p => {
          try { return isWithinInterval(parseISO(p.uploaded_at), { start: wStart, end: wEnd }) } catch { return false }
        }).length

        const resolved = inRangeP.filter(p => p.chad_action_at && p.uploaded_at)
        const avgReviewHrs = resolved.length
          ? Math.round(resolved.reduce((s, p) => s + differenceInHours(parseISO(p.chad_action_at), parseISO(p.uploaded_at)), 0) / resolved.length)
          : null

        const lastPost = [...all].sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))[0]?.uploaded_at || null
        const approvalRate = decided.length > 0 ? Math.round((approved.length / decided.length) * 100) : null

        return {
          ...d,
          total:       inRangeP.length,
          published:   publishedP.length,
          pending:     pendingP.length,
          flagged:     flaggedP.length,
          thisWeek,
          approvalRate,
          avgReviewHrs,
          lastPost,
        }
      })
  }, [activePosts, brandFilter, range])

  // ── Sorting ───────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    return [...scorecard].sort((a, b) => {
      let av, bv
      switch (sortBy) {
        case 'approvalRate': av = a.approvalRate ?? -1; bv = b.approvalRate ?? -1; break
        case 'total':        av = a.total;              bv = b.total;              break
        case 'flagged':      av = a.flagged;            bv = b.flagged;            break
        case 'thisWeek':     av = a.thisWeek;           bv = b.thisWeek;           break
        default:             av = 0; bv = 0
      }
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [scorecard, sortBy, sortDir])

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir(col === 'approvalRate' ? 'asc' : 'desc') }
  }

  // ── Outlier alerts ────────────────────────────────────────────────────────
  const needsAttention = scorecard.filter(d => d.approvalRate !== null && d.approvalRate < 70 && d.total > 0)
  const inactiveCount  = scorecard.filter(d => d.thisWeek === 0 && d.total > 0).length
  const totalFlagged   = scorecard.reduce((s, d) => s + d.flagged, 0)

  // ── Drill-in: all posts for selected dealership ───────────────────────────
  const drillPosts = useMemo(() => {
    if (!selectedDealer) return []
    return activePosts.filter(p => p.dealership_id === selectedDealer)
  }, [activePosts, selectedDealer])

  const drillDealer = useMemo(
    () => DEALERSHIPS.find(d => d.id === selectedDealer) || null,
    [selectedDealer]
  )

  // Drill-in: 8-week submission volume
  const drillWeekly = useMemo(() => {
    if (!selectedDealer) return []
    return Array.from({ length: 8 }, (_, i) => {
      const weekOf = subWeeks(now, 7 - i)
      const wStart = startOfWeek(weekOf, { weekStartsOn: 1 })
      const wEnd   = endOfWeek(weekOf, { weekStartsOn: 1 })
      const wp = activePosts.filter(p => {
        if (p.dealership_id !== selectedDealer) return false
        try { return isWithinInterval(parseISO(p.uploaded_at), { start: wStart, end: wEnd }) } catch { return false }
      })
      return {
        week:      format(wStart, 'M/d'),
        submitted: wp.length,
        approved:  wp.filter(p => ['approved','published'].includes(p.approval_status)).length,
        flagged:   wp.filter(p => p.approval_status === 'flagged').length,
      }
    })
  }, [activePosts, selectedDealer])

  // Drill-in: platform mix
  const drillPlatforms = useMemo(() => {
    if (!drillPosts.length) return []
    const map = {}
    drillPosts.forEach(p => { map[p.platform] = (map[p.platform] || 0) + 1 })
    return Object.entries(map)
      .map(([pid, count]) => ({ name: getPlatform(pid)?.name || pid, value: count, color: PLATFORM_COLORS[pid] || '#94a3b8' }))
      .sort((a, b) => b.value - a.value)
  }, [drillPosts])

  // Drill-in: 5 most recent posts
  const drillRecent = useMemo(
    () => [...drillPosts].sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)).slice(0, 5),
    [drillPosts]
  )

  // Drill-in: sample engagement totals (published posts only)
  const drillEng = useMemo(() => {
    const published = drillPosts.filter(p => p.approval_status === 'published')
    if (!published.length) return null
    const totals = published.reduce((acc, p) => {
      const e = mockEng(p.id)
      return {
        impressions: acc.impressions + e.impressions,
        reach:       acc.reach       + e.reach,
        engagement:  acc.engagement  + e.likes + e.comments + e.shares,
        clicks:      acc.clicks      + e.clicks,
      }
    }, { impressions: 0, reach: 0, engagement: 0, clicks: 0 })
    const engRate = totals.impressions > 0
      ? ((totals.engagement / totals.impressions) * 100).toFixed(1)
      : null
    return { ...totals, engRate, count: published.length }
  }, [drillPosts])

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

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Header + date range ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics</h1>
          <p className="text-sm text-slate-400 mt-0.5">Per-dealership performance · click any row to drill in</p>
        </div>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
          {[['7d','7 days'],['30d','30 days'],['all','All time']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setRange(val)}
              className={`px-3 py-1.5 transition-colors ${range === val ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Outlier alerts ── */}
      {(needsAttention.length > 0 || inactiveCount > 0 || totalFlagged > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {needsAttention.length > 0 && (
            <button
              onClick={() => focusScoreboard('approvalRate', 'asc')}
              className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-100 hover:bg-rose-100 hover:border-rose-200 hover:shadow-sm transition-all text-left w-full"
            >
              <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={15} className="text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-rose-800">
                  {needsAttention.length} dealership{needsAttention.length > 1 ? 's' : ''} need attention
                </p>
                <p className="text-xs text-rose-500 mt-0.5 truncate">
                  {needsAttention.map(d => d.name).join(', ')}
                </p>
              </div>
              <ChevronDown size={13} className="text-rose-300 flex-shrink-0 -rotate-90" />
            </button>
          )}
          {inactiveCount > 0 && (
            <button
              onClick={() => focusScoreboard('thisWeek', 'asc')}
              className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100 hover:bg-amber-100 hover:border-amber-200 hover:shadow-sm transition-all text-left w-full"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Calendar size={15} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800">{inactiveCount} inactive this week</p>
                <p className="text-xs text-amber-500 mt-0.5">No posts submitted yet</p>
              </div>
              <ChevronDown size={13} className="text-amber-300 flex-shrink-0 -rotate-90" />
            </button>
          )}
          {totalFlagged > 0 && (
            <button
              onClick={() => focusScoreboard('flagged', 'desc')}
              className="flex items-center gap-3 p-4 rounded-xl bg-orange-50 border border-orange-100 hover:bg-orange-100 hover:border-orange-200 hover:shadow-sm transition-all text-left w-full"
            >
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={15} className="text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-orange-800">{totalFlagged} post{totalFlagged > 1 ? 's' : ''} flagged for revision</p>
                <p className="text-xs text-orange-500 mt-0.5">Awaiting resubmission</p>
              </div>
              <ChevronDown size={13} className="text-orange-300 flex-shrink-0 -rotate-90" />
            </button>
          )}
        </div>
      )}

      {/* ── Brand filter ── */}
      <div className="flex flex-wrap gap-2">
        {BRANDS.map(b => (
          <button
            key={b}
            onClick={() => { setBrandFilter(b); setSelectedDealer(null) }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              brandFilter === b
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Weekly submissions */}
        <div className="card-hover bg-white rounded-2xl border border-slate-200 p-5">
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
        <div className="card-hover bg-white rounded-2xl border border-slate-200 p-5">
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

      {/* ── Dealership Scoreboard ── */}
      <div ref={scoreboardRef} className="card-hover bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Dealership Scoreboard</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Sort by any column · Click a row to drill in
            </p>
          </div>
          <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <BarChart2 size={10} />Live data
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-3 sm:px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Dealership
                </th>
                {[
                  ['thisWeek',     'This Week',     null],
                  ['total',        'Submitted',     'hidden sm:table-cell'],
                  ['approvalRate', 'Approval Rate', null],
                  ['flagged',      'Flagged',       'hidden sm:table-cell'],
                ].map(([col, label, hideCls]) => (
                  <th
                    key={col}
                    onClick={() => toggleSort(col)}
                    className={`px-3 sm:px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-600 whitespace-nowrap ${hideCls || ''}`}
                  >
                    <span className="flex items-center gap-1">
                      {label}
                      <SortIcon col={col} sortBy={sortBy} sortDir={sortDir} />
                    </span>
                  </th>
                ))}
                <th className="hidden lg:table-cell px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Avg Review
                </th>
                <th className="hidden lg:table-cell px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Last Post
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map((d, index) => {
                const isSelected = selectedDealer === d.id
                const noData     = d.total === 0

                return (
                  <Fragment key={d.id}>
                    <motion.tr
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(index * 0.025, 0.5), ease: 'easeOut' }}
                      onClick={() => setSelectedDealer(isSelected ? null : d.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-50/70'
                          : noData
                          ? 'opacity-50 hover:opacity-75 hover:bg-slate-50'
                          : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Dealership name + brand badge */}
                      <td className="px-3 sm:px-4 py-3.5">
                        <div className="flex items-center gap-2 sm:gap-2.5">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 leading-tight truncate">{d.name}</p>
                            <p className="text-xs text-slate-400 truncate">{d.location}</p>
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0 ${BRAND_COLORS[d.brand] || 'bg-slate-200 text-slate-600'}`}>
                            {d.brand}
                          </span>
                        </div>
                      </td>

                      {/* This week */}
                      <td className="px-3 sm:px-4 py-3.5">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold ${
                          d.thisWeek > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'
                        }`}>{d.thisWeek}</span>
                      </td>

                      {/* Total submitted */}
                      <td className="hidden sm:table-cell px-3 sm:px-4 py-3.5 text-sm font-semibold text-slate-700">
                        {d.total || <span className="text-slate-300">—</span>}
                      </td>

                      {/* Approval rate */}
                      <td className="px-3 sm:px-4 py-3.5 sm:min-w-[160px]">
                        {d.approvalRate !== null
                          ? <ApprovalBar rate={d.approvalRate} />
                          : <span className="text-xs text-slate-300">No data</span>
                        }
                      </td>

                      {/* Flagged */}
                      <td className="hidden sm:table-cell px-3 sm:px-4 py-3.5">
                        {d.flagged > 0
                          ? <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">{d.flagged}</span>
                          : <span className="text-xs text-slate-300">—</span>}
                      </td>

                      {/* Avg review time */}
                      <td className="hidden lg:table-cell px-4 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                        {d.avgReviewHrs !== null
                          ? d.avgReviewHrs < 24 ? `${d.avgReviewHrs}h` : `${Math.round(d.avgReviewHrs / 24)}d`
                          : <span className="text-slate-300">—</span>}
                      </td>

                      {/* Last post */}
                      <td className="hidden lg:table-cell px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                        {d.lastPost
                          ? formatDistanceToNow(parseISO(d.lastPost), { addSuffix: true })
                          : <span className="text-slate-300">Never</span>}
                      </td>
                    </motion.tr>

                    {/* ── Drill-in panel ── */}
                    {isSelected && drillDealer && (
                      <tr>
                        <td colSpan={7} className="p-0">
                          <div className="bg-indigo-50/40 border-t border-indigo-100 p-5">
                            {/* Panel header */}
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="font-semibold text-slate-900 text-sm">{drillDealer.name}</h3>
                                <p className="text-xs text-slate-400">{drillDealer.location} · {drillDealer.brand} · {drillPosts.length} total posts</p>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedDealer(null) }}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-white transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>

                            {/* Sample engagement cards */}
                            <div className="mb-4">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. Platform Performance</p>
                                <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                  <Info size={9} />Sample data · {drillEng?.count ?? 0} published posts
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mb-2 flex items-center gap-1"><Info size={9} />Click any card for plain-language explanation + recommendations</p>
                              {drillEng ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <MetricCard metricKey="impressions" label="Est. Impressions" value={fmt(drillEng.impressions)} note="Sample data" />
                                  <MetricCard metricKey="reach"       label="Est. Reach"       value={fmt(drillEng.reach)}       note="Sample data" />
                                  <MetricCard metricKey="engRate"     label="Avg. Eng. Rate"   value={drillEng.engRate ? `${drillEng.engRate}%` : '—'} note="Sample data" />
                                  <MetricCard metricKey="clicks"      label="Est. Clicks"      value={fmt(drillEng.clicks)}      note="Sample data" />
                                </div>
                              ) : (
                                <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 text-xs text-slate-400">
                                  No published posts yet — engagement data will appear once posts are published.
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              {/* Volume chart */}
                              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-4">
                                <p className="text-xs font-semibold text-slate-500 mb-3">Submission Volume — Last 8 Weeks</p>
                                <div className="h-44">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={drillWeekly} barGap={2} barCategoryGap="30%">
                                      <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={20} />
                                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} labelStyle={{ fontWeight: 600, color: '#0f172a' }} />
                                      <Bar dataKey="submitted" name="Submitted" fill="#6366f1" radius={[3,3,0,0]} />
                                      <Bar dataKey="approved"  name="Approved"  fill="#34d399" radius={[3,3,0,0]} />
                                      <Bar dataKey="flagged"   name="Flagged"   fill="#fb923c" radius={[3,3,0,0]} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                                <div className="flex items-center gap-4 mt-2">
                                  {[['#6366f1','Submitted'],['#34d399','Approved'],['#fb923c','Flagged']].map(([c,l]) => (
                                    <div key={l} className="flex items-center gap-1.5 text-xs text-slate-400">
                                      <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: c }} />{l}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Platform mix + recent posts */}
                              <div className="flex flex-col gap-3">

                                {/* Platform mix */}
                                <div className="bg-white rounded-xl border border-slate-100 p-4">
                                  <p className="text-xs font-semibold text-slate-500 mb-3">Platform Mix</p>
                                  {drillPlatforms.length > 0 ? (
                                    <div className="space-y-2.5">
                                      {drillPlatforms.map(p => (
                                        <div key={p.name} className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                                          <span className="text-xs text-slate-600 flex-1">{p.name}</span>
                                          <span className="text-xs font-semibold text-slate-700 mr-1">{p.value}</span>
                                          <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                              className="h-full rounded-full"
                                              style={{
                                                backgroundColor: p.color,
                                                width: `${Math.round((p.value / drillPosts.length) * 100)}%`,
                                              }}
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-400 py-2">No posts</p>
                                  )}
                                </div>

                                {/* Recent posts */}
                                <div className="bg-white rounded-xl border border-slate-100 p-4 flex-1">
                                  <p className="text-xs font-semibold text-slate-500 mb-3">Recent Posts</p>
                                  {drillRecent.length > 0 ? (
                                    <div className="space-y-2">
                                      {drillRecent.map(p => (
                                        <div key={p.id} className="flex items-start gap-2">
                                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 capitalize ${STATUS_STYLES[p.approval_status] || 'bg-slate-100 text-slate-500'}`}>
                                            {p.approval_status}
                                          </span>
                                          <p className="text-xs text-slate-600 line-clamp-1">{p.caption || p.file_name || 'No caption'}</p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-400 py-2">No posts yet</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Workflow metric cards */}
                            <div className="mt-4 grid grid-cols-2 gap-3">
                              <MetricCard
                                metricKey="approvalRate"
                                label="Approval Rate"
                                value={drillDealer && scorecard.find(s => s.id === selectedDealer)?.approvalRate != null
                                  ? `${scorecard.find(s => s.id === selectedDealer).approvalRate}%`
                                  : '—'}
                              />
                              <MetricCard
                                metricKey="reviewTime"
                                label="Avg. Review Time"
                                value={(() => {
                                  const s = scorecard.find(s => s.id === selectedDealer)
                                  if (!s?.avgReviewHrs) return '—'
                                  return s.avgReviewHrs < 24 ? `${s.avgReviewHrs}h` : `${Math.round(s.avgReviewHrs / 24)}d`
                                })()}
                              />
                            </div>

                            {/* AI Chat */}
                            <div className="mt-4">
                              <AnalyticsChatPanel
                                dealer={drillDealer}
                                scoreData={scorecard.find(s => s.id === selectedDealer)}
                                drillEng={drillEng}
                                platformMix={drillPlatforms}
                                range={range}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Tier 2: Platform performance (connect to enable) ── */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Zap size={11} />Platform Performance
          </p>
          <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
            <Info size={9} />Connect accounts to enable
          </span>
        </div>
        <div className="rounded-2xl border border-dashed border-slate-200 p-6 bg-slate-50/40 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex gap-2">
              {[['#1877F2','F'],['#E1306C','I'],['#010101','T'],['#0A66C2','L']].map(([c,l]) => (
                <div key={l} className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: c }}>{l}</div>
              ))}
            </div>
            <div>
              <p className="font-semibold text-slate-700 text-sm">Connect platform accounts for live engagement data</p>
              <p className="text-xs text-slate-400 mt-0.5">Per-dealership impressions, reach, and engagement — each handle isolated, not blended</p>
            </div>
          </div>
          <Link
            to="/settings"
            className="btn-press flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap flex-shrink-0"
          >
            <Zap size={12} />Set up integrations
          </Link>
        </div>
      </div>

      {/* ── GA4 placeholder ── */}
      <div className="rounded-2xl border border-dashed border-slate-200 p-6 bg-white flex flex-col sm:flex-row items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0">
          <TrendingUp size={18} className="text-orange-500" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-700 text-sm">Google Analytics 4 — Website Impact per Dealership</p>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-xl">
            Once UTM parameters are consistently applied per dealership, connect GA4 to see social-driven traffic, VDP views, and lead form completions — isolated per location so you know exactly which stores social is converting for.
          </p>
          <p className="text-[10px] text-slate-300 mt-2">Planned for Phase 2 · Requires UTM discipline first</p>
        </div>
      </div>

      {/* ── QR Code Analytics ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <QrCode size={15} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">QR Code Analytics</h2>
              <p className="text-xs text-slate-400 mt-0.5">Scan counts for all tracked QR codes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {qrCodes.length > 0 && (
              <div className="flex gap-3">
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900 leading-none">{qrCodes.length}</p>
                  <p className="text-[10px] text-slate-400">codes</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-indigo-600 leading-none">{totalQrScans}</p>
                  <p className="text-[10px] text-slate-400">total scans</p>
                </div>
              </div>
            )}
            <button onClick={loadQrData} disabled={qrLoading}
              className="text-slate-400 hover:text-indigo-500 transition-colors disabled:opacity-40 p-1">
              <RefreshCw size={13} className={qrLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {qrLoading ? (
          <div className="py-10 text-center text-sm text-slate-400">Loading…</div>
        ) : qrCodes.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-400">No tracked QR codes yet.</p>
            <p className="text-xs text-slate-300 mt-1">Generate a Tracked QR in Tools → QR Code.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {[['Label / URL', ''],['Target', 'hidden sm:table-cell'],['Created', 'hidden md:table-cell'],['Scans', '']].map(([h, cls]) => (
                    <th key={h} className={`px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider ${cls}`}>{h}</th>
                  ))}
                  <th className="px-4 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {qrCodes.map(code => (
                  <tr key={code.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-xs font-semibold text-slate-800 truncate">{code.label || code.target_url}</p>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 max-w-[220px]">
                      <p className="text-xs text-slate-400 truncate">{code.target_url}</p>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(code.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full ${
                        code.scan_count > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {code.scan_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a href={code.target_url} target="_blank" rel="noopener noreferrer"
                        className="text-slate-300 hover:text-indigo-500 transition-colors">
                        <ExternalLink size={12} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Tool Usage ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Wrench size={14} className="text-slate-500" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">Tool Usage</h2>
              <p className="text-xs text-slate-400 mt-0.5">Most-used interactive tools across the team</p>
            </div>
          </div>
          <button onClick={loadToolData} disabled={toolLoading}
            className="text-slate-400 hover:text-indigo-500 transition-colors disabled:opacity-40 p-1">
            <RefreshCw size={13} className={toolLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {toolLoading ? (
          <div className="py-10 text-center text-sm text-slate-400">Loading…</div>
        ) : toolUsageCounts.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-400">No tool usage recorded yet.</p>
            <p className="text-xs text-slate-300 mt-1">Usage is logged when tools are run.</p>
          </div>
        ) : (
          <div className="p-5">
            <div className="space-y-2.5">
              {toolUsageCounts.map(({ id, count }, i) => {
                const pct = Math.round((count / toolUsageCounts[0].count) * 100)
                return (
                  <div key={id} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-4 flex-shrink-0">{i + 1}</span>
                    <span className="text-xs font-semibold text-slate-700 w-24 flex-shrink-0 capitalize">{id}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-2 bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-600 w-8 text-right flex-shrink-0">{count}</span>
                  </div>
                )
              })}
            </div>
            <p className="text-[10px] text-slate-300 mt-4">Logged when PageSpeed tests run, Schema validates, or QR codes are generated.</p>
          </div>
        )}
      </div>

    </div>
  )
}
