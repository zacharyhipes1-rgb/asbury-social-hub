import { createContext, useContext, useReducer, useEffect } from 'react'
import { MOCK_POSTS } from '../data/mockData'

const PostsContext = createContext(null)

function postsReducer(state, action) {
  switch (action.type) {
    case 'ADD_POST':
      return [action.post, ...state]

    case 'DELETE_POST':
      return state.map(p =>
        p.id === action.id
          ? { ...p, approval_status: 'deleted', chad_action_at: new Date().toISOString() }
          : p
      )

    case 'APPROVE_POST':
      return state.map(p =>
        p.id === action.id
          ? { ...p, approval_status: 'approved', chad_notes: action.notes || p.chad_notes, chad_action_at: new Date().toISOString() }
          : p
      )

    case 'FLAG_POST':
      return state.map(p =>
        p.id === action.id
          ? { ...p, approval_status: 'flagged', chad_notes: action.notes, chad_action_at: new Date().toISOString() }
          : p
      )

    case 'RESCHEDULE_POST':
      return state.map(p =>
        p.id === action.id
          ? { ...p, scheduled_for: action.date }
          : p
      )

    case 'PUBLISH_POST':
      return state.map(p =>
        p.id === action.id
          ? { ...p, approval_status: 'published', published_at: new Date().toISOString() }
          : p
      )

    case 'UPDATE_POST':
      return state.map(p =>
        p.id === action.id
          ? { ...p, ...action.updates, approval_status: 'pending', chad_notes: null, chad_action_at: null }
          : p
      )

    default:
      return state
  }
}

// Remap old fake uploader emails → real team members
const UPLOADER_PATCHES = {
  'sarah.johnson@asburyauto.com': { email: 'rniblett@asburyauto.com', name: 'Rikki Niblett' },
  'mike.torres@asburyauto.com':   { email: 'bmcdaniel@asburyauto.com', name: 'Ben Mcdaniel' },
  'alex.rivera@asburyauto.com':   { email: 'rniblett@asburyauto.com', name: 'Rikki Niblett' },
}

function loadPosts() {
  try {
    const saved = localStorage.getItem('asbury_posts')
    if (!saved) return MOCK_POSTS
    const parsed = JSON.parse(saved)

    // Restore any locally-stored file previews (kept in a separate key to avoid quota bloat)
    let previews = {}
    try { previews = JSON.parse(localStorage.getItem('asbury_post_previews') || '{}') } catch {}

    return parsed.map(p => {
      const patch = UPLOADER_PATCHES[p.uploaded_by?.toLowerCase()]
      const base = patch
        ? { ...p, uploaded_by: patch.email, uploaded_by_name: patch.name }
        : p
      return previews[p.id] ? { ...base, file_preview: previews[p.id] } : base
    })
  } catch {
    return MOCK_POSTS
  }
}

export function PostsProvider({ children }) {
  const [posts, dispatch] = useReducer(postsReducer, null, loadPosts)

  useEffect(() => {
    try {
      // Strip file_preview (base64 blobs can be several MB — they'd blow the 5 MB localStorage quota)
      // Store them in a separate key so the main posts JSON stays small and saves reliably.
      const stripped = posts.map(({ file_preview, ...rest }) => rest) // eslint-disable-line no-unused-vars
      localStorage.setItem('asbury_posts', JSON.stringify(stripped))
    } catch (e) {
      console.warn('[PostsContext] posts save failed:', e)
    }

    // Save previews separately — gracefully drop them if they're still too large
    try {
      const previews = {}
      posts.forEach(p => { if (p.file_preview) previews[p.id] = p.file_preview })
      if (Object.keys(previews).length > 0) {
        localStorage.setItem('asbury_post_previews', JSON.stringify(previews))
      }
    } catch {
      // Previews too large — they'll be gone after a refresh but that's acceptable
    }
  }, [posts])

  const addPost = (postData) => {
    const post = {
      ...postData,
      id: `post-${Date.now()}`,
      uploaded_at: new Date().toISOString(),
      approval_status: 'pending',
      chad_notes: null,
      chad_action_at: null,
    }
    dispatch({ type: 'ADD_POST', post })
    return post
  }

  const approvePost = (id, notes = '') =>
    dispatch({ type: 'APPROVE_POST', id, notes })

  const flagPost = (id, notes) =>
    dispatch({ type: 'FLAG_POST', id, notes })

  const deletePost = (id) =>
    dispatch({ type: 'DELETE_POST', id })

  const reschedulePost = (id, date) =>
    dispatch({ type: 'RESCHEDULE_POST', id, date })

  const publishPost = (id) =>
    dispatch({ type: 'PUBLISH_POST', id })

  const updatePost = (id, updates) =>
    dispatch({ type: 'UPDATE_POST', id, updates })

  const getPostsByDealership = (dealershipId) =>
    posts.filter(p => p.dealership_id === dealershipId && p.approval_status !== 'deleted')

  const getPendingPosts = () =>
    posts.filter(p => p.approval_status === 'pending')

  const getPostById = (id) =>
    posts.find(p => p.id === id)

  return (
    <PostsContext.Provider value={{
      posts,
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
