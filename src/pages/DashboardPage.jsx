import { useState, useMemo, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, isToday, differenceInHours, formatDistanceToNow } from 'date-fns'
import {
  Upload, CalendarDays, ShieldCheck, TrendingUp, Clock,
  CheckCircle, AlertTriangle, Image, Video, Layout, Type,
  Calendar, Circle, Music, FileText, BookOpen, File, ArrowRight,
  Bell, Search, Edit, BarChart2, AlertCircle
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePosts } from '../context/PostsContext'
import { useUsers } from '../context/UsersContext'
import { StatusBadge, PlatformBadge } from '../components/common/Badge'
import PostDetailModal from '../components/posts/PostDetailModal'
import { getPlatform, getContentType } from '../data/platforms'
import { DEALERSHIPS } from '../data/dealerships'

const ICON_MAP = { Image, Video, Layout, Type, Calendar, Circle, Music, FileText, BookOpen, File }

function useCountUp(target, duration = 600) {
  const [value, setValue] = useState(0)
  const raf = useRef(null)

  useEffect(() => {
    if (target === 0) { setValue(0); return }
    const start = performance.now()
    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setValue(Math.round(eased * target))
      if (progress < 1) raf.current = requestAnimationFrame(animate)
    }
    raf.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])

  return value
}

