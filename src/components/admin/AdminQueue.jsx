import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  CheckCircle, AlertTriangle, Trash2, Eye, Filter, Send,
  Image, Video, Layout, Type, Calendar, Circle, Music,
  FileText, BookOpen, File, Search, Copy, X
} from 'lucide-react'
import { usePosts } from '../../context/PostsContext'
import { useToast } from '../../context/ToastContext'
import { useUsers } from '../../context/UsersContext'
import { DEALERSHIPS } from '../../data/dealerships'
import { PLATFORMS, getPlatform, getContentType } from '../../data/platforms'
import { StatusBadge, PlatformBadge } from '../common/Badge'
import PostDetailModal from '../posts/PostDetailModal'
import NotificationModal from './NotificationModal'

const ICON_MAP = { Image, Video, Layout, Type, Calendar, Circle, Music, FileText, BookOpen, File }

const STATUS_FILTERS = [
  { value: 'all',       label: 'All'       },
  { value: 'pending',   label: 'Pending'   },
  { value: 'approved',  label: 'Approved'  },
  { value: 'flagged',   label: 'Flagged'   },
  { value: 'published', label: 'Published' },
  { value: 'deleted',   label: 'Deleted'   },
]

function CloneModal({ post, onClose, onClone }) {
  const [targetId, setTargetId] = useState('')
  const others = DEALERSHIPS.filter(d => d.id !== post.dealership_id)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Clone to Another Dealership</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700"><X size={16} /></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Creates a copy of this post for a different dealership. Caption, hashtags, and media carry over. Status resets to Pending.
        </p>
        <select
          value={targetId}
          onChange={e => setTargetId(e.target.value)}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-slate-400 bg-white mb-4"
        >
          <option value="">Select dealership…</option>
          {others.map(d => <option key={d.id} value={d.id}>{d.name} — {d.location}</option>)}
        </select>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Cancel</button>
          <button
            disabled={!targetId}
            onClick={() => onClone(targetId)}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clone Post
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminQueue() {
  const { posts, approvePost, flagPost, deletePost, publishPost, addPost } = usePosts()
  const { addToast } = useToast()
  const { getUserByEmail } = useUsers()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [statusFilter, setStatusFilter]       = useState(() => searchParams.get('status') || 'all')
  const [platformFilter, setPlatformFilter]   = useState('all')
  const [dealershipFilter, setDealershipFilter] = useState('all')
  const [search, setSearch]                   = useState('')

  const [viewPost, setViewPost]       = useState(null)
  const [actionState, setActionState] = useState({ post: null, action: null })
  const [clonePost, setClonePost]     = useState(null)

  const filtered = posts.filter(p => {
    if (statusFilter !== 'all' && p.approval_status !== statusFilter) return false
    if (platformFilter !== 'all' && p.platform !== platformFilter) return false
    if (dealershipFilter !== 'all' && p.dealership_id !== dealershipFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const d = DEALERSHIPS.find(x => x.id === p.dealership_id)
      const name = getUserByEmail(p.uploaded_by)?.name || p.uploaded_by_name || ''
      if (!d?.name.toLowerCase().includes(q) && !p.caption?.toLowerCase().includes(q) && !name.toLowerCase().includes(q)) return false
    }
    return true
  }).sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))

  const pendingCount   = posts.filter(p => p.approval_status === 'pending').length
  const approvedCount  = posts.filter(p => p.approval_status === 'approved').length
  const flaggedCount   = posts.filter(p => p.approval_status === 'flagged').length
  const publishedCount = posts.filter(p => p.approval_status === 'published').length

  const handleAction = (post, action) => setActionState({ post, action })

  const handleConfirm = (notes) => {
    const { post, action } = actionState
    if (!post) return
    const dealershipName = DEALERSHIPS.find(d => d.id === post.dealership_id)?.name
    const uploaderName = getUserByEmail(post.uploaded_by)?.name || post.uploaded_by_name
    if (action === 'approve') {
      approvePost(post.id, notes)
      addToast(`Approved: ${getPlatform(post.platform)?.name} post for ${dealershipName}`, 'success')
    } else if (action === 'flag') {
      flagPost(post.id, notes)
      addToast(`Revision requested for ${uploaderName}'s post.`, 'warning')
    } else if (action === 'delete') {
      deletePost(post.id)
      addToast(`Post removed from queue.`, 'error')
    }
  }

  const handlePublish = (post) => {
    publishPost(post.id)
    addToast(`Marked as published: ${getPlatform(post.platform)?.name} · ${DEALERSHIPS.find(d => d.id === post.dealership_id)?.name}`, 'success')
  }

  const handleClone = (targetDealershipId) => {
    const { dealership_id, approval_status, chad_notes, chad_action_at, uploaded_at, id, ...rest } = clonePost
    addPost({ ...rest, dealership_id: targetDealershipId })
    const targetName = DEALERSHIPS.find(d => d.id === targetDealershipId)?.name
    addToast(`Cloned to ${targetName} — ready for review.`, 'success')
    setClonePost(null)
  }

  const formatDate = (dateStr) => {
    try { return format(parseISO(dateStr), 'MMM d, yyyy') }
    catch { return dateStr || '—' }
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Pending Review', count: pendingCount,   color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-200' },
          { label: 'Approved',       count: approvedCount,  color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-200' },
          { label: 'Needs Revision', count: flaggedCount,   color: 'text-orange-600', bg: 'bg-orange-50',  border: 'border-orange-200' },
          { label: 'Published',      count: publishedCount, color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200' },
        ].map(stat => (
          <div key={stat.label} className={`rounded-2xl border ${stat.border} ${stat.bg} px-5 py-5 sm:px-6 sm:py-6`}>
            <p className={`text-3xl sm:text-4xl font-bold tracking-tight ${stat.color}`}>{stat.count}</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 mb-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1 flex-wrap">
            <Filter size={13} className="text-slate-400 mr-1" />
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === f.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search posts…"
                className="w-full pl-7 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
              />
            </div>
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
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <CheckCircle size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-500">No posts match your filters</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting the filters above</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  {['Dealership', 'Platform & Type', 'Caption', 'Uploader', 'Scheduled', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(post => {
                  const dealership   = DEALERSHIPS.find(d => d.id === post.dealership_id)
                  const ct           = getContentType(post.platform, post.content_type)
                  const ContentIcon  = ICON_MAP[ct?.icon] || File
                  const uploaderName = getUserByEmail(post.uploaded_by)?.name || post.uploaded_by_name

                  return (
                    <tr key={post.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors group">

                      {/* Dealership + media thumbnail */}
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-900 whitespace-nowrap">{dealership?.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{dealership?.location}</p>
                        {(post.file_url || post.file_preview) ? (
                          <div className="mt-2 w-16 h-11 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 flex-shrink-0">
                            {post.file_type?.startsWith('video/') ? (
                              <video src={post.file_url || post.file_preview} className="w-full h-full object-cover" muted />
                            ) : (
                              <img src={post.file_url || post.file_preview} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                        ) : post.file_name ? (
                          <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-500">
                            <File size={10} />
                            <span className="truncate max-w-[80px]">{post.file_name}</span>
                          </div>
                        ) : null}
                      </td>

                      {/* Platform + content type merged */}
                      <td className="px-5 py-4">
                        <PlatformBadge platformId={post.platform} compact />
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400 mt-1.5">
                          <ContentIcon size={11} />
                          {ct?.name}
                        </span>
                      </td>

                      {/* Caption */}
                      <td className="px-5 py-4 max-w-[220px]">
                        <p className="text-sm text-slate-700 truncate leading-relaxed" title={post.caption}>
                          {post.caption?.slice(0, 60)}{post.caption?.length > 60 ? '…' : ''}
                        </p>
                      </td>

                      {/* Uploader — name only, no email */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-sm text-slate-700">{uploaderName}</p>
                      </td>

                      {/* Scheduled */}
                      <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">
                        {formatDate(post.scheduled_for)}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusBadge status={post.approval_status} compact />
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => setViewPost(post)} title="View details"
                            className="p-2 rounded-lg text-slate-300 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                            <Eye size={15} />
                          </button>
                          {post.approval_status !== 'approved' && post.approval_status !== 'deleted' && post.approval_status !== 'published' && (
                            <button onClick={() => handleAction(post, 'approve')} title="Approve"
                              className="p-2 rounded-lg text-slate-300 hover:text-green-600 hover:bg-green-50 transition-colors">
                              <CheckCircle size={15} />
                            </button>
                          )}
                          {post.approval_status === 'approved' && (
                            <button onClick={() => handlePublish(post)} title="Mark as Published"
                              className="p-2 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                              <Send size={15} />
                            </button>
                          )}
                          {post.approval_status !== 'flagged' && post.approval_status !== 'deleted' && post.approval_status !== 'published' && (
                            <button onClick={() => handleAction(post, 'flag')} title="Request revision"
                              className="p-2 rounded-lg text-slate-300 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                              <AlertTriangle size={15} />
                            </button>
                          )}
                          {post.approval_status !== 'deleted' && (
                            <button onClick={() => setClonePost(post)} title="Clone to another dealership"
                              className="p-2 rounded-lg text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                              <Copy size={15} />
                            </button>
                          )}
                          {post.approval_status !== 'deleted' && (
                            <button onClick={() => handleAction(post, 'delete')} title="Delete"
                              className="p-2 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors">
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

      <PostDetailModal post={viewPost} isOpen={!!viewPost} onClose={() => setViewPost(null)} />
      <NotificationModal
        post={actionState.post}
        action={actionState.action}
        isOpen={!!actionState.post}
        onClose={() => setActionState({ post: null, action: null })}
        onConfirm={handleConfirm}
      />
      {clonePost && <CloneModal post={clonePost} onClose={() => setClonePost(null)} onClone={handleClone} />}
    </div>
  )
}
