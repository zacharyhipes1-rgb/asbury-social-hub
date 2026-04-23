import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  CheckCircle, AlertTriangle, Trash2, Eye, Filter,
  Image, Video, Layout, Type, Calendar, Circle, Music, FileText, BookOpen, File
} from 'lucide-react'
import { usePosts } from '../../context/PostsContext'
import { useToast } from '../../context/ToastContext'
import { DEALERSHIPS } from '../../data/dealerships'
import { PLATFORMS, getPlatform, getContentType } from '../../data/platforms'
import { StatusBadge, PlatformBadge } from '../common/Badge'
import PostDetailModal from '../posts/PostDetailModal'
import NotificationModal from './NotificationModal'

const ICON_MAP = { Image, Video, Layout, Type, Calendar, Circle, Music, FileText, BookOpen, File }

const STATUS_FILTERS = [
  { value: 'all',      label: 'All'       },
  { value: 'pending',  label: 'Pending'   },
  { value: 'approved', label: 'Approved'  },
  { value: 'flagged',  label: 'Flagged'   },
  { value: 'deleted',  label: 'Deleted'   },
]

export default function AdminQueue() {
  const { posts, approvePost, flagPost, deletePost } = usePosts()
  const { addToast } = useToast()

  const [statusFilter, setStatusFilter] = useState('all')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [dealershipFilter, setDealershipFilter] = useState('all')

  const [viewPost, setViewPost] = useState(null)
  const [actionState, setActionState] = useState({ post: null, action: null })

  const filtered = posts.filter(p => {
    if (statusFilter !== 'all' && p.approval_status !== statusFilter) return false
    if (platformFilter !== 'all' && p.platform !== platformFilter) return false
    if (dealershipFilter !== 'all' && p.dealership_id !== dealershipFilter) return false
    return true
  }).sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))

  const pendingCount = posts.filter(p => p.approval_status === 'pending').length
  const approvedCount = posts.filter(p => p.approval_status === 'approved').length
  const flaggedCount = posts.filter(p => p.approval_status === 'flagged').length

  const handleAction = (post, action) => setActionState({ post, action })

  const handleConfirm = (notes) => {
    const { post, action } = actionState
    if (!post) return
    if (action === 'approve') {
      approvePost(post.id, notes)
      addToast(`Approved: ${getPlatform(post.platform)?.name} post for ${DEALERSHIPS.find(d => d.id === post.dealership_id)?.name}`, 'success')
    } else if (action === 'flag') {
      flagPost(post.id, notes)
      addToast(`Revision requested for ${post.uploaded_by_name}'s post.`, 'warning')
    } else if (action === 'delete') {
      deletePost(post.id)
      addToast(`Post removed from queue.`, 'error')
    }
  }

  const formatDate = (dateStr) => {
    try { return format(parseISO(dateStr), 'MMM d, yyyy') }
    catch { return dateStr || '—' }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending Review', count: pendingCount,  color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
          { label: 'Approved',       count: approvedCount, color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
          { label: 'Needs Revision', count: flaggedCount,  color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200'},
        ].map(stat => (
          <div key={stat.label} className={`rounded-xl border ${stat.border} ${stat.bg} px-5 py-4`}>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
            <p className="text-sm text-slate-600 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">Filter:</span>

          <div className="flex items-center gap-1 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === f.value
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:border-slate-400 bg-white"
            >
              <option value="all">All Platforms</option>
              {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select
              value={dealershipFilter}
              onChange={(e) => setDealershipFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:border-slate-400 bg-white"
            >
              <option value="all">All Dealerships</option>
              {DEALERSHIPS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <CheckCircle size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-500">No posts match your filters</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting the filters above</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Dealership', 'Platform', 'Content', 'Caption', 'Uploader', 'Scheduled', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(post => {
                  const dealership = DEALERSHIPS.find(d => d.id === post.dealership_id)
                  const platform = getPlatform(post.platform)
                  const ct = getContentType(post.platform, post.content_type)
                  const ContentIcon = ICON_MAP[ct?.icon] || File

                  return (
                    <tr key={post.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-900 whitespace-nowrap">{dealership?.name}</p>
                        <p className="text-xs text-slate-400">{dealership?.location}</p>
                      </td>
                      <td className="px-4 py-3">
                        <PlatformBadge platformId={post.platform} compact />
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap">
                          <ContentIcon size={12} />
                          {ct?.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="text-sm text-slate-700 truncate" title={post.caption}>
                          {post.caption?.slice(0, 60)}{post.caption?.length > 60 ? '...' : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-sm text-slate-700">{post.uploaded_by_name}</p>
                        <p className="text-xs text-slate-400">{post.uploaded_by}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {formatDate(post.scheduled_for)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={post.approval_status} compact />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewPost(post)}
                            title="View details"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          {post.approval_status !== 'approved' && post.approval_status !== 'deleted' && (
                            <button
                              onClick={() => handleAction(post, 'approve')}
                              title="Approve"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                            >
                              <CheckCircle size={15} />
                            </button>
                          )}
                          {post.approval_status !== 'flagged' && post.approval_status !== 'deleted' && (
                            <button
                              onClick={() => handleAction(post, 'flag')}
                              title="Request revision"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            >
                              <AlertTriangle size={15} />
                            </button>
                          )}
                          {post.approval_status !== 'deleted' && (
                            <button
                              onClick={() => handleAction(post, 'delete')}
                              title="Delete"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PostDetailModal
        post={viewPost}
        isOpen={!!viewPost}
        onClose={() => setViewPost(null)}
      />

      <NotificationModal
        post={actionState.post}
        action={actionState.action}
        isOpen={!!actionState.post}
        onClose={() => setActionState({ post: null, action: null })}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
