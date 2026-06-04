import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import {
  CheckCircle, AlertTriangle, Trash2, Eye, Send,
  Image, Video, Layout, Type, Calendar, Circle, Music,
  FileText, BookOpen, File, Search, Copy, X, Filter,
  Clock, MapPin
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
          <h3 className="font-semibold text-slate-900">Clone to Another Location</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700"><X size={16} /></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Creates a copy of this post for a different location. Caption, hashtags, and media carry over. Status resets to Pending.
        </p>
        <select
          value={targetId}
          onChange={e => setTargetId(e.target.value)}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-slate-400 bg-white mb-4"
        >
          <option value="">Select location…</option>
          {others.map(d => <option key={d.id} value={d.id}>{d.name} — {d.location}</option>)}
        </select>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Cancel</button>
          <button
            disabled={!targetId}
            onClick={() => onClone(targetId)}
            className="btn-press px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clone Post
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Post Card ──────────────────────────────────────────────────────────────────
function PostCard({ post, onView, onAction, onPublish, onClone, isExiting, isFlashed, isSelected, onSelect, isSelectable }) {
  const dealership   = DEALERSHIPS.find(d => d.id === post.dealership_id)
  const ct           = getContentType(post.platform, post.content_type)
  const ContentIcon  = ICON_MAP[ct?.icon] || File
  const { getUserByEmail } = useUsers()
  const uploaderName = getUserByEmail(post.uploaded_by)?.name || post.uploaded_by_name
  const hasMedia     = !!(post.file_url || post.file_preview)
  const src          = post.file_url || post.file_preview
  const isVideo      = post.file_type?.startsWith('video/')

  const isPending   = post.approval_status === 'pending'
  const isApproved  = post.approval_status === 'approved'
  const isFlagged   = post.approval_status === 'flagged'
  const isPublished = post.approval_status === 'published'
  const isDeleted   = post.approval_status === 'deleted'

  const formattedDate = (() => {
    try { return format(parseISO(post.scheduled_for), 'MMM d, yyyy') }
    catch { return post.scheduled_for || '—' }
  })()

  const uploadedAgo = (() => {
    try { return formatDistanceToNow(parseISO(post.uploaded_at), { addSuffix: true }) }
    catch { return '' }
  })()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={isExiting
        ? { opacity: 0, x: isExiting === 'approve' ? 80 : -80, scale: 0.96 }
        : { opacity: 1, y: 0, x: 0, scale: 1 }
      }
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
      transition={{ duration: 0.22 }}
      className={`group bg-white rounded-2xl border transition-all cursor-pointer ${
        isFlashed  ? 'border-emerald-200 bg-emerald-50/40 shadow-sm' :
        isSelected ? 'border-indigo-200 bg-indigo-50/30 shadow-sm' :
        'border-slate-100 hover:border-slate-200 hover:shadow-md'
      }`}
      onClick={() => onView(post)}
    >
      <div className="p-4 sm:p-5">
        <div className="flex gap-3 sm:gap-4">

          {/* ── Thumbnail ── */}
          <div className="flex-shrink-0">
            {isSelectable && (
              <div className="mb-2" onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={e => onSelect(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 w-4 h-4"
                />
              </div>
            )}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-100 flex-shrink-0 relative">
              {hasMedia ? (
                isVideo ? (
                  <video src={src} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={src} alt="" className="w-full h-full object-cover" />
                )
              ) : post.file_name ? (
                <div className="w-full h-full flex items-center justify-center">
                  <File size={22} className="text-slate-300" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ContentIcon size={22} className="text-slate-300" />
                </div>
              )}
              {isVideo && hasMedia && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <svg className="w-5 h-5 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* ── Content ── */}
          <div className="flex-1 min-w-0">
            {/* Row 1: Location + Status */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-bold text-slate-900 truncate">{dealership?.name}</span>
                  <span className="text-slate-300">·</span>
                  <PlatformBadge platformId={post.platform} compact />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                  <ContentIcon size={10} className="flex-shrink-0" />
                  <span>{ct?.name}</span>
                  <span className="text-slate-200">·</span>
                  <MapPin size={10} className="flex-shrink-0" />
                  <span className="truncate">{dealership?.location}</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <StatusBadge status={post.approval_status} />
              </div>
            </div>

            {/* Row 2: Caption */}
            {post.caption ? (
              <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed mb-2.5">
                {post.caption}
              </p>
            ) : (
              <p className="text-sm text-slate-300 italic mb-2.5">No caption</p>
            )}

            {/* Row 3: Meta */}
            <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
              <span className="font-medium text-slate-500">{uploaderName}</span>
              {post.scheduled_for && (
                <>
                  <span className="text-slate-200">·</span>
                  <span className="flex items-center gap-1">
                    <Calendar size={10} />
                    {formattedDate}
                  </span>
                </>
              )}
              {uploadedAgo && (
                <>
                  <span className="text-slate-200">·</span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {uploadedAgo}
                  </span>
                </>
              )}
            </div>

            {/* Manager notes (flagged posts) */}
            {isFlagged && post.chad_notes && (
              <div className="mt-2.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                <p className="text-xs text-amber-800 leading-relaxed">
                  <span className="font-semibold">Revision needed:</span> {post.chad_notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Action bar ── */}
        {!isDeleted && (
          <div
            className="flex items-center gap-2 mt-3.5 pt-3.5 border-t border-slate-50 flex-wrap"
            onClick={e => e.stopPropagation()}
          >
            {/* View */}
            <button
              onClick={() => onView(post)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Eye size={13} /> View
            </button>

            <div className="flex-1" />

            {/* Secondary: Clone */}
            <button
              onClick={() => onClone(post)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Clone to another location"
            >
              <Copy size={13} /> Clone
            </button>

            {/* Primary actions */}
            {isApproved && (
              <button
                onClick={() => onPublish(post)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-100"
              >
                <Send size={13} /> Mark Published
              </button>
            )}

            {(isPending || isFlagged) && (
              <>
                <button
                  onClick={() => onAction(post, 'flag')}
                  className="btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors border border-amber-100"
                >
                  <AlertTriangle size={13} /> Revise
                </button>
                <button
                  onClick={() => onAction(post, 'approve')}
                  className="btn-press flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200"
                >
                  <CheckCircle size={13} /> Approve
                </button>
              </>
            )}

            {/* Delete */}
            <button
              onClick={() => onAction(post, 'delete')}
              className="btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminQueue() {
  const { posts, approvePost, flagPost, deletePost, publishPost, addPost } = usePosts()
  const { addToast } = useToast()
  const { getUserByEmail } = useUsers()
  const [searchParams] = useSearchParams()

  const [statusFilter,     setStatusFilter]     = useState(() => searchParams.get('status') || 'all')
  const [platformFilter,   setPlatformFilter]   = useState('all')
  const [dealershipFilter, setDealershipFilter] = useState('all')
  const [search,           setSearch]           = useState('')
  const [viewPost,         setViewPost]         = useState(null)
  const [actionState,      setActionState]      = useState({ post: null, action: null })
  const [clonePost,        setClonePost]        = useState(null)
  const [selectedIds,      setSelectedIds]      = useState(new Set())
  const [flashedIds,       setFlashedIds]       = useState(new Set())
  const [exitingIds,       setExitingIds]       = useState({})
  const [filtersOpen,      setFiltersOpen]      = useState(false)

  const flashCard = (id) => {
    setFlashedIds(prev => new Set([...prev, id]))
    setTimeout(() => setFlashedIds(prev => { const n = new Set(prev); n.delete(id); return n }), 1400)
  }

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

  const selectablePosts = filtered.filter(p => p.approval_status !== 'deleted' && p.approval_status !== 'published')

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
    const exitDirection = action === 'approve' ? 'approve' : 'reject'
    setExitingIds(prev => ({ ...prev, [post.id]: exitDirection }))
    setTimeout(() => {
      if (action === 'approve') {
        approvePost(post.id, notes)
        addToast(`Approved: ${getPlatform(post.platform)?.name} · ${dealershipName}`, 'success')
      } else if (action === 'flag') {
        flagPost(post.id, notes)
        addToast(`Revision requested for ${uploaderName}'s post.`, 'warning')
      } else if (action === 'delete') {
        deletePost(post.id)
        addToast('Post removed from queue.', 'error')
      }
      setExitingIds(prev => { const n = { ...prev }; delete n[post.id]; return n })
    }, 280)
  }

  const handlePublish = (post) => {
    publishPost(post.id)
    addToast(`Marked published: ${getPlatform(post.platform)?.name} · ${DEALERSHIPS.find(d => d.id === post.dealership_id)?.name}`, 'success')
  }

  const handleClone = (targetDealershipId) => {
    const { dealership_id, approval_status, chad_notes, chad_action_at, uploaded_at, id, ...rest } = clonePost
    addPost({ ...rest, dealership_id: targetDealershipId })
    addToast(`Cloned to ${DEALERSHIPS.find(d => d.id === targetDealershipId)?.name} — ready for review.`, 'success')
    setClonePost(null)
  }

  const activeFilters = [platformFilter !== 'all', dealershipFilter !== 'all', search.trim()].filter(Boolean).length

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Pending Review', count: pendingCount,   color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100',  dot: 'bg-amber-400'   },
          { label: 'Approved',       count: approvedCount,  color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', dot: 'bg-emerald-400' },
          { label: 'Needs Revision', count: flaggedCount,   color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-100',  dot: 'bg-orange-400'  },
          { label: 'Published',      count: publishedCount, color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100',    dot: 'bg-blue-400'    },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} border ${stat.border} rounded-2xl px-4 py-4`}>
            <p className={`text-3xl font-bold tracking-tight ${stat.color}`}>{stat.count}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${stat.dot}`} />
              <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Status filter chips ── */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              statusFilter === f.value
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            {f.label}
            {f.value === 'pending' && pendingCount > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${statusFilter === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}

        {/* Filters toggle */}
        <button
          onClick={() => setFiltersOpen(f => !f)}
          className={`flex-shrink-0 ml-auto flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
            filtersOpen || activeFilters > 0
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
          }`}
        >
          <Filter size={13} />
          Filters
          {activeFilters > 0 && (
            <span className="bg-indigo-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* ── Expanded filters ── */}
      {filtersOpen && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 mb-4 space-y-3">
          <div className="relative">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by location, caption, or uploader…"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={platformFilter}
              onChange={e => setPlatformFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:border-indigo-400 bg-white"
            >
              <option value="all">All Platforms</option>
              {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select
              value={dealershipFilter}
              onChange={e => setDealershipFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:border-indigo-400 bg-white"
            >
              <option value="all">All Locations</option>
              {DEALERSHIPS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {(activeFilters > 0) && (
            <button
              onClick={() => { setSearch(''); setPlatformFilter('all'); setDealershipFilter('all') }}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── Bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl">
          <span className="text-sm font-semibold text-indigo-900">
            {selectedIds.size} selected
          </span>
          <button
            onClick={async () => {
              for (const id of [...selectedIds]) await approvePost(id, '')
              addToast(`Approved ${selectedIds.size} posts.`, 'success')
              setSelectedIds(new Set())
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
          >
            <CheckCircle size={14} /> Approve All
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-indigo-500 hover:text-indigo-700 ml-auto">
            Clear
          </button>
        </div>
      )}

      {/* ── Card list ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-20 text-center">
          <CheckCircle size={36} className="mx-auto text-slate-200 mb-3" />
          <p className="font-semibold text-slate-400">No posts match your filters</p>
          <p className="text-sm text-slate-300 mt-1">Try adjusting the filters above</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onView={setViewPost}
                onAction={handleAction}
                onPublish={handlePublish}
                onClone={setClonePost}
                isExiting={exitingIds[post.id]}
                isFlashed={flashedIds.has(post.id)}
                isSelected={selectedIds.has(post.id)}
                isSelectable={post.approval_status !== 'deleted' && post.approval_status !== 'published'}
                onSelect={(checked) => {
                  const next = new Set(selectedIds)
                  if (checked) next.add(post.id)
                  else next.delete(post.id)
                  setSelectedIds(next)
                }}
              />
            ))}
          </AnimatePresence>
          <p className="text-center text-xs text-slate-300 pt-2">
            {filtered.length} post{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

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
