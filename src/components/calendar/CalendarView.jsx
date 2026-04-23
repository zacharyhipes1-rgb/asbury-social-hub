import { useState } from 'react'
import {
  format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isToday, parseISO
} from 'date-fns'
import {
  ChevronLeft, ChevronRight, Image, Video, Layout, Type,
  Calendar, Circle, Music, FileText, BookOpen, File
} from 'lucide-react'
import { usePosts } from '../../context/PostsContext'
import { DEALERSHIPS } from '../../data/dealerships'
import { getPlatform, getContentType } from '../../data/platforms'
import PostDetailModal from '../posts/PostDetailModal'

const ICON_MAP = { Image, Video, Layout, Type, Calendar, Circle, Music, FileText, BookOpen, File }

function PostChip({ post, onClick }) {
  const platform = getPlatform(post.platform)
  const ct = getContentType(post.platform, post.content_type)
  const ContentIcon = ICON_MAP[ct?.icon] || File

  const statusDot = {
    pending:  'bg-amber-400',
    approved: 'bg-green-400',
    flagged:  'bg-orange-400',
    deleted:  'bg-slate-300',
  }

  return (
    <button
      onClick={() => onClick(post)}
      className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5 hover:opacity-90 transition-opacity mb-1 last:mb-0 truncate group"
      style={{ backgroundColor: platform?.color || '#475569' }}
      title={post.caption?.slice(0, 100)}
    >
      <ContentIcon size={10} className="flex-shrink-0" />
      <span className="truncate flex-1">{ct?.name}</span>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot[post.approval_status]}`} />
    </button>
  )
}

function DealershipRow({ dealership, weekDays, posts, onPostClick, dragState, onDragStart, onDragOver, onDrop }) {
  const dealershipPosts = posts.filter(
    p => p.dealership_id === dealership.id && p.approval_status !== 'deleted'
  )

  const getPostsForDay = (day) =>
    dealershipPosts.filter(p => {
      try { return isSameDay(parseISO(p.scheduled_for), day) }
      catch { return false }
    })

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="sticky left-0 bg-white z-10 px-4 py-3 border-r border-slate-200 min-w-[160px] max-w-[160px]">
        <p className="text-sm font-medium text-slate-900 leading-tight truncate" title={dealership.name}>
          {dealership.name}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{dealership.location}</p>
      </td>
      {weekDays.map(day => {
        const dayPosts = getPostsForDay(day)
        const isDropTarget = dragState.overCell === `${dealership.id}-${format(day, 'yyyy-MM-dd')}`

        return (
          <td
            key={day.toISOString()}
            className={`px-2 py-2 align-top min-w-[120px] border-r border-slate-100 last:border-0 transition-colors ${
              isDropTarget ? 'bg-blue-50' : ''
            } ${isToday(day) ? 'bg-blue-50/30' : ''}`}
            onDragOver={(e) => { e.preventDefault(); onDragOver(`${dealership.id}-${format(day, 'yyyy-MM-dd')}`) }}
            onDrop={(e) => { e.preventDefault(); onDrop(dealership.id, format(day, 'yyyy-MM-dd')) }}
          >
            {dayPosts.map(post => (
              <div
                key={post.id}
                draggable
                onDragStart={() => onDragStart(post)}
                className="cursor-grab active:cursor-grabbing"
              >
                <PostChip post={post} onClick={onPostClick} />
              </div>
            ))}
          </td>
        )
      })}
    </tr>
  )
}

export default function CalendarView() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [selectedPost, setSelectedPost] = useState(null)
  const [dealershipFilter, setDealershipFilter] = useState('all')
  const [dragState, setDragState] = useState({ post: null, overCell: null })

  const { posts, reschedulePost } = usePosts()

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekEnd = weekDays[6]

  const visibleDealerships = dealershipFilter === 'all'
    ? DEALERSHIPS
    : DEALERSHIPS.filter(d => d.id === dealershipFilter)

  const handleDragStart = (post) => setDragState(prev => ({ ...prev, post }))
  const handleDragOver = (cellKey) => setDragState(prev => ({ ...prev, overCell: cellKey }))
  const handleDrop = (dealershipId, dateStr) => {
    if (dragState.post) {
      reschedulePost(dragState.post.id, dateStr)
    }
    setDragState({ post: null, overCell: null })
  }

  const totalThisWeek = posts.filter(p => {
    try {
      const d = parseISO(p.scheduled_for)
      return d >= weekStart && d <= weekEnd && p.approval_status !== 'deleted'
    } catch { return false }
  }).length

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="text-center min-w-[200px]">
            <p className="font-semibold text-slate-900 text-sm">
              {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
            </p>
            <p className="text-xs text-slate-500">{totalThisWeek} post{totalThisWeek !== 1 ? 's' : ''} this week</p>
          </div>
          <button
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Dealership:</label>
          <select
            value={dealershipFilter}
            onChange={(e) => setDealershipFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:border-slate-400 bg-white"
          >
            <option value="all">All Dealerships</option>
            {DEALERSHIPS.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-2 bg-slate-50 border-b border-slate-200 flex-shrink-0 flex-wrap">
        {[
          { color: '#1877F2', label: 'Facebook' },
          { color: '#E1306C', label: 'Instagram' },
          { color: '#010101', label: 'TikTok'   },
          { color: '#0A66C2', label: 'LinkedIn'  },
        ].map(p => (
          <div key={p.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
            <span className="text-xs text-slate-500">{p.label}</span>
          </div>
        ))}
        <div className="ml-3 flex items-center gap-3 border-l border-slate-300 pl-3">
          {[
            { color: 'bg-amber-400', label: 'Pending' },
            { color: 'bg-green-400', label: 'Approved' },
            { color: 'bg-orange-400', label: 'Flagged' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${s.color}`} />
              <span className="text-xs text-slate-500">{s.label}</span>
            </div>
          ))}
        </div>
        <p className="ml-auto text-xs text-slate-400 hidden sm:block">Drag posts to reschedule</p>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        <table className="w-full border-collapse" style={{ minWidth: '900px' }}>
          <thead className="sticky top-0 z-20 bg-white shadow-sm">
            <tr className="border-b border-slate-200">
              <th className="sticky left-0 bg-white z-30 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200 min-w-[160px] max-w-[160px]">
                Dealership
              </th>
              {weekDays.map(day => (
                <th
                  key={day.toISOString()}
                  className={`px-2 py-3 text-center min-w-[120px] border-r border-slate-100 last:border-0 ${
                    isToday(day) ? 'bg-blue-50' : ''
                  }`}
                >
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isToday(day) ? 'text-blue-600' : 'text-slate-500'}`}>
                    {format(day, 'EEE')}
                  </p>
                  <p className={`text-lg font-bold mt-0.5 ${isToday(day) ? 'text-blue-600' : 'text-slate-800'}`}>
                    {format(day, 'd')}
                  </p>
                  {isToday(day) && (
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mx-auto mt-0.5" />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleDealerships.map(dealership => (
              <DealershipRow
                key={dealership.id}
                dealership={dealership}
                weekDays={weekDays}
                posts={posts}
                onPostClick={setSelectedPost}
                dragState={dragState}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            ))}
          </tbody>
        </table>
      </div>

      <PostDetailModal
        post={selectedPost}
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
      />
    </div>
  )
}
