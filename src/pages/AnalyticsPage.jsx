import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO, subWeeks, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import {
  TrendingUp, Eye, Users, MousePointerClick, Heart,
  Zap, ArrowUpRight, BarChart2, Info, ExternalLink,
  Image, Video, Layout, Type, Calendar, Circle,
  Music, FileText, BookOpen, File
} from 'lucide-react'
import { usePosts } from '../context/PostsContext'
import { DEALERSHIPS } from '../data/dealerships'
import { getPlatform } from '../data/platforms'

const ICON_MAP = { Image, Video, Layout, Type, Calendar, Circle, Music, FileText, BookOpen, File }

// Seeded mock engagement per post id (deterministic so it doesn't flicker)
function mockEngagement(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0
  const abs = Math.abs(h)
  return {
    impressions: 800  + (abs % 12000),
    reach:       600  + (abs % 9000),
    likes:       30   + (abs % 800),
    comments:    2    + (abs % 60),
    shares:      1    + (abs % 40),
    clicks:      10   + (abs % 300),
  }
}

const PLATFORM_META = {
  instagram: { color: '#E1306C', bg: 'bg-pink-50',   border: 'border-pink-100',   text: 'text-pink-700',   label: 'Instagram', benchmarkEng: '3.8%' },
  facebook:  { color: '#1877F2', bg: 'bg-blue-50',   border: 'border-blue-100',   text: 'text-blue-700',   label: 'Facebook',  benchmarkEng: '1.2%' },
  tiktok:    { color: '#010101', bg: 'bg-slate-50',   border: 'border-slate-200',  text: 'text-slate-700',  label: 'TikTok',    benchmarkEng: '5.9%' },
  linkedin:  { color: '#0A66C2', bg: 'bg-sky-50',    border: 'border-sky-100',    text: 'text-sky-700',    label: 'LinkedIn',  benchmarkEng: '2.1%' },
}

