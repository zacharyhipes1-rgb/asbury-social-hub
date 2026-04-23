import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, isToday } from 'date-fns'
import {
  Upload, CalendarDays, ShieldCheck, TrendingUp, Clock,
  CheckCircle, AlertTriangle, Image, Video, Layout, Type,
  Calendar, Circle, Music, FileText, BookOpen, File, ArrowRight,
  Bell
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePosts } from '../context/PostsContext'
import { StatusBadge, PlatformBadge } from '../components/common/Badge'
import PostDetailModal from '../components/posts/PostDetailModal'
import { getPlatform, getContentType } from '../data/platforms'
import { DEALERSHIPS } from '../data/dealerships'

const ICON_MAP = { Image, Video, Layout, Type, Calendar, Circle, Music, FileText, BookOpen, File }

function StatCard({ label, value, color, bgGradient, icon: Icon, subtitle }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bgGradient}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className={`text-3xl font-bold tracking-tight ${color}`}>{value}</p>
      <p className="text-sm font-medium text-slate-700 mt-1">{label}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function PostRow({ post, onClick }) {
  const platform = getPlatform(post.platform)
  const ct = getContentType(post.platform, post.content_type)
  const ContentIcon = ICON_MAP[ct?.icon] || File
  const dealership = DEALERSHIPS.find((d) => d.id === post.dealership_id)

  return (
    <tr
      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 cursor-pointer transition-colors group"
      onClick={() => onClick(post)}
    >
      <td className="px-5 py-3.5">
        <p className="text-sm font-semibold text-slate-800">{dealership?.name}</p>
        <p className="text-xs text-slate-400 mt-0.5">{dealership?.location}</p>
      </td>
      <td className="px-5 py-3.5">
        <PlatformBadge platformId={post.platform} compact />
      </td>
      <td className="px-5 py-3.5">
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <ContentIcon size={11} />
          {ct?.name}
        </span>
      </td>
      <td className="px-5 py-3.5 max-w-[220px]">
        <p className="text-sm text-slate-600 truncate">
          {post.caption?.slice(0, 60)}{post.caption?.length > 60 ? '…' : ''}
        </p>
      </td>
      <td className="px-5 py-3.5">
        <p className="text-xs text-slate-500">{post.uploaded_by_name}</p>
        <p className="text-xs text-slate-400">{post.uploaded_at ? format(parseISO(post.uploaded_at), 'MMM d') : '—'}</p>
      </td>
      <td className="px-5 py-3.5 text-sm text-slate-500 whitespace-nowrap">
        {post.scheduled_for}
      </td>
      <td className="px-5 py-3.5">
        <StatusBadge status={post.approval_status} compact />
      </td>
    </tr>
  )
}

export default function DashboardPage() {
  const { currentUser, isAdmin, isSocialMedia } = useAuth()
  const { posts } = usePosts()
  const [selectedPost, setSelectedPost] = useState(null)

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const weekInterval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }

  const activePosts = posts.filter((p) => p.approval_status !== 'deleted')
  const pendingPosts = activePosts.filter((p) => p.approval_status === 'pending')
  const approvedPosts = activePosts.filter((p) => p.approval_status === 'approved')
  const thisWeekPosts = activePosts.filter((p) => {
    try { return isWithinInterval(parseISO(p.scheduled_for), weekInterval) } catch { return false }
  })
  const dueTodayPosts = approvedPosts.filter((p) => {
    try { return isToday(parseISO(p.scheduled_for)) } catch { return false }
  })
  const myPosts = activePosts.filter((p) => p.uploaded_by === currentUser?.email)
  const myFlagged = myPosts.filter((p) => p.approval_status === 'flagged')
  const recentPosts = [...activePosts]
    .sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))
    .slice(0, 8)

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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatCard
          label="Total Posts"
          value={activePosts.length}
          color="text-slate-900"
          bgGradient="bg-gradient-to-br from-slate-600 to-slate-800"
          icon={TrendingUp}
          subtitle="All dealerships"
        />
        <StatCard
          label="This Week"
          value={thisWeekPosts.length}
          color="text-indigo-700"
          bgGradient="bg-gradient-to-br from-indigo-500 to-indigo-700"
          icon={CalendarDays}
          subtitle="Scheduled content"
        />
        <StatCard
          label="Pending Approval"
          value={pendingPosts.length}
          color="text-amber-700"
          bgGradient="bg-gradient-to-br from-amber-400 to-orange-500"
          icon={Clock}
          subtitle={isAdmin ? 'Awaiting your review' : "Awaiting Chad's review"}
        />
        <StatCard
          label="Approved"
          value={approvedPosts.length}
          color="text-emerald-700"
          bgGradient="bg-gradient-to-br from-emerald-400 to-teal-600"
          icon={CheckCircle}
          subtitle="Ready to publish"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-7">
        {isSocialMedia && (
          <Link
            to="/upload"
            className="group flex items-center gap-4 p-5 rounded-2xl text-white transition-all hover:opacity-90 hover:shadow-xl"
            style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', boxShadow: '0 4px 20px rgba(99,102,241,0.25)' }}
          >
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <Upload size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Upload New Content</p>
              <p className="text-xs text-indigo-300 mt-0.5">Stage a post for review</p>
            </div>
            <ArrowRight size={15} className="text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
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
          <ArrowRight size={15} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
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
        <div className="flex items-start gap-3 p-4 mb-5 bg-indigo-50 border border-indigo-200 rounded-2xl">
          <Bell size={15} className="text-indigo-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-indigo-900">
              {dueTodayPosts.length} approved post{dueTodayPosts.length !== 1 ? 's' : ''} scheduled to publish today
            </p>
            <p className="text-xs text-indigo-700 mt-0.5">
              {dueTodayPosts.map((p) => {
                const d = DEALERSHIPS.find((x) => x.id === p.dealership_id)
                return d?.name
              }).filter(Boolean).join(', ')}
            </p>
          </div>
        </div>
      )}

      {isAdmin && pendingPosts.length > 0 && (
        <div className="flex items-start gap-3 p-4 mb-5 bg-amber-50 border border-amber-200 rounded-2xl">
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
        <div className="flex items-start gap-3 p-4 mb-5 bg-orange-50 border border-orange-200 rounded-2xl">
          <AlertTriangle size={15} className="text-orange-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-900">
              {myFlagged.length} post{myFlagged.length !== 1 ? 's' : ''} need{myFlagged.length === 1 ? 's' : ''} revision
            </p>
            <p className="text-xs text-orange-700 mt-0.5">Review the feedback and resubmit.</p>
          </div>
        </div>
      )}

      {/* Recent posts */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Recent Submissions</h2>
          <Link to="/calendar" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
            View calendar <ArrowRight size={13} />
          </Link>
        </div>
        {recentPosts.length === 0 ? (
          <div className="py-16 text-center">
            <Upload size={28} className="mx-auto text-slate-200 mb-3" />
            <p className="font-medium text-slate-400 text-sm">No content yet</p>
            {isSocialMedia && (
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
                  <PostRow key={post.id} post={post} onClick={setSelectedPost} />
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
