import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, isToday, differenceInHours } from 'date-fns'
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

function StatCard({ label, value, color, bgGradient, icon: Icon, subtitle, to }) {
  const inner = (
    <div className={`bg-white rounded-2xl border border-slate-100 p-5 shadow-sm transition-all ${to ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer group' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bgGradient}`}>
          <Icon size={18} className="text-white" />
        </div>
        {to && <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />}
      </div>
      <p className={`text-3xl font-bold tracking-tight ${color}`}>{value}</p>
      <p className="text-sm font-medium text-slate-700 mt-1">{label}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

function PostRow({ post, onClick, onEdit, isSocialMedia, currentUser }) {
  const { getUserByEmail } = useUsers()
  const platform    = getPlatform(post.platform)
  const ct          = getContentType(post.platform, post.content_type)
  const ContentIcon = ICON_MAP[ct?.icon] || File
  const dealership  = DEALERSHIPS.find((d) => d.id === post.dealership_id)
  const uploaderName = getUserByEmail(post.uploaded_by)?.name || post.uploaded_by_name
  const canEdit = isSocialMedia && post.approval_status === 'flagged' && post.uploaded_by === currentUser?.email

  return (
    <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors group">
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
        <p className="text-xs text-slate-500">{uploaderName}</p>
        <p className="text-xs text-slate-400">{post.uploaded_at ? format(parseISO(post.uploaded_at), 'MMM d') : '—'}</p>
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

export default function DashboardPage() {
  const { currentUser, isAdmin, isSocialMedia } = useAuth()
  const { posts } = usePosts()
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

  // Dealerships with no posts this week
  const dealershipsWithPosts = new Set(thisWeekPosts.map(p => p.dealership_id))
  const inactiveDealerships = DEALERSHIPS.filter(d => !dealershipsWithPosts.has(d.id))

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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {greeting}, {firstName}
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          {format(now, 'EEEE, MMMM d, yyyy')} · {currentUser?.title}
        </p>
      </div>

      {/* Upload CTA hero — primary action for social media users */}
      {isSocialMedia && (
        <Link
          to="/upload"
          className="group flex items-center gap-5 p-6 rounded-2xl text-white mb-6 transition-all hover:opacity-95 hover:shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 60%, #6366f1 100%)', boxShadow: '0 8px 32px rgba(99,102,241,0.30)' }}
        >
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-colors">
            <Upload size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg leading-tight">Upload New Content</p>
            <p className="text-sm text-indigo-200 mt-0.5">Submit a post for team review — takes less than 2 minutes</p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2 bg-white/15 px-4 py-2.5 rounded-xl group-hover:bg-white/25 transition-colors">
            <span className="text-sm font-semibold">Get started</span>
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatCard
          label="This Week"
          value={thisWeekPosts.length}
          color="text-indigo-700"
          bgGradient="bg-gradient-to-br from-indigo-500 to-indigo-700"
          icon={CalendarDays}
          subtitle="Scheduled content"
          to="/calendar"
        />
        <StatCard
          label="Pending Approval"
          value={pendingPosts.length}
          color="text-amber-700"
          bgGradient="bg-gradient-to-br from-amber-400 to-orange-500"
          icon={Clock}
          subtitle={isAdmin ? 'Awaiting your review' : "Awaiting Chad's review"}
          to={isAdmin ? '/admin?status=pending' : undefined}
        />
        <StatCard
          label="Approval Rate"
          value={approvalRate !== null ? `${approvalRate}%` : '—'}
          color="text-emerald-700"
          bgGradient="bg-gradient-to-br from-emerald-400 to-teal-600"
          icon={BarChart2}
          subtitle="Of reviewed submissions"
          to="/analytics"
        />
        <StatCard
          label="Avg. Review Time"
          value={avgApprovalHours !== null ? (avgApprovalHours < 24 ? `${avgApprovalHours}h` : `${Math.round(avgApprovalHours/24)}d`) : '—'}
          color="text-slate-900"
          bgGradient="bg-gradient-to-br from-slate-600 to-slate-800"
          icon={TrendingUp}
          subtitle="From submit to decision"
          to="/analytics"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7">
        <Link
          to="/calendar"
          className="group flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-200 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <CalendarDays size={18} className="text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-slate-900">Content Calendar</p>
            <p className="text-xs text-slate-400 mt-0.5">View week-by-week schedule</p>
          </div>
          <ArrowRight size={15} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
        </Link>
        {isAdmin && (
          <Link
            to="/admin"
            className="group flex items-center gap-4 p-5 bg-amber-50 border border-amber-100 rounded-2xl hover:border-amber-200 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={18} className="text-amber-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-amber-900">Approval Queue</p>
              <p className="text-xs text-amber-600 mt-0.5">
                {pendingPosts.length > 0 ? `${pendingPosts.length} need${pendingPosts.length === 1 ? 's' : ''} review` : 'All clear'}
              </p>
            </div>
            <ArrowRight size={15} className="text-amber-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
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

      {isAdmin && pendingPosts.length > 0 && (
        <div className="flex items-start gap-3 p-4 mb-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">
              {pendingPosts.length} post{pendingPosts.length !== 1 ? 's' : ''} awaiting your review
            </p>
            <p className="text-sm text-amber-700 mt-0.5">
              Head to the{' '}
              <Link to="/admin" className="underline font-medium hover:text-amber-900">Approval Queue</Link>
              {' '}to approve, flag, or remove pending submissions.
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

      {/* Inactive dealerships alert — admin only */}
      {isAdmin && inactiveDealerships.length > 0 && (
        <div className="flex items-start gap-3 p-4 mb-4 bg-slate-50 border border-slate-200 rounded-2xl">
          <AlertCircle size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-700">
              {inactiveDealerships.length} dealership{inactiveDealerships.length !== 1 ? 's' : ''} with no content scheduled this week
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {inactiveDealerships.slice(0, 5).map(d => d.name).join(', ')}{inactiveDealerships.length > 5 ? ` +${inactiveDealerships.length - 5} more` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Recent posts */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 gap-3">
          <h2 className="font-semibold text-slate-900 flex-shrink-0">Recent Submissions</h2>
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by dealership, caption…"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white"
            />
          </div>
          <Link to="/calendar" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 flex-shrink-0">
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
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
        )}
      </div>

      <PostDetailModal post={selectedPost} isOpen={!!selectedPost} onClose={() => setSelectedPost(null)} />
    </div>
  )
}