function MetricCard({ icon: Icon, label, value, delta, color, note }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        {delta && (
          <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            <ArrowUpRight size={11} />{delta}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm font-medium text-slate-600 mt-0.5">{label}</p>
      {note && <p className="text-xs text-slate-400 mt-0.5">{note}</p>}
    </div>
  )
}

function WeeklyBar({ label, count, max, isActive }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      <span className="text-xs font-medium text-slate-500">{count}</span>
      <div className="w-full bg-slate-100 rounded-full overflow-hidden" style={{ height: 72 }}>
        <div
          className={`w-full rounded-full transition-all duration-500 ${isActive ? 'bg-indigo-500' : 'bg-indigo-200'}`}
          style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
        />
      </div>
      <span className={`text-[10px] font-medium ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>{label}</span>
    </div>
  )
}

export default function AnalyticsPage() {
  const { posts } = usePosts()

  const published = useMemo(() =>
    posts.filter(p => p.approval_status === 'published'),
    [posts]
  )

  const allActive = useMemo(() =>
    posts.filter(p => p.approval_status !== 'deleted'),
    [posts]
  )

  // Aggregate mock totals from all published posts
  const totals = useMemo(() => {
    return published.reduce((acc, p) => {
      const e = mockEngagement(p.id)
      acc.impressions += e.impressions
      acc.reach       += e.reach
      acc.likes       += e.likes
      acc.comments    += e.comments
      acc.shares      += e.shares
      acc.clicks      += e.clicks
      return acc
    }, { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, clicks: 0 })
  }, [published])

  const avgEngRate = published.length > 0
    ? (((totals.likes + totals.comments + totals.shares) / totals.impressions) * 100).toFixed(1)
    : '—'

  // Posts per platform
  const byPlatform = useMemo(() => {
    const map = {}
    published.forEach(p => {
      if (!map[p.platform]) map[p.platform] = { posts: 0, impressions: 0, engagement: 0 }
      const e = mockEngagement(p.id)
      map[p.platform].posts++
      map[p.platform].impressions += e.impressions
      map[p.platform].engagement  += e.likes + e.comments + e.shares
    })
    return map
  }, [published])

  // Last 6 weeks bar chart
  const now = new Date()
  const weekBars = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const weekOf = subWeeks(now, 5 - i)
      const interval = { start: startOfWeek(weekOf, { weekStartsOn: 1 }), end: endOfWeek(weekOf, { weekStartsOn: 1 }) }
      const count = allActive.filter(p => {
        try { return isWithinInterval(parseISO(p.scheduled_for), interval) } catch { return false }
      }).length
      return { label: format(startOfWeek(weekOf, { weekStartsOn: 1 }), 'M/d'), count, isCurrent: i === 5 }
    })
  }, [allActive])
  const maxWeekCount = Math.max(...weekBars.map(w => w.count), 1)

  // Dealership leaderboard
  const dealershipStats = useMemo(() => {
    return DEALERSHIPS.map(d => {
      const dPosts = published.filter(p => p.dealership_id === d.id)
      const eng = dPosts.reduce((sum, p) => {
        const e = mockEngagement(p.id)
        return sum + e.impressions
      }, 0)
      return { ...d, postCount: dPosts.length, impressions: eng }
    }).filter(d => d.postCount > 0).sort((a, b) => b.impressions - a.impressions)
  }, [published])

  // Top 5 posts by mock engagement
  const topPosts = useMemo(() => {
    return [...published]
      .map(p => ({ ...p, _eng: mockEngagement(p.id) }))
      .sort((a, b) => (b._eng.impressions + b._eng.likes) - (a._eng.impressions + a._eng.likes))
      .slice(0, 5)
  }, [published])

  const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics</h1>
          <p className="text-sm text-slate-400 mt-1">Performance overview across all dealerships and platforms</p>
        </div>
      </div>

      {/* Connect platforms banner */}
      <div className="flex items-start gap-4 p-5 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <Zap size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-indigo-900 text-sm">Platform integrations coming soon</p>
          <p className="text-xs text-indigo-700 mt-0.5 leading-relaxed">
            Connect Facebook, Instagram, TikTok, and LinkedIn to pull live impressions, reach, and engagement data directly into this dashboard.
            The layout below shows exactly what you'll see once connected — numbers are based on your published post history with sample engagement data.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 rounded-lg flex-shrink-0">
          <Info size={11} className="text-indigo-500" />
          <span className="text-xs font-medium text-indigo-700">Sample data</span>
        </div>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Eye}
          label="Total Impressions"
          value={published.length > 0 ? fmt(totals.impressions) : '—'}
          delta={published.length > 0 ? '+12%' : null}
          color="bg-gradient-to-br from-indigo-500 to-indigo-700"
          note="Across all platforms"
        />
        <MetricCard
          icon={Users}
          label="Total Reach"
          value={published.length > 0 ? fmt(totals.reach) : '—'}
          delta={published.length > 0 ? '+8%' : null}
          color="bg-gradient-to-br from-violet-500 to-purple-700"
          note="Unique accounts reached"
        />
        <MetricCard
          icon={Heart}
          label="Avg. Engagement Rate"
          value={published.length > 0 ? `${avgEngRate}%` : '—'}
          delta={published.length > 0 ? '+0.4%' : null}
          color="bg-gradient-to-br from-rose-400 to-pink-600"
          note="Likes + comments + shares / impressions"
        />
        <MetricCard
          icon={MousePointerClick}
          label="Total Link Clicks"
          value={published.length > 0 ? fmt(totals.clicks) : '—'}
          delta={published.length > 0 ? '+21%' : null}
          color="bg-gradient-to-br from-amber-400 to-orange-500"
          note="From published posts"
        />
      </div>

      {/* Chart + Platform breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Weekly post volume chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">Content Volume — Last 6 Weeks</h2>
              <p className="text-xs text-slate-400 mt-0.5">Posts scheduled per week</p>
            </div>
            <span className="text-xs text-slate-400 flex items-center gap-1"><BarChart2 size={12} />Real data</span>
          </div>
          {allActive.length > 0 ? (
            <div className="flex items-end gap-2 h-24">
              {weekBars.map((w, i) => (
                <WeeklyBar key={i} label={w.label} count={w.count} max={maxWeekCount} isActive={w.isCurrent} />
              ))}
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center">
              <p className="text-sm text-slate-400">No posts yet — start uploading content to see trends.</p>
            </div>
          )}
        </div>

        {/* Platform breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 text-sm mb-4">Platform Breakdown</h2>
          <div className="space-y-3">
            {['instagram', 'facebook', 'tiktok', 'linkedin'].map(pid => {
              const meta  = PLATFORM_META[pid]
              const stats = byPlatform[pid]
              return (
                <div key={pid} className={`flex items-center gap-3 p-3 rounded-xl ${meta.bg} border ${meta.border}`}>
                  <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: meta.color }} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${meta.text}`}>{meta.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {stats ? `${stats.posts} post${stats.posts !== 1 ? 's' : ''} · ${fmt(stats.impressions)} impressions` : 'No published posts yet'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-slate-700">{stats ? `${((stats.engagement / stats.impressions) * 100).toFixed(1)}%` : '—'}</p>
                    <p className="text-[10px] text-slate-400">eng. rate</p>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1">
            <Info size={10} />Benchmark engagement rates: {Object.values(PLATFORM_META).map(m => `${m.label} ${m.benchmarkEng}`).join(' · ')}
          </p>
        </div>
      </div>

      {/* Top posts + Dealership leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Top performing posts */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 text-sm">Top Performing Posts</h2>
            <span className="text-xs text-slate-400 flex items-center gap-1"><Info size={11} />Sample engagement data</span>
          </div>
          {topPosts.length === 0 ? (
            <div className="py-12 text-center">
              <TrendingUp size={28} className="mx-auto text-slate-200 mb-3" />
              <p className="text-sm text-slate-400 font-medium">No published posts yet</p>
              <p className="text-xs text-slate-300 mt-1">Mark posts as Published in the Approval Queue to see them here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-50 bg-slate-50/60">
                    {['Post', 'Platform', 'Impr.', 'Reach', 'Eng. Rate', 'Clicks'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topPosts.map(post => {
                    const platform = getPlatform(post.platform)
                    const e = post._eng
                    const engRate = ((e.likes + e.comments + e.shares) / e.impressions * 100).toFixed(1)
                    const dealership = DEALERSHIPS.find(d => d.id === post.dealership_id)
                    return (
                      <tr key={post.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 max-w-[180px]">
                          <p className="text-xs font-medium text-slate-800 truncate">{dealership?.name}</p>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{post.caption?.slice(0, 45)}…</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2 py-0.5 text-white"
                            style={{ backgroundColor: platform?.color }}>
                            {platform?.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">{fmt(e.impressions)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{fmt(e.reach)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold ${parseFloat(engRate) >= 3 ? 'text-emerald-600' : 'text-slate-600'}`}>
                            {engRate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{fmt(e.clicks)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Dealership leaderboard */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 text-sm mb-4">Dealership Leaderboard</h2>
          {dealershipStats.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400">No published posts yet.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {dealershipStats.slice(0, 8).map((d, i) => (
                <div key={d.id} className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-100 text-slate-600' : i === 2 ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-400'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{d.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-400 rounded-full"
                          style={{ width: `${Math.round((d.impressions / dealershipStats[0].impressions) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">{fmt(d.impressions)}</span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">{d.postCount}p</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-slate-400 mt-4 flex items-center gap-1">
            <Info size={10} />Ranked by sample impressions
          </p>
        </div>
      </div>

      {/* Integration CTA */}
      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center bg-slate-50/50">
        <ExternalLink size={24} className="mx-auto text-slate-300 mb-3" />
        <p className="font-semibold text-slate-700 text-sm">Ready to connect your platforms?</p>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          When Facebook, Instagram, TikTok, and LinkedIn integrations go live, all the data above will update automatically in real time — no extra setup required.
        </p>
        <Link to="/settings" className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 bg-white px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors">
          <Zap size={12} />Go to Settings
        </Link>
      </div>

    </div>
  )
}
