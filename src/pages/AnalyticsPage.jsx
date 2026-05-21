import { useMemo, useState, useEffect, useRef, Fragment } from 'react'
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
  QrCode, Wrench, RefreshCw, ExternalLink
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
                              {drillEng ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  {[
                                    { label: 'Est. Impressions', value: fmt(drillEng.impressions) },
                                    { label: 'Est. Reach',       value: fmt(drillEng.reach)       },
                                    { label: 'Avg. Eng. Rate',   value: drillEng.engRate ? `${drillEng.engRate}%` : '—' },
                                    { label: 'Est. Clicks',      value: fmt(drillEng.clicks)      },
                                  ].map(c => (
                                    <div key={c.label} className="bg-white rounded-xl border border-slate-100 px-4 py-3 opacity-90">
                                      <p className="text-lg font-bold text-slate-900">{c.value}</p>
                                      <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
                                    </div>
                                  ))}
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