function StatCard({ label, value, color, bgGradient, icon: Icon, subtitle, to, benchmarkLabel, benchmarkColor }) {
  const inner = (
    <div className={`card-hover bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-sm transition-all ${to ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer group' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bgGradient}`}>
          <Icon size={16} className="text-white" />
        </div>
        {to && <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />}
      </div>
      <p className={`text-2xl sm:text-3xl font-bold tracking-tight ${color}`}>{value}</p>
      <p className="text-xs sm:text-sm font-medium text-slate-700 mt-1">{label}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">{subtitle}</p>}
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
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

function PostRow({ post, onClick, onEdit, isSocialMedia, currentUser }) {
  const { getUserByEmail } = useUsers()
  const ct          = getContentType(post.platform, post.content_type)
  const ContentIcon = ICON_MAP[ct?.icon] || File
  const dealership  = DEALERSHIPS.find((d) => d.id === post.dealership_id)
  const uploaderName = getUserByEmail(post.uploaded_by)?.name || post.uploaded_by_name
  const canEdit = isSocialMedia && post.approval_status === 'flagged' && post.uploaded_by === currentUser?.email

  return (
    <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors group">
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
      <td className="px-5 py-3.5 cursor-pointer" onClick={() => onClick(post)}>
        <PlatformBadge platformId={post.platform} compact />
      </td>
      <td className="px-5 py-3.5 cursor-pointer" onClick={() => onClick(post)}>
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <ContentIcon size={11} />
          {ct?.name}
        </span>
      </td>
      <td className="px-5 py-3.5 max-w-[220px] cursor-pointer" onClick={() => onClick(post)}>
        <p className="text-sm text-slate-600 truncate">
          {post.caption?.slice(0, 60)}{post.caption?.length > 60 ? '…' : ''}
        </p>
      </td>
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
      <td className="px-5 py-3.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer" onClick={() => onClick(post)}>
        {post.scheduled_for}
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <StatusBadge status={post.approval_status} compact />
          {canEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(post) }}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <Edit size={10} /> Revise
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

function PostCard({ post, onClick, onEdit, isSocialMedia, currentUser }) {
  const { getUserByEmail } = useUsers()
  const ct          = getContentType(post.platform, post.content_type)
  const ContentIcon = ICON_MAP[ct?.icon] || File
  const dealership  = DEALERSHIPS.find((d) => d.id === post.dealership_id)
  const uploaderName = getUserByEmail(post.uploaded_by)?.name || post.uploaded_by_name
  const canEdit = isSocialMedia && post.approval_status === 'flagged' && post.uploaded_by === currentUser?.email

  return (
    <div
      onClick={() => onClick(post)}
      className="px-4 py-3.5 border-b border-slate-50 last:border-0 active:bg-slate-50 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 truncate">{dealership?.name}</p>
          <p className="text-xs text-slate-400 truncate">{dealership?.location}</p>
        </div>
        <StatusBadge status={post.approval_status} compact />
      </div>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <PlatformBadge platformId={post.platform} compact />
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
          <ContentIcon size={11} />
          {ct?.name}
        </span>
      </div>
      {post.caption && (
        <p className="text-sm text-slate-600 line-clamp-2 mb-2">{post.caption}</p>
      )}
      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
        <span className="truncate">{uploaderName}</span>
        <span className="flex-shrink-0">
          {post.uploaded_at
            ? formatDistanceToNow(parseISO(post.uploaded_at), { addSuffix: true })
            : post.scheduled_for || '—'}
        </span>
      </div>
      {canEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(post) }}
          className="mt-3 w-full inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors min-h-[40px]"
        >
          <Edit size={11} /> Revise this post
        </button>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { currentUser, isAdmin, isSocialMedia } = useAuth()
  const { posts } = usePosts()
  const { getAdmins } = useUsers()
  const navigate = useNavigate()
  const [selectedPost, setSelectedPost] = useState(null)
  const [search, setSearch] = useState('')

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const weekInterval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }

  const activePosts  = posts.filter((p) => p.approval_status !== 'deleted')
  const pendingPosts = activePosts.filter((p) => p.approval_status === 'pending')
  const approvedPosts = activePosts.filter((p) => p.approval_status === 'approved')
  const thisWeekPosts = activePosts.filter((p) => {
    try { return isWithinInterval(parseISO(p.scheduled_for), weekInterval) } catch { return false }
  })
  const dueTodayPosts = approvedPosts.filter((p) => {
    try { return isToday(parseISO(p.scheduled_for)) } catch { return false }
  })
  const myPosts   = activePosts.filter((p) => p.uploaded_by === currentUser?.email)
  const myFlagged = myPosts.filter((p) => p.approval_status === 'flagged')

  // Approval rate
  const decidedPosts = activePosts.filter(p => ['approved','flagged','published'].includes(p.approval_status))
  const approvalRate = decidedPosts.length > 0
    ? Math.round((activePosts.filter(p => p.approval_status === 'approved' || p.approval_status === 'published').length / decidedPosts.length) * 100)
    : null

  // Avg hours to approval
  const avgApprovalHours = useMemo(() => {
    const resolved = activePosts.filter(p => p.chad_action_at && p.uploaded_at)
    if (!resolved.length) return null
    const total = resolved.reduce((sum, p) => {
      return sum + differenceInHours(parseISO(p.chad_action_at), parseISO(p.uploaded_at))
    }, 0)
    return Math.round(total / resolved.length)
  }, [activePosts])

  const reviewBenchmark = avgApprovalHours === null ? null :
    avgApprovalHours <= 12 ? { label: 'On target', color: 'green' } :
    avgApprovalHours <= 24 ? { label: 'Monitor', color: 'amber' } :
    { label: 'Needs attention', color: 'red' }

  // Dealerships with no posts this week
  const dealershipsWithPosts = new Set(thisWeekPosts.map(p => p.dealership_id))
  const inactiveDealerships = DEALERSHIPS.filter(d => !dealershipsWithPosts.has(d.id))

  const dealershipHealth = DEALERSHIPS.map(d => {
    const recentPosts = activePosts.filter(p =>
      p.dealership_id === d.id &&
      isWithinInterval(
        (() => { try { return parseISO(p.uploaded_at) } catch { return new Date(0) } })(),
        weekInterval
      )
    )
    const status =
      recentPosts.length === 0                                            ? 'inactive' :
      recentPosts.some(p => p.approval_status === 'flagged')             ? 'flagged'  :
      recentPosts.some(p => p.approval_status === 'pending')             ? 'pending'  :
      'active'
    return { ...d, recentCount: recentPosts.length, status }
  })

  // Search filter
  const recentPosts = useMemo(() => {
    const sorted = [...activePosts].sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))
    if (!search.trim()) return sorted.slice(0, 10)
    const q = search.toLowerCase()
    return sorted.filter(p => {
      const d = DEALERSHIPS.find(x => x.id === p.dealership_id)
      return (
        d?.name.toLowerCase().includes(q) ||
        p.caption?.toLowerCase().includes(q) ||
        p.platform?.toLowerCase().includes(q) ||
        p.uploaded_by_name?.toLowerCase().includes(q)
      )
    }).slice(0, 20)
  }, [activePosts, search])

  const firstName = currentUser?.name?.split(' ')[0] || 'there'

  const animatedWeek    = useCountUp(thisWeekPosts.length)
  const animatedPending = useCountUp(pendingPosts.length)
  const animatedRate    = useCountUp(approvalRate ?? 0)
  const animatedHours   = useCountUp(avgApprovalHours ?? 0)

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {greeting}, {firstName}
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          {format(now, 'EEEE, MMMM d, yyyy')} · {currentUser?.title}
        </p>
      </div>

      {/* Upload CTA hero — primary action for social media users (not admins) */}
      {isSocialMedia && !isAdmin && (
        <Link
          to="/upload"
          className="group flex items-center gap-3 sm:gap-5 p-4 sm:p-6 rounded-2xl text-white mb-6 transition-all hover:opacity-95 hover:shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 60%, #6366f1 100%)', boxShadow: '0 8px 32px rgba(99,102,241,0.30)' }}
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-colors">
            <Upload size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base sm:text-lg leading-tight">Upload New Content</p>
            <p className="text-xs sm:text-sm text-indigo-200 mt-0.5">Submit a post for team review — less than 2 minutes</p>
          </div>
          <div className="hidden sm:flex flex-shrink-0 items-center gap-2 bg-white/15 px-4 py-2.5 rounded-xl group-hover:bg-white/25 transition-colors">
            <span className="text-sm font-semibold">Get started</span>
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      )}

      {/* Approval Queue hero — primary action for admins */}
      {isAdmin && (
        <Link
          to="/admin"
          className="group flex items-center gap-3 sm:gap-5 p-4 sm:p-6 rounded-2xl text-white mb-6 transition-all hover:opacity-95 hover:shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #1c1917 0%, #78350f 60%, #d97706 100%)', boxShadow: '0 8px 32px rgba(217,119,6,0.25)' }}
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-colors">
            <ShieldCheck size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base sm:text-lg leading-tight">
              {pendingPosts.length > 0
                ? `${pendingPosts.length} post${pendingPosts.length !== 1 ? 's' : ''} awaiting your review`
                : 'Approval Queue'}
            </p>
            <p className="text-xs sm:text-sm text-amber-200 mt-0.5">
              {pendingPosts.length > 0
                ? 'Approve, flag, or remove pending submissions'
                : 'All clear — no pending submissions right now'}
            </p>
          </div>
          <div className="hidden sm:flex flex-shrink-0 items-center gap-2 bg-white/15 px-4 py-2.5 rounded-xl group-hover:bg-white/25 transition-colors">
            <span className="text-sm font-semibold">Review now</span>
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-7">
        <StatCard
          label="This Week"
          value={animatedWeek}
          color="text-indigo-700"
          bgGradient="bg-gradient-to-br from-indigo-500 to-indigo-700"
          icon={CalendarDays}
          subtitle="Scheduled content"
          to="/calendar"
        />
        <StatCard
          label="Pending Approval"
          value={animatedPending}
          color="text-amber-700"
          bgGradient="bg-gradient-to-br from-amber-400 to-orange-500"
          icon={Clock}
          subtitle={isAdmin ? 'Awaiting your review' : `Awaiting ${getAdmins()[0]?.name?.split(' ')[0] || 'manager'}'s review`}
          to={isAdmin ? '/admin?status=pending' : undefined}
        />
        <StatCard
          label="Approval Rate"
          value={approvalRate !== null ? `${animatedRate}%` : '—'}
          color="text-emerald-700"
          bgGradient="bg-gradient-to-br from-emerald-400 to-teal-600"
          icon={BarChart2}
          subtitle="Of reviewed submissions"
          to="/analytics"
        />
        <StatCard
          label="Avg. Review Time"
          value={avgApprovalHours !== null ? (avgApprovalHours < 24 ? `${animatedHours}h` : `${Math.round(animatedHours/24)}d`) : '—'}
          color="text-slate-900"
          bgGradient="bg-gradient-to-br from-slate-600 to-slate-800"
          icon={TrendingUp}
          subtitle="From submit to decision · Target: < 12h"
          to="/admin"
          benchmarkLabel={reviewBenchmark?.label}
          benchmarkColor={reviewBenchmark?.color}
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-7">
        <Link
          to="/calendar"
          className="group flex flex-col sm:flex-row items-center gap-2 sm:gap-4 p-3 sm:p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-200 transition-all text-center sm:text-left"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <CalendarDays size={17} className="text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs sm:text-sm text-slate-900 leading-tight">Calendar</p>
            <p className="hidden sm:block text-xs text-slate-400 mt-0.5">View week-by-week schedule</p>
          </div>
        </Link>
        {isAdmin ? (
          <Link
            to="/admin"
            className="group flex flex-col sm:flex-row items-center gap-2 sm:gap-4 p-3 sm:p-5 bg-amber-50 border border-amber-100 rounded-2xl hover:border-amber-200 hover:shadow-md transition-all text-center sm:text-left"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={17} className="text-amber-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs sm:text-sm text-amber-900 leading-tight">Queue</p>
              <p className="hidden sm:block text-xs text-amber-600 mt-0.5">
                {pendingPosts.length > 0 ? `${pendingPosts.length} need${pendingPosts.length === 1 ? 's' : ''} review` : 'All clear'}
              </p>
            </div>
          </Link>
        ) : (
          <Link
            to="/upload"
            className="group flex flex-col sm:flex-row items-center gap-2 sm:gap-4 p-3 sm:p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-200 transition-all text-center sm:text-left"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
              <Upload size={17} className="text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs sm:text-sm text-slate-900 leading-tight">Upload</p>
              <p className="hidden sm:block text-xs text-slate-400 mt-0.5">Submit a new post for review</p>
            </div>
          </Link>
        )}
        <Link
          to="/analytics"
          className="group flex flex-col sm:flex-row items-center gap-2 sm:gap-4 p-3 sm:p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-200 transition-all text-center sm:text-left"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <BarChart2 size={17} className="text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs sm:text-sm text-slate-900 leading-tight">Analytics</p>
            <p className="hidden sm:block text-xs text-slate-400 mt-0.5">Performance & engagement overview</p>
          </div>
        </Link>
      </div>

      {/* Alert banners */}
      {dueTodayPosts.length > 0 && (
        <div className="flex items-start gap-3 p-4 mb-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
          <Bell size={15} className="text-indigo-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-indigo-900">
              {dueTodayPosts.length} approved post{dueTodayPosts.length !== 1 ? 's' : ''} scheduled to publish today
            </p>
            <p className="text-xs text-indigo-700 mt-0.5">
              {dueTodayPosts.map((p) => DEALERSHIPS.find((x) => x.id === p.dealership_id)?.name).filter(Boolean).join(', ')}
            </p>
          </div>
        </div>
      )}


      {myFlagged.length > 0 && !isAdmin && (
        <div className="flex items-start gap-3 p-4 mb-4 bg-orange-50 border border-orange-200 rounded-2xl">
          <AlertTriangle size={15} className="text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-900">
              {myFlagged.length} post{myFlagged.length !== 1 ? 's' : ''} need{myFlagged.length === 1 ? 's' : ''} revision
            </p>
            <p className="text-xs text-orange-700 mt-0.5">
              Review the feedback and click <strong>Revise</strong> in the table below to edit and resubmit.
            </p>
          </div>
        </div>
      )}

      {/* Dealership health cards — admin only */}
      {isAdmin && (
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
      )}

      {/* Recent posts */}
      <div className="card-hover bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 gap-2 sm:gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900 flex-shrink-0">Recent Submissions</h2>
            <Link to="/calendar" className="sm:hidden text-sm text-indigo-600 font-medium flex items-center gap-1">
              Calendar <ArrowRight size={13} />
            </Link>
          </div>
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by dealership, caption…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white"
            />
          </div>
          <Link to="/calendar" className="hidden sm:flex text-sm text-indigo-600 hover:text-indigo-700 font-medium items-center gap-1 flex-shrink-0">
            View calendar <ArrowRight size={13} />
          </Link>
        </div>
        {recentPosts.length === 0 ? (
          <div className="py-16 text-center">
            <Upload size={28} className="mx-auto text-slate-200 mb-3" />
            <p className="font-medium text-slate-400 text-sm">{search ? 'No posts match your search' : 'No content yet'}</p>
            {isSocialMedia && !search && (
              <Link to="/upload" className="mt-3 inline-flex items-center gap-1.5 text-sm text-indigo-600 font-medium">
                Upload your first post <ArrowRight size={13} />
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <div className="lg:hidden">
              {recentPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={setSelectedPost}
                  onEdit={(p) => navigate(`/upload?edit=${p.id}`)}
                  isSocialMedia={isSocialMedia}
                  currentUser={currentUser}
                />
              ))}
            </div>
            {/* Desktop: table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-5 py-3 w-12" />
                    {['Dealership', 'Platform', 'Type', 'Caption', 'Uploaded by', 'Scheduled', 'Status'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentPosts.map((post) => (
                    <PostRow
                      key={post.id}
                      post={post}
                      onClick={setSelectedPost}
                      onEdit={(p) => navigate(`/upload?edit=${p.id}`)}
                      isSocialMedia={isSocialMedia}
                      currentUser={currentUser}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <PostDetailModal post={selectedPost} isOpen={!!selectedPost} onClose={() => setSelectedPost(null)} />
    </div>
  )
}
