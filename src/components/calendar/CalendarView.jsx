import { useState } from 'react'
import {
  format, startOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, subWeeks,
  addMonths, subMonths, isSameDay, isToday, parseISO, differenceInCalendarDays,
  eachDayOfInterval, isSameMonth
} from 'date-fns'
import {
  ChevronLeft, ChevronRight, Image, Video, Layout, Type,
  Calendar, Circle, Music, FileText, BookOpen, File, AlertCircle
} from 'lucide-react'
import { usePosts } from '../../context/PostsContext'
import { DEALERSHIPS } from '../../data/dealerships'
import { getPlatform, getContentType } from '../../data/platforms'
import PostDetailModal from '../posts/PostDetailModal'

const ICON_MAP = { Image, Video, Layout, Type, Calendar, Circle, Music, FileText, BookOpen, File }

function isUrgent(post) {
  if (post.approval_status !== 'approved') return false
  try {
    const days = differenceInCalendarDays(parseISO(post.scheduled_for), new Date())
    return days >= 0 && days <= 3
  } catch { return false }
}

const STATUS_DOT = {
  pending:   'bg-amber-400',
  approved:  'bg-green-400',
  flagged:   'bg-orange-400',
  deleted:   'bg-slate-300',
  published: 'bg-blue-400',
}

const STATUS_BADGE = {
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-green-100 text-green-700',
  flagged:   'bg-orange-100 text-orange-700',
  published: 'bg-blue-100 text-blue-700',
  deleted:   'bg-slate-100 text-slate-500',
}

// ─── Desktop post chip (week/month table cells) ───────────────────────────────
function PostChip({ post, onClick }) {
  const platform    = getPlatform(post.platform)
  const ct          = getContentType(post.platform, post.content_type)
  const ContentIcon = ICON_MAP[ct?.icon] || File
  const urgent      = isUrgent(post)

  return (
    <button
      onClick={() => onClick(post)}
      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5 hover:opacity-90 transition-opacity mb-1 last:mb-0 truncate ${
        urgent ? 'ring-2 ring-red-400 ring-offset-1' : ''
      }`}
      style={{ backgroundColor: platform?.color || '#475569' }}
      title={urgent ? '⚠ Due within 3 days — needs publishing' : post.caption?.slice(0, 100)}
    >
      {urgent && <AlertCircle size={9} className="flex-shrink-0 text-red-200" />}
      <ContentIcon size={10} className="flex-shrink-0" />
      <span className="truncate flex-1">{ct?.name}</span>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[post.approval_status] || 'bg-slate-300'}`} />
    </button>
  )
}

// ─── Mobile: post card used in agenda lists ───────────────────────────────────
function MobilePostCard({ post, onClick }) {
  const platform    = getPlatform(post.platform)
  const ct          = getContentType(post.platform, post.content_type)
  const ContentIcon = ICON_MAP[ct?.icon] || File
  const dealership  = DEALERSHIPS.find(d => d.id === post.dealership_id)
  const urgent      = isUrgent(post)

  return (
    <button
      onClick={() => onClick(post)}
      className={`w-full text-left p-3.5 rounded-xl border-2 bg-white transition-all active:scale-[0.98] ${
        urgent ? 'border-red-300' : 'border-slate-100 hover:border-slate-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: platform?.color || '#475569' }}
        >
          <ContentIcon size={15} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">{platform?.name}</span>
            <span className="text-slate-300 text-xs">·</span>
            <span className="text-xs text-slate-500">{ct?.name}</span>
            {urgent && (
              <span className="text-xs font-medium text-red-600 flex items-center gap-0.5">
                <AlertCircle size={10} />Urgent
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 truncate mb-1.5">{dealership?.name}</p>
          {post.caption && (
            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{post.caption}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[post.approval_status] || 'bg-slate-100 text-slate-600'}`}>
          {post.approval_status}
        </span>
        {post.optimal_posting_time && (
          <span className="text-xs text-slate-400">Best: {post.optimal_posting_time}</span>
        )}
      </div>
    </button>
  )
}

