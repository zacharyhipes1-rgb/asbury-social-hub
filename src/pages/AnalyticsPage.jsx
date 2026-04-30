import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  format, parseISO, subWeeks, startOfWeek, endOfWeek,
  isWithinInterval, differenceInHours, startOfMonth, endOfMonth,
  subMonths, isWithinInterval as inInterval
} from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  TrendingUp, Clock, CheckCircle, AlertTriangle, Upload,
  Zap, Info, ExternalLink, BarChart2, Users, ShieldCheck,
  ChevronDown, AlertCircle, Calendar
} from 'lucide-react'
import { usePosts } from '../context/PostsContext'
import { useUsers } from '../context/UsersContext'
import { DEALERSHIPS } from '../data/dealerships'
import { getPlatform, getContentType } from '../data/platforms'

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

const PLATFORM_COLORS = {
  instagram: '#E1306C',
  facebook:  '#1877F2',
  tiktok:    '#010101',
  linkedin:  '#0A66C2',
}

const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)

// ─── Small stat card ──────────────────────────────────────────────────────────
function KPI({ label, value, sub, icon: Icon, color, badge }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
        {badge && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{badge}</span>
        )}
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
      <p className="text-sm font-medium text-slate-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHead({ title, sub, badge }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {badge && (
        <span className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          {badge}
        </span>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  const { posts } = usePosts()
  const { users } = useUsers()

  const [dealerFilter, setDealerFilter] = useState('all')
  const [range, setRange]               = useState('30d') // '7d' | '30d' | 'all'

  // Date range window
  const now = new Date()
  const rangeStart = useMemo(() => {
    if (range === '7d')  return subWeeks(now, 1)
    if (range === '30d') return subMonths(now, 1)
    return new Date(0)
  }, [range])

  const inRange = (dateStr) => {
    try { return parseISO(dateStr) >= rangeStart } catch { return false }
  }

  // Filter by dealership + range
  const scoped = useMemo(() => posts.filter(p => {
    if (p.approval_status === 'deleted') return false
    if (dealerFilter !== 'all' && p.dealership_id !== dealerFilter) return false
    return inRange(p.uploaded_at)
  }), [posts, dealerFilter, range])

  const published = useMemo(() => scoped.filter(p => p.approval_status === 'published'), [scoped])
  const pending   = useMemo(() => scoped.filter(p => p.approval_status === 'pending'),   [scoped])
  const flagged   = useMemo(() => scoped.filter(p => p.approval_status === 'flagged'),   [scoped])

  // ── Workflow KPIs ──────────────────────────────────────────────────────────
  const approvalRate = useMemo(() => {
    const decided = scoped.filter(p => ['approved','published','flagged'].includes(p.approval_status))
    if (!decided.length) return null
    const approved = decided.filter(p => p.approval_status === 'approved' || p.approval_status === 'published')
    return Math.round((approved.length / decided.length) * 100)
  }, [scoped])

  const avgApprovalHrs = useMemo(() => {
    const resolved = scoped.filter(p => p.chad_action_at && p.uploaded_at)
    if (!resolved.length) return null
    const total = resolved.reduce((s, p) => s + differenceInHours(parseISO(p.chad_action_at), parseISO(p.uploaded_at)), 0)
    return Math.round(total / resolved.length)
  }, [scoped])

  // ── Content volume — last 8 weeks ──────────────────────────────────────────
  const weeklyVolume = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const weekOf   = subWeeks(now, 7 - i)
      const wStart   = startOfWeek(weekOf, { weekStartsOn: 1 })
      const wEnd     = endOfWeek(weekOf, { weekStartsOn: 1 })
      const interval = { start: wStart, end: wEnd }
      const allPosts = posts.filter(p => {
        if (p.approval_status === 'deleted') return false
        if (dealerFilter !== 'all' && p.dealership_id !== dealerFilter) return false
        try { return isWithinInterval(parseISO(p.uploaded_at), interval) } catch { return false }
      })
      return {
        week:      format(wStart, 'M/d'),
        submitted: allPosts.length,
        approved:  allPosts.filter(p => ['approved','published'].includes(p.approval_status)).length,
        flagged:   allPosts.filter(p => p.approval_status === 'flagged').length,
      }
    })
  }, [posts, dealerFilter])

  // ── Platform mix ──────────────────────────────────────────────────────────
  const platformMix = useMemo(() => {
    const map = {}
    scoped.forEach(p => {
      map[p.platform] = (map[p.platform] || 0) + 1
    })
    return Object.entries(map)
      .map(([pid, count]) => ({ name: getPlatform(pid)?.name || pid, value: count, color: PLATFORM_COLORS[pid] || '#94a3b8' }))
      .sort((a, b) => b.value - a.value)
  }, [scoped])

  // ── Dealership activity ────────────────────────────────────────────────────
  const dealerActivity = useMemo(() => {
    return DEALERSHIPS.map(d => {
      const dp        = scoped.filter(p => p.dealership_id === d.id)
      const dpPub     = dp.filter(p => p.approval_status === 'published')
      const dpPending = dp.filter(p => p.approval_status === 'pending')
      const dpFlagged = dp.filter(p => p.approval_status === 'flagged')
      const thisWeek  = posts.filter(p => {
        if (p.dealership_id !== d.id || p.approval_status === 'deleted') return false
        const wStart = startOfWeek(now, { weekStartsOn: 1 })
        const wEnd   = endOfWeek(now, { weekStartsOn: 1 })
        try { return isWithinInterval(parseISO(p.uploaded_at), { start: wStart, end: wEnd }) } catch { return false }
      }).length
      return {
        ...d,
        total:    dp.length,
        published: dpPub.length,
        pending:  dpPending.length,
        flagged:  dpFlagged.length,
        thisWeek,
        active:   dp.length > 0,
      }
    }).sort((a, b) => b.total - a.total)
  }, [scoped, posts])

  const inactiveDealers = dealerActivity.filter(d => d.thisWeek === 0)

  // ── Uploader breakdown ────────────────────────────────────────────────────
  const uploaderStats = useMemo(() => {
    const map = {}
    scoped.forEach(p => {
      const key = p.uploaded_by
      if (!map[key]) map[key] = { name: p.uploaded_by_name || p.uploaded_by, total: 0, approved: 0, flagged: 0 }
      map[key].total++
      if (['approved','published'].includes(p.approval_status)) map[key].approved++
      if (p.approval_status === 'flagged') map[key].flagged++
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [scoped])

  // ── Sample engagement totals (published only) ─────────────────────────────
  const engTotals = useMemo(() => published.reduce((acc, p) => {
    const e = mockEng(p.id)
    return {
      impressions: acc.impressions + e.impressions,
      reach:       acc.reach       + e.reach,
      engagement:  acc.engagement  + e.likes + e.comments + e.shares,
      clicks:      acc.clicks      + e.clicks,
    }
  }, { impressions: 0, reach: 0, engagement: 0, clicks: 0 }), [published])

  const engRate = published.length > 0 && engTotals.impressions > 0
    ? ((engTotals.engagement / engTotals.impressions) * 100).toFixed(1)
    : null

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Header + filters ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics</h1>
          <p className="text-sm text-slate-400 mt-0.5">Workflow performance across all dealerships</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date range */}
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
          {/* Dealership filter */}
          <select
            value={dealerFilter}
            onChange={e => setDealerFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:border-slate-400 bg-white"
          >
            <option value="all">All Dealerships</option>
            {DEALERSHIPS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── TIER 1: WORKFLOW KPIs (real data) ── */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <BarChart2 size={11} />Workflow — Live Data
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI
            icon={Upload}
            label="Posts Submitted"
            value={scoped.length}
            sub={`${pending.length} still pending`}
            color="bg-gradient-to-br from-indigo-500 to-indigo-700"
          />
          <KPI
            icon={CheckCircle}
            label="Approval Rate"
            value={approvalRate !== null ? `${approvalRate}%` : '—'}
            sub="Of decided posts"
            color="bg-gradient-to-br from-emerald-400 to-teal-600"
            badge={approvalRate !== null && approvalRate >= 80 ? 'Healthy' : null}
          />
          <KPI
            icon={Clock}
            label="Avg. Review Time"
            value={avgApprovalHrs !== null ? (avgApprovalHrs < 24 ? `${avgApprovalHrs}h` : `${Math.round(avgApprovalHrs/24)}d`) : '—'}
            sub="Submit → decision"
            color="bg-gradient-to-br from-amber-400 to-orange-500"
          />
          <KPI
            icon={AlertTriangle}
            label="Revision Rate"
            value={scoped.length > 0 ? `${Math.round((flagged.length / scoped.length) * 100)}%` : '—'}
            sub={`${flagged.length} flagged`}
            color="bg-gradient-to-br from-rose-400 to-pink-600"
          />
        </div>
      </div>

      {/* ── CONTENT VOLUME CHART ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <SectionHead
          title="Content Submission Volume"
          sub="Posts submitted per week — last 8 weeks"
          badge={<><BarChart2 size={10} className="mr-1" />Real data</>}
        />
        <div className="mt-5 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyVolume} barGap={2} barCategoryGap="30%">
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={24} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                labelStyle={{ fontWeight: 600, color: '#0f172a' }}
              />
              <Bar dataKey="submitted" name="Submitted" fill="#6366f1" radius={[4,4,0,0]} />
              <Bar dataKey="approved"  name="Approved"  fill="#34d399" radius={[4,4,0,0]} />
              <Bar dataKey="flagged"   name="Flagged"   fill="#fb923c" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {[['#6366f1','Submitted'],['#34d399','Approved'],['#fb923c','Flagged']].map(([color, label]) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── DEALERSHIP ACTIVITY + PLATFORM MIX ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Dealership activity table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <SectionHead title="Dealership Activity" sub="Content submitted per location" />
            {inactiveDealers.length > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                <AlertCircle size={11} />{inactiveDealers.length} inactive this week
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Dealership','This Week','Total','Published','Pending','Flagged'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {dealerActivity.map(d => (
                  <tr key={d.id} className={`hover:bg-slate-50/60 transition-colors ${d.thisWeek === 0 ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-800">{d.name}</p>
                      <p className="text-xs text-slate-400">{d.location}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold ${
                        d.thisWeek > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'
                      }`}>{d.thisWeek}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">{d.total}</td>
                    <td className="px-4 py-3">
                      {d.published > 0
                        ? <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{d.published}</span>
                        : <span className="text-xs text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {d.pending > 0
                        ? <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{d.pending}</span>
                        : <span className="text-xs text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {d.flagged > 0
                        ? <span className="text-xs font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full">{d.flagged}</span>
                        : <span className="text-xs text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Platform mix pie + uploaders */}
        <div className="flex flex-col gap-4">

          {/* Platform mix */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex-1">
            <SectionHead title="Platform Mix" sub="Posts by channel" />
            {platformMix.length > 0 ? (
              <>
                <div className="h-36 mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={platformMix}
                        cx="50%" cy="50%"
                        innerRadius={38} outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {platformMix.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                        formatter={(v, n) => [v + ' posts', n]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 mt-1">
                  {platformMix.map(p => (
                    <div key={p.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="text-slate-600">{p.name}</span>
                      </div>
                      <span className="font-semibold text-slate-700">{p.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 mt-4 text-center py-6">No posts in this range</p>
            )}
          </div>

          {/* Uploader breakdown */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <SectionHead title="By Uploader" />
            <div className="mt-3 space-y-2.5">
              {uploaderStats.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No submissions in this range</p>
              )}
              {uploaderStats.slice(0, 5).map(u => (
                <div key={u.name} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-indigo-700">{u.name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-medium text-slate-700 truncate">{u.name}</p>
                      <p className="text-xs text-slate-500 flex-shrink-0 ml-2">{u.total}</p>
                    </div>
                    <div className="flex h-1.5 rounded-full overflow-hidden gap-px bg-slate-100">
                      <div className="bg-emerald-400 rounded-l-full" style={{ width: `${Math.round((u.approved/u.total)*100)}%` }} />
                      <div className="bg-orange-400"               style={{ width: `${Math.round((u.flagged/u.total)*100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {uploaderStats.length > 0 && (
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                {[['#34d399','Approved'],['#fb923c','Flagged']].map(([c,l]) => (
                  <div key={l} className="flex items-center gap-1 text-[10px] text-slate-400">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />{l}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── TIER 2: SAMPLE ENGAGEMENT (platform APIs — coming soon) ── */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Zap size={11} />Platform Performance
          </p>
          <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
            <Info size={9} />Sample data — connect accounts to go live
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Est. Impressions', value: published.length ? fmt(engTotals.impressions) : '—', sub: 'Across all platforms' },
            { label: 'Est. Reach',       value: published.length ? fmt(engTotals.reach)       : '—', sub: 'Unique accounts' },
            { label: 'Avg. Eng. Rate',   value: engRate ? `${engRate}%`                        : '—', sub: 'Industry avg: 3.2%' },
            { label: 'Est. Link Clicks', value: published.length ? fmt(engTotals.clicks)       : '—', sub: 'From published posts' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm opacity-80">
              <p className="text-2xl font-bold text-slate-900">{c.value}</p>
              <p className="text-sm font-medium text-slate-600 mt-0.5">{c.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Connect CTA */}
        <div className="rounded-2xl border border-dashed border-slate-200 p-6 bg-slate-50/40 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex gap-2">
              {[['#1877F2','F'],['#E1306C','I'],['#010101','T'],['#0A66C2','L']].map(([c,l]) => (
                <div key={l} className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: c }}>{l}</div>
              ))}
            </div>
            <div>
              <p className="font-semibold text-slate-700 text-sm">Connect your platform accounts</p>
              <p className="text-xs text-slate-400 mt-0.5">Pull live impressions, reach, and engagement data into this dashboard</p>
            </div>
          </div>
          <Link
            to="/settings"
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap flex-shrink-0"
          >
            <Zap size={12} />Set up integrations
          </Link>
        </div>
      </div>

      {/* ── GA4 / TIER 3 PLACEHOLDER ── */}
      <div className="rounded-2xl border border-dashed border-slate-200 p-6 bg-white flex flex-col sm:flex-row items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0">
          <TrendingUp size={18} className="text-orange-500" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-700 text-sm">Google Analytics 4 — Website Impact</p>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-lg">
            Once your team is consistently adding UTM parameters to published posts, connect GA4 to see social-driven traffic, VDP views, and lead form completions per dealership — closing the loop from content to pipeline.
          </p>
          <p className="text-[10px] text-slate-300 mt-2">Planned for Phase 2 · Requires UTM discipline first</p>
        </div>
      </div>

    </div>
  )
}
