import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { Sparkles, Send, X, Minus, MessageSquare, ChevronDown } from 'lucide-react'
import { usePosts } from '../../context/PostsContext'
import { DEALERSHIPS } from '../../data/dealerships'
import { format, subWeeks, startOfWeek, endOfWeek, parseISO, isWithinInterval } from 'date-fns'

// Page-aware labels
const PAGE_CONTEXT = {
  '/':          'Dashboard',
  '/analytics': 'Analytics',
  '/assets':    'Asset Library',
  '/upload':    'Upload Content',
  '/calendar':  'Content Calendar',
  '/tools':     'Tools',
  '/admin':     'Approval Queue',
  '/users':     'Users & Security',
  '/settings':  'Settings',
}

const STARTERS = [
  'Which dealership needs the most attention?',
  'What content is performing best?',
  'How do we improve our approval rate?',
  'Give me a content plan for this week.',
]

export default function FloatingChat({ currentDealerId = null }) {
  const location   = useLocation()
  const { posts }  = usePosts()
  const [open, setOpen]         = useState(false)
  const [minimized, setMin]     = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [unread, setUnread]     = useState(0)
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)

  const currentPage = PAGE_CONTEXT[location.pathname] || 'Asbury Social Hub'

  // Build analytics summary for all dealerships
  const analyticsContext = useMemo(() => {
    const activePosts = posts.filter(p => p.approval_status !== 'deleted')
    const dealers = DEALERSHIPS.map(d => {
      const all      = activePosts.filter(p => p.dealership_id === d.id)
      const decided  = all.filter(p => ['approved','published','flagged'].includes(p.approval_status))
      const approved = decided.filter(p => ['approved','published'].includes(p.approval_status))
      const rate     = decided.length > 0 ? Math.round((approved.length / decided.length) * 100) : null
      const pending  = all.filter(p => p.approval_status === 'pending').length
      const flagged  = all.filter(p => p.approval_status === 'flagged').length

      // This week
      const now    = new Date()
      const wStart = startOfWeek(now, { weekStartsOn: 1 })
      const wEnd   = endOfWeek(now, { weekStartsOn: 1 })
      const week   = all.filter(p => {
        try { return isWithinInterval(parseISO(p.uploaded_at), { start: wStart, end: wEnd }) } catch { return false }
      }).length

      return { id: d.id, name: d.name, location: d.location, brand: d.brand,
               total: all.length, pending, flagged, approvalRate: rate, thisWeek: week }
    }).filter(d => d.total > 0 || d.thisWeek > 0)

    const totalPosts   = activePosts.length
    const totalPending = activePosts.filter(p => p.approval_status === 'pending').length
    const decided      = activePosts.filter(p => ['approved','published','flagged'].includes(p.approval_status))
    const overallRate  = decided.length > 0
      ? Math.round((decided.filter(p => ['approved','published'].includes(p.approval_status)).length / decided.length) * 100)
      : null

    // Platform breakdown
    const platforms = {}
    activePosts.forEach(p => { platforms[p.platform] = (platforms[p.platform] || 0) + 1 })

    const currentDealer = currentDealerId
      ? dealers.find(d => d.id === currentDealerId) || null
      : null

    return { dealers, totalPosts, totalPending, overallRate, platforms, currentDealer }
  }, [posts, currentDealerId])

  useEffect(() => {
    if (open && !minimized) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, minimized])

  useEffect(() => {
    if (open && !minimized) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open, minimized])

  const send = useCallback(async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    setError('')
    const updated = [...messages, { role: 'user', content: msg }]
    setMessages(updated)
    setLoading(true)
    if (!open || minimized) setUnread(u => u + 1)

    try {
      const res = await fetch('/api/analytics-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: updated,
          context: {
            currentPage,
            currentDealer: analyticsContext.currentDealer?.name || null,
            totalPosts:    analyticsContext.totalPosts,
            totalPending:  analyticsContext.totalPending,
            overallRate:   analyticsContext.overallRate,
            platforms:     analyticsContext.platforms,
            dealers:       analyticsContext.dealers.map(d =>
              `${d.name} (${d.location}, ${d.brand}): ${d.total} posts, ${d.approvalRate != null ? d.approvalRate + '% approval' : 'no data'}, ${d.pending} pending, ${d.flagged} flagged, ${d.thisWeek} this week`
            ),
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [input, messages, loading, analyticsContext, currentPage, open, minimized])

  const openChat = () => { setOpen(true); setMin(false); setUnread(0) }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={openChat}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', boxShadow: '0 8px 24px rgba(99,102,241,0.45)' }}
          title="Chat with your data"
        >
          <MessageSquare size={22} className="text-white" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className={`fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] rounded-2xl shadow-2xl flex flex-col transition-all overflow-hidden ${minimized ? 'h-14' : 'h-[520px]'}`}
          style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.18), 0 8px 16px rgba(99,102,241,0.15)' }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 cursor-pointer select-none"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}
            onClick={() => setMin(m => !m)}>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Sparkles size={15} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">Ask about your data</p>
              <p className="text-xs text-indigo-200 truncate">
                {analyticsContext.currentDealer
                  ? `📍 Viewing ${analyticsContext.currentDealer.name}`
                  : `On: ${currentPage}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={e => { e.stopPropagation(); setMin(m => !m) }}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                <Minus size={13} />
              </button>
              <button onClick={e => { e.stopPropagation(); setOpen(false) }}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                <X size={13} />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto bg-white px-4 py-3 space-y-4">

                {/* Welcome message */}
                {messages.length === 0 && (
                  <div className="space-y-4">
                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles size={13} className="text-indigo-600" />
                      </div>
                      <div className="bg-slate-50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-700 leading-relaxed max-w-[85%]">
                        {analyticsContext.currentDealer
                          ? <>Hey! I can see you're looking at <strong>{analyticsContext.currentDealer.name}</strong>. What would you like to know about their performance?</>
                          : <>Hey! I have data on all {analyticsContext.dealers.length} active dealerships. Ask me anything — content strategy, approval rates, what's working, or what needs attention.</>
                        }
                      </div>
                    </div>

                    {/* Starters */}
                    <div className="pl-9 flex flex-wrap gap-2">
                      {STARTERS.map(s => (
                        <button key={s} onClick={() => send(s)}
                          className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors text-left">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conversation */}
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold ${
                      m.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-100 text-indigo-600'
                    }`}>
                      {m.role === 'user' ? 'U' : <Sparkles size={12} />}
                    </div>
                    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                        : 'bg-slate-50 text-slate-700 rounded-tl-sm'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Sparkles size={12} className="text-indigo-600" />
                    </div>
                    <div className="bg-slate-50 rounded-2xl rounded-tl-sm px-4 py-3.5 flex items-center gap-1.5">
                      {[0,1,2].map(i => (
                        <span key={i} className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <p className="text-xs text-rose-500 pl-9">{error}</p>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="flex-shrink-0 bg-white border-t border-slate-100 px-3 py-3">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                    placeholder="Ask about any dealership…"
                    disabled={loading}
                    className="flex-1 text-sm px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 disabled:opacity-50 bg-slate-50"
                  />
                  <button onClick={() => send()} disabled={!input.trim() || loading}
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white disabled:opacity-40 transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                    <Send size={15} />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 px-1">
                  Based on your platform data + AI training. Not live web data.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