// ─── Mobile: day strip + agenda ───────────────────────────────────────────────
function MobileWeekAgenda({ weekDays, posts, dealershipFilter, onPostClick }) {
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date()
    return weekDays.find(d => isToday(d)) || weekDays[0]
  })

  const dayPosts = (dealershipFilter === 'all'
    ? posts
    : posts.filter(p => p.dealership_id === dealershipFilter)
  ).filter(p => {
    try { return isSameDay(parseISO(p.scheduled_for), selectedDay) && p.approval_status !== 'deleted' }
    catch { return false }
  })

  const getPostCount = (day) =>
    posts.filter(p => {
      if (p.approval_status === 'deleted') return false
      if (dealershipFilter !== 'all' && p.dealership_id !== dealershipFilter) return false
      try { return isSameDay(parseISO(p.scheduled_for), day) } catch { return false }
    }).length

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Day strip */}
      <div className="flex gap-1.5 px-4 py-3 bg-white border-b border-slate-100 overflow-x-auto scrollbar-none flex-shrink-0">
        {weekDays.map(day => {
          const isSelected = isSameDay(day, selectedDay)
          const isT = isToday(day)
          const count = getPostCount(day)
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDay(day)}
              className={`flex flex-col items-center flex-shrink-0 w-12 py-2 rounded-xl transition-all ${
                isSelected ? 'bg-slate-900' :
                isT ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                isSelected ? 'text-slate-300' : isT ? 'text-blue-500' : 'text-slate-400'
              }`}>
                {format(day, 'EEE')}
              </span>
              <span className={`text-base font-bold leading-tight mt-0.5 ${
                isSelected ? 'text-white' : isT ? 'text-blue-600' : 'text-slate-700'
              }`}>
                {format(day, 'd')}
              </span>
              {count > 0 ? (
                <span className={`text-[9px] font-bold mt-0.5 ${
                  isSelected ? 'text-slate-300' : isT ? 'text-blue-500' : 'text-slate-400'
                }`}>{count}</span>
              ) : (
                <span className="h-3 mt-0.5" />
              )}
            </button>
          )
        })}
      </div>

      {/* Agenda list */}
      <div className="flex-1 overflow-y-auto">
        {dayPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <Calendar size={36} className="text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-400">No posts scheduled</p>
            <p className="text-xs text-slate-300 mt-1">{format(selectedDay, 'EEEE, MMMM d')}</p>
          </div>
        ) : (
          <div className="p-4 space-y-2.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {format(selectedDay, 'EEEE, MMMM d')} · {dayPosts.length} post{dayPosts.length !== 1 ? 's' : ''}
            </p>
            {dayPosts.map(post => (
              <MobilePostCard key={post.id} post={post} onClick={onPostClick} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Mobile: compact month grid + day posts ───────────────────────────────────
function MobileMonthView({ monthDate, posts, dealershipFilter, onPostClick }) {
  const [selectedDay, setSelectedDay] = useState(new Date())

  const monthStart = startOfMonth(monthDate)
  const monthEnd   = endOfMonth(monthDate)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd    = addDays(startOfWeek(addDays(monthEnd, 6), { weekStartsOn: 1 }), 6)
  const days       = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const getPostsForDay = (day) =>
    posts.filter(p => {
      if (p.approval_status === 'deleted') return false
      if (dealershipFilter !== 'all' && p.dealership_id !== dealershipFilter) return false
      try { return isSameDay(parseISO(p.scheduled_for), day) } catch { return false }
    })

  const selectedPosts = getPostsForDay(selectedDay)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Compact grid */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2">
        <div className="grid grid-cols-7 gap-px">
          {['M','T','W','T','F','S','S'].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{d}</div>
          ))}
          {days.map(day => {
            const inMonth  = isSameMonth(day, monthDate)
            const isT      = isToday(day)
            const isSel    = isSameDay(day, selectedDay)
            const dayPosts = getPostsForDay(day)
            const platforms = [...new Set(dayPosts.map(p => getPlatform(p.platform)?.color).filter(Boolean))]

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDay(day)}
                className={`flex flex-col items-center py-1.5 rounded-xl transition-all ${
                  isSel ? 'bg-slate-900' :
                  isT   ? 'bg-blue-50' : 'hover:bg-slate-50'
                } ${!inMonth ? 'opacity-30' : ''}`}
              >
                <span className={`text-sm font-bold leading-none ${
                  isSel ? 'text-white' : isT ? 'text-blue-600' : 'text-slate-700'
                }`}>
                  {format(day, 'd')}
                </span>
                <div className="flex gap-0.5 mt-1 h-2.5 items-center justify-center">
                  {platforms.slice(0, 3).map((color, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: isSel ? 'rgba(255,255,255,0.6)' : color }} />
                  ))}
                  {platforms.length === 0 && <div className="w-1.5 h-1.5" />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Divider + selected day posts */}
      <div className="flex-1 overflow-y-auto border-t border-slate-100">
        {selectedPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <p className="text-sm font-medium text-slate-400">No posts on {format(selectedDay, 'MMM d')}</p>
          </div>
        ) : (
          <div className="p-4 space-y-2.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {format(selectedDay, 'EEEE, MMMM d')} · {selectedPosts.length} post{selectedPosts.length !== 1 ? 's' : ''}
            </p>
            {selectedPosts.map(post => (
              <MobilePostCard key={post.id} post={post} onClick={onPostClick} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Single-dealership full-week column view ──────────────────────────────────
function SingleDealershipWeekView({ dealership, weekDays, posts, onPostClick, dragState, onDragStart, onDragOver, onDrop }) {
  const dealershipPosts = posts.filter(
    p => p.dealership_id === dealership.id && p.approval_status !== 'deleted'
  )
  const getPostsForDay = (day) =>
    dealershipPosts.filter(p => { try { return isSameDay(parseISO(p.scheduled_for), day) } catch { return false } })

  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      {weekDays.map(day => {
        const dayPosts     = getPostsForDay(day)
        const today        = isToday(day)
        const weekend      = [0, 6].includes(day.getDay())
        const isDropTarget = dragState.overCell === `${dealership.id}-${format(day, 'yyyy-MM-dd')}`

        return (
          <div
            key={day.toISOString()}
            className={`flex-1 flex flex-col border-r border-slate-100 last:border-0 transition-colors ${
              isDropTarget ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' :
              today        ? 'bg-blue-50/25' :
              weekend      ? 'bg-slate-50/60' : 'bg-white'
            }`}
            onDragOver={(e) => { e.preventDefault(); onDragOver(`${dealership.id}-${format(day, 'yyyy-MM-dd')}`) }}
            onDrop={(e) => { e.preventDefault(); onDrop(dealership.id, format(day, 'yyyy-MM-dd')) }}
          >
            {/* Day header */}
            <div className={`px-3 py-4 border-b flex-shrink-0 text-center ${
              today ? 'border-blue-100 bg-blue-50/60' : 'border-slate-100'
            }`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${today ? 'text-blue-500' : 'text-slate-400'}`}>
                {format(day, 'EEE')}
              </p>
              <div className={`mx-auto mt-1.5 w-9 h-9 flex items-center justify-center rounded-full text-base font-bold ${
                today ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-800'
              }`}>
                {format(day, 'd')}
              </div>
              <p className={`text-[10px] mt-1.5 font-medium ${
                dayPosts.length > 0 ? 'text-indigo-500' : 'text-slate-300'
              }`}>
                {dayPosts.length > 0 ? `${dayPosts.length} post${dayPosts.length !== 1 ? 's' : ''}` : '—'}
              </p>
            </div>

            {/* Posts area */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {dayPosts.map(post => (
                <div key={post.id} draggable onDragStart={() => onDragStart(post)} className="cursor-grab active:cursor-grabbing">
                  <PostChip post={post} onClick={onPostClick} />
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Desktop week view ────────────────────────────────────────────────────────
function DealershipRow({ dealership, weekDays, posts, onPostClick, dragState, onDragStart, onDragOver, onDrop }) {
  const dealershipPosts = posts.filter(
    p => p.dealership_id === dealership.id && p.approval_status !== 'deleted'
  )
  const getPostsForDay = (day) =>
    dealershipPosts.filter(p => { try { return isSameDay(parseISO(p.scheduled_for), day) } catch { return false } })

  const weekPostCount = weekDays.reduce((n, day) => n + getPostsForDay(day).length, 0)

  return (
    <tr className="border-b border-slate-100 last:border-0 group">
      {/* Dealership label cell */}
      <td className="sticky left-0 z-10 border-r border-slate-200 min-w-[172px] max-w-[172px] p-0 align-top">
        <div className="h-full min-h-[140px] bg-white group-hover:bg-slate-50/60 transition-colors px-4 py-4 flex flex-col justify-between border-l-4 border-l-indigo-500">
          <div>
            <p className="text-sm font-semibold text-slate-900 leading-tight">{dealership.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{dealership.location}</p>
          </div>
          <span className={`self-start text-[10px] font-semibold px-2 py-0.5 rounded-full mt-3 ${
            weekPostCount === 0 ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'
          }`}>
            {weekPostCount} post{weekPostCount !== 1 ? 's' : ''} this week
          </span>
        </div>
      </td>

      {/* Day cells */}
      {weekDays.map(day => {
        const dayPosts     = getPostsForDay(day)
        const isDropTarget = dragState.overCell === `${dealership.id}-${format(day, 'yyyy-MM-dd')}`
        const isWeekend    = [0, 6].includes(day.getDay())
        const today        = isToday(day)

        return (
          <td
            key={day.toISOString()}
            className={`px-2 pt-2.5 pb-2 align-top min-w-[130px] min-h-[140px] border-r border-slate-100 last:border-0 transition-all ${
              isDropTarget ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' :
              today        ? 'bg-blue-50/40' :
              isWeekend    ? 'bg-slate-50/60' : 'bg-white'
            }`}
            onDragOver={(e) => { e.preventDefault(); onDragOver(`${dealership.id}-${format(day, 'yyyy-MM-dd')}`) }}
            onDrop={(e) => { e.preventDefault(); onDrop(dealership.id, format(day, 'yyyy-MM-dd')) }}
          >
            {dayPosts.length > 0 ? (
              dayPosts.map(post => (
                <div key={post.id} draggable onDragStart={() => onDragStart(post)} className="cursor-grab active:cursor-grabbing">
                  <PostChip post={post} onClick={onPostClick} />
                </div>
              ))
            ) : (
              <div className={`h-full min-h-[110px] rounded-lg flex items-center justify-center border-2 border-dashed transition-colors ${
                isDropTarget ? 'border-blue-300' : today ? 'border-blue-100' : 'border-slate-100 group-hover:border-slate-200'
              }`}>
                <span className="text-[10px] text-slate-300 select-none">—</span>
              </div>
            )}
          </td>
        )
      })}
    </tr>
  )
}

// ─── Desktop month view ───────────────────────────────────────────────────────
function DesktopMonthView({ monthDate, posts, dealershipFilter, onPostClick }) {
  const monthStart = startOfMonth(monthDate)
  const monthEnd   = endOfMonth(monthDate)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd    = addDays(startOfWeek(addDays(monthEnd, 6), { weekStartsOn: 1 }), 6)
  const days       = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const visiblePosts = dealershipFilter === 'all'
    ? posts.filter(p => p.approval_status !== 'deleted')
    : posts.filter(p => p.dealership_id === dealershipFilter && p.approval_status !== 'deleted')

  const getPostsForDay = (day) =>
    visiblePosts.filter(p => { try { return isSameDay(parseISO(p.scheduled_for), day) } catch { return false } })

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden" style={{ minWidth: 700 }}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
            {d}
          </div>
        ))}
        {days.map(day => {
          const dayPosts  = getPostsForDay(day)
          const inMonth   = isSameMonth(day, monthDate)
          const todayDay  = isToday(day)
          const urgentCnt = dayPosts.filter(isUrgent).length
          return (
            <div key={day.toISOString()} className={`bg-white min-h-[100px] p-2 ${!inMonth ? 'opacity-40' : ''}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${
                  todayDay ? 'bg-blue-600 text-white' : 'text-slate-700'
                }`}>
                  {format(day, 'd')}
                </span>
                {urgentCnt > 0 && (
                  <span className="text-xs font-medium text-red-600 flex items-center gap-0.5">
                    <AlertCircle size={10} />{urgentCnt}
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                {dayPosts.slice(0, 3).map(post => (
                  <PostChip key={post.id} post={post} onClick={onPostClick} />
                ))}
                {dayPosts.length > 3 && (
                  <p className="text-xs text-slate-400 pl-1">+{dayPosts.length - 3} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CalendarView() {
  const [viewMode, setViewMode]                 = useState('week')
  const [weekStart, setWeekStart]               = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [monthDate, setMonthDate]               = useState(() => startOfMonth(new Date()))
  const [selectedPost, setSelectedPost]         = useState(null)
  const [dealershipFilter, setDealershipFilter] = useState('all')
  const [dragState, setDragState]               = useState({ post: null, overCell: null })

  const { posts, reschedulePost } = usePosts()

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekEnd  = weekDays[6]

  const visibleDealerships = dealershipFilter === 'all'
    ? DEALERSHIPS
    : DEALERSHIPS.filter(d => d.id === dealershipFilter)

  const handleDragStart = (post) => setDragState(prev => ({ ...prev, post }))
  const handleDragOver  = (cellKey) => setDragState(prev => ({ ...prev, overCell: cellKey }))
  const handleDrop      = (dealershipId, dateStr) => {
    if (dragState.post) reschedulePost(dragState.post.id, dateStr)
    setDragState({ post: null, overCell: null })
  }

  const totalThisWeek = posts.filter(p => {
    try {
      const d = parseISO(p.scheduled_for)
      return d >= weekStart && d <= weekEnd && p.approval_status !== 'deleted'
    } catch { return false }
  }).length

  const urgentCount = posts.filter(isUrgent).length

  const prevPeriod = () => viewMode === 'week' ? setWeekStart(subWeeks(weekStart, 1)) : setMonthDate(subMonths(monthDate, 1))
  const nextPeriod = () => viewMode === 'week' ? setWeekStart(addWeeks(weekStart, 1)) : setMonthDate(addMonths(monthDate, 1))
  const goToToday  = () => { setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 })); setMonthDate(startOfMonth(new Date())) }

  return (
    <div className="flex flex-col h-full">

      {/* ── Toolbar ── */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200">
        {/* Mobile toolbar */}
        <div className="flex lg:hidden flex-col gap-2 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            {/* Nav */}
            <div className="flex items-center gap-1.5">
              <button onClick={prevPeriod} className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <div className="text-center">
                {viewMode === 'week' ? (
                  <>
                    <p className="font-semibold text-slate-900 text-sm leading-tight">{format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}</p>
                    <p className="text-xs text-slate-400">{totalThisWeek} post{totalThisWeek !== 1 ? 's' : ''}</p>
                  </>
                ) : (
                  <p className="font-semibold text-slate-900 text-sm">{format(monthDate, 'MMMM yyyy')}</p>
                )}
              </div>
              <button onClick={nextPeriod} className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
            {/* View toggle + Today */}
            <div className="flex items-center gap-1.5">
              <button onClick={goToToday} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                Today
              </button>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                {[{ id: 'week', label: 'Wk' }, { id: 'month', label: 'Mo' }].map(v => (
                  <button
                    key={v.id}
                    onClick={() => setViewMode(v.id)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      viewMode === v.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Dealership filter + urgent badge */}
          <div className="flex items-center gap-2">
            <select
              value={dealershipFilter}
              onChange={e => setDealershipFilter(e.target.value)}
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:border-slate-400 bg-white"
            >
              <option value="all">All Dealerships</option>
              {DEALERSHIPS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            {urgentCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-red-600 whitespace-nowrap">
                <AlertCircle size={12} />{urgentCount} urgent
              </span>
            )}
          </div>
        </div>

        {/* Desktop toolbar */}
        <div className="hidden lg:flex items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <button onClick={prevPeriod} className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <div className="text-center min-w-[200px]">
              {viewMode === 'week' ? (
                <>
                  <p className="font-semibold text-slate-900 text-sm">{format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}</p>
                  <p className="text-xs text-slate-500">{totalThisWeek} post{totalThisWeek !== 1 ? 's' : ''} this week</p>
                </>
              ) : (
                <p className="font-semibold text-slate-900 text-sm">{format(monthDate, 'MMMM yyyy')}</p>
              )}
            </div>
            <button onClick={nextPeriod} className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
              <ChevronRight size={16} />
            </button>
            <button onClick={goToToday} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
              Today
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              {[{ id: 'week', label: 'Week' }, { id: 'month', label: 'Month' }].map(v => (
                <button
                  key={v.id}
                  onClick={() => setViewMode(v.id)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === v.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <select
              value={dealershipFilter}
              onChange={e => setDealershipFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:border-slate-400 bg-white"
            >
              <option value="all">All Dealerships</option>
              {DEALERSHIPS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Legend (desktop only) ── */}
      <div className="hidden lg:flex items-center gap-3 px-6 py-2 bg-slate-50 border-b border-slate-200 flex-shrink-0 flex-wrap">
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
            { color: 'bg-amber-400',  label: 'Pending' },
            { color: 'bg-green-400',  label: 'Approved' },
            { color: 'bg-orange-400', label: 'Flagged' },
            { color: 'bg-blue-400',   label: 'Published' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${s.color}`} />
              <span className="text-xs text-slate-500">{s.label}</span>
            </div>
          ))}
        </div>
        {urgentCount > 0 && (
          <div className="ml-auto flex items-center gap-1.5 text-xs text-red-600 font-medium">
            <AlertCircle size={12} />
            {urgentCount} approved post{urgentCount !== 1 ? 's' : ''} due within 3 days — needs publishing
          </div>
        )}
        {viewMode === 'week' && <p className="text-xs text-slate-400 ml-auto">Drag posts to reschedule</p>}
      </div>

      {/* ── Calendar body ── */}

      {/* Mobile views */}
      <div className="flex lg:hidden flex-col flex-1 min-h-0">
        {viewMode === 'week' ? (
          <MobileWeekAgenda
            weekDays={weekDays}
            posts={posts}
            dealershipFilter={dealershipFilter}
            onPostClick={setSelectedPost}
          />
        ) : (
          <MobileMonthView
            monthDate={monthDate}
            posts={posts}
            dealershipFilter={dealershipFilter}
            onPostClick={setSelectedPost}
          />
        )}
      </div>

      {/* Desktop views */}
      {viewMode === 'month' ? (
        <DesktopMonthView
          monthDate={monthDate}
          posts={posts}
          dealershipFilter={dealershipFilter}
          onPostClick={setSelectedPost}
          className="hidden lg:flex flex-col flex-1"
        />
      ) : (
        visibleDealerships.length === 1 ? (
          /* ── Single-dealership: full-height column view ── */
          <div className="hidden lg:flex flex-col flex-1 overflow-hidden">
            <div className="flex-shrink-0 px-6 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-indigo-500" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{visibleDealerships[0].name}</p>
                <p className="text-xs text-slate-500">{visibleDealerships[0].location}</p>
              </div>
            </div>
            <SingleDealershipWeekView
              dealership={visibleDealerships[0]}
              weekDays={weekDays}
              posts={posts}
              onPostClick={setSelectedPost}
              dragState={dragState}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          </div>
        ) : (
          /* ── All dealerships: scrollable table ── */
          <div className="hidden lg:block flex-1 overflow-auto scrollbar-thin">
            <table className="w-full border-collapse" style={{ minWidth: '900px' }}>
              <thead className="sticky top-0 z-20 shadow-sm">
                <tr className="border-b border-slate-200 bg-white">
                  <th className="sticky left-0 bg-white z-30 px-4 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest border-r border-slate-200 min-w-[172px] max-w-[172px]">
                    Dealership
                  </th>
                  {weekDays.map(day => {
                    const today   = isToday(day)
                    const weekend = [0, 6].includes(day.getDay())
                    return (
                      <th key={day.toISOString()} className={`px-2 py-3 text-center min-w-[130px] border-r border-slate-100 last:border-0 ${
                        today ? 'bg-blue-50' : weekend ? 'bg-slate-50/70' : 'bg-white'
                      }`}>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${today ? 'text-blue-500' : 'text-slate-400'}`}>
                          {format(day, 'EEE')}
                        </p>
                        <div className={`mx-auto mt-1 w-8 h-8 flex items-center justify-center rounded-full text-base font-bold ${
                          today ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-800'
                        }`}>
                          {format(day, 'd')}
                        </div>
                      </th>
                    )
                  })}
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
        )
      )}

      <PostDetailModal post={selectedPost} isOpen={!!selectedPost} onClose={() => setSelectedPost(null)} />
    </div>
  )
}
