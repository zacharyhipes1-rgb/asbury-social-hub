import { createContext, useContext, useReducer, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MOCK_POSTS } from '../data/mockData'

const PostsContext = createContext(null)

// ─── Local state reducer ──────────────────────────────────────────────────────
// Handles optimistic updates so the UI is instant even before Supabase confirms.
// Real-time subscription handles incoming changes from all other browsers/logins.
function postsReducer(state, action) {
  switch (action.type) {
    case 'SET_POSTS':
      return action.posts

    case 'ADD_POST':
      // Guard against real-time echoing back our own insert
      if (state.find(p => p.id === action.post.id)) return state
      return [action.post, ...state]

    case 'UPDATE_ONE':
      return state.map(p =>
        p.id === action.id ? { ...p, ...action.updates } : p
      )

    default:
      return state
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function PostsProvider({ children }) {
  const [posts, dispatch] = useReducer(postsReducer, [])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    loadPosts()

    // ── Real-time subscription ─────────────────────────────────────────────
    // Supabase broadcasts any INSERT/UPDATE on the posts table to every
    // connected client simultaneously — no polling, no storage events needed.
    const channel = supabase
      .channel('posts-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        ({ eventType, new: row }) => {
          if (eventType === 'INSERT') {
            dispatch({ type: 'ADD_POST', post: row })
          } else if (eventType === 'UPDATE') {
            dispatch({ type: 'UPDATE_ONE', id: row.id, updates: row })
          }
          // DELETE not used — we soft-delete by setting approval_status = 'deleted'
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function loadPosts() {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('uploaded_at', { ascending: false })

      if (error) throw error

      if (!data || data.length === 0) {
        // First-time setup: seed the database with demo posts
        const { error: seedErr } = await supabase.from('posts').insert(MOCK_POSTS)
        if (seedErr) throw seedErr
        dispatch({ type: 'SET_POSTS', posts: MOCK_POSTS })
      } else {
        dispatch({ type: 'SET_POSTS', posts: data })
      }
    } catch (err) {
      console.error('[PostsContext] load failed:', err)
      // Fallback: show mock data locally so the UI never breaks
      dispatch({ type: 'SET_POSTS', posts: MOCK_POSTS })
    } finally {
      setLoading(false)
    }
  }

  // ── Mutators — each optimistically updates local state, then writes to Supabase
  // Supabase real-time then broadcasts the change to every other open session.

  const addPost = async (postData) => {
    const post = {
      ...postData,
      id:              `post-${Date.now()}`,
      uploaded_at:     new Date().toISOString(),
      approval_status: 'pending',
      chad_notes:      null,
      chad_action_at:  null,
    }
    dispatch({ type: 'ADD_POST', post })                            // Instant UI
    const { error } = await supabase.from('posts').insert(post)     // Persist + broadcast
    if (error) console.error('[PostsContext] addPost:', error)
    return post
  }

  const approvePost = async (id, notes = '') => {
    const updates = {
      approval_status: 'approved',
      chad_notes:      notes || null,
      chad_action_at:  new Date().toISOString(),
    }
    dispatch({ type: 'UPDATE_ONE', id, updates })
    const { error } = await supabase.from('posts').update(updates).eq('id', id)
    if (error) console.error('[PostsContext] approvePost:', error)
  }

  const flagPost = async (id, notes) => {
    const updates = {
      approval_status: 'flagged',
      chad_notes:      notes,
      chad_action_at:  new Date().toISOString(),
    }
    dispatch({ type: 'UPDATE_ONE', id, updates })
    const { error } = await supabase.from('posts').update(updates).eq('id', id)
    if (error) console.error('[PostsContext] flagPost:', error)
  }

  const deletePost = async (id) => {
    const updates = {
      approval_status: 'deleted',
      chad_action_at:  new Date().toISOString(),
    }
    dispatch({ type: 'UPDATE_ONE', id, updates })
    const { error } = await supabase.from('posts').update(updates).eq('id', id)
    if (error) console.error('[PostsContext] deletePost:', error)
  }

  const reschedulePost = async (id, date) => {
    const updates = { scheduled_for: date }
    dispatch({ type: 'UPDATE_ONE', id, updates })
    const { error } = await supabase.from('posts').update(updates).eq('id', id)
    if (error) console.error('[PostsContext] reschedulePost:', error)
  }

  const publishPost = async (id) => {
    const updates = {
      approval_status: 'published',
      published_at:    new Date().toISOString(),
    }
    dispatch({ type: 'UPDATE_ONE', id, updates })
    const { error } = await supabase.from('posts').update(updates).eq('id', id)
    if (error) console.error('[PostsContext] publishPost:', error)
  }

  const updatePost = async (id, updates) => {
    const fullUpdates = {
      ...updates,
      approval_status: 'pending',
      chad_notes:      null,
      chad_action_at:  null,
    }
    dispatch({ type: 'UPDATE_ONE', id, updates: fullUpdates })
    const { error } = await supabase.from('posts').update(fullUpdates).eq('id', id)
    if (error) console.error('[PostsContext] updatePost:', error)
  }

  // ── Selectors ─────────────────────────────────────────────────────────────
  const getPostsByDealership = (dealershipId) =>
    posts.filter(p => p.dealership_id === dealershipId && p.approval_status !== 'deleted')

  const getPendingPosts = () =>
    posts.filter(p => p.approval_status === 'pending')

  const getPostById = (id) =>
    posts.find(p => p.id === id)

  return (
    <PostsContext.Provider value={{
      posts,
      loading,
      addPost,
      approvePost,
      flagPost,
      deletePost,
      reschedulePost,
      publishPost,
      updatePost,
      getPostsByDealership,
      getPendingPosts,
      getPostById,
    }}>
      {children}
    </PostsContext.Provider>
  )
}

export function usePosts() {
  const ctx = useContext(PostsContext)
  if (!ctx) throw new Error('usePosts must be used within PostsProvider')
  return ctx
}
