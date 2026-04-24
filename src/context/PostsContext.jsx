import { createContext, useContext, useReducer, useEffect } from 'react'
import { MOCK_POSTS } from '../data/mockData'

const PostsContext = createContext(null)

function postsReducer(state, action) {
  switch (action.type) {
    case 'ADD_POST':
      return [action.post, ...state]

    case 'UPDATE_POST':
      return state.map(p => p.id === action.id ? { ...p, ...action.updates } : p)

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

function loadPosts() {
  try {
    const saved = localStorage.getItem('asbury_posts')
    return saved ? JSON.parse(saved) : MOCK_POSTS
  } catch {
    return MOCK_POSTS
  }
}

export function PostsProvider({ children }) {
  const [posts, dispatch] = useReducer(postsReducer, null, loadPosts)

  useEffect(() => {
    localStorage.setItem('asbury_posts', JSON.stringify(posts))
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
