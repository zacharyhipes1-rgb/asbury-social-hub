import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useUsers } from './UsersContext'
import { verifyPassword } from '../utils/auth'
import IdleWarningModal from '../components/common/IdleWarningModal'

// ── Session / idle constants ───────────────────────────────────────────────
const IDLE_TIMEOUT_MS = 2 * 60 * 1000   // 2 minutes
const IDLE_WARN_MS    = 30 * 1000        // warn 30 s before auto-logout
const ACTIVITY_KEY    = 'asbury_last_activity'
export const EXPIRED_KEY = 'asbury_session_expired'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { getUserByEmail, getUserById, initialized } = useUsers()
  const [currentUser, setCurrentUser] = useState(null)
  const [authLoaded, setAuthLoaded]   = useState(false)
  const [loginError, setLoginError]   = useState('')
  const [showIdleWarning, setShowIdleWarning] = useState(false)
  const [idleCountdown,   setIdleCountdown]   = useState(IDLE_WARN_MS / 1000)

  // ── Restore session on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!initialized) return
    try {
      const saved = localStorage.getItem('asbury_current_user')
      if (saved) {
        const parsed = JSON.parse(saved)
        const fresh  = getUserById(parsed.id)
        if (fresh?.active) setCurrentUser(fresh)
      }
    } catch {}
    setAuthLoaded(true)
  }, [initialized]) // eslint-disable-line

  // ── Persist session (strip password_hash) ─────────────────────────────
  useEffect(() => {
    if (!authLoaded) return
    if (currentUser) {
      const { password_hash, ...safe } = currentUser
      localStorage.setItem('asbury_current_user', JSON.stringify(safe))
    } else {
      localStorage.removeItem('asbury_current_user')
      localStorage.removeItem(ACTIVITY_KEY)
    }
  }, [currentUser, authLoaded])

  // ── Idle activity tracker ─────────────────────────────────────────────
  const stayActive = useCallback(() => {
    localStorage.setItem(ACTIVITY_KEY, Date.now().toString())
    setShowIdleWarning(false)
    setIdleCountdown(IDLE_WARN_MS / 1000)
  }, [])

  useEffect(() => {
    if (!currentUser) {
      setShowIdleWarning(false)
      return
    }

    // Stamp activity on login / page focus
    stayActive()

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach(e => window.addEventListener(e, stayActive, { passive: true }))

    const tick = setInterval(() => {
      const last      = parseInt(localStorage.getItem(ACTIVITY_KEY) || '0', 10)
      const elapsed   = Date.now() - last
      const remaining = IDLE_TIMEOUT_MS - elapsed

      if (remaining <= 0) {
        // Auto-logout — mark session expired so login page shows a banner
        localStorage.setItem(EXPIRED_KEY, 'true')
        setCurrentUser(null)
        setShowIdleWarning(false)
      } else if (remaining <= IDLE_WARN_MS) {
        setIdleCountdown(Math.ceil(remaining / 1000))
        setShowIdleWarning(true)
      } else {
        setShowIdleWarning(false)
      }
    }, 1000)

    return () => {
      events.forEach(e => window.removeEventListener(e, stayActive))
      clearInterval(tick)
    }
  }, [currentUser, stayActive])

  // ── Auth actions ──────────────────────────────────────────────────────
  const login = async (email, password) => {
    setLoginError('')
    const user = getUserByEmail(email)
    if (!user) {
      setLoginError('No account found with that email address.')
      return false
    }
    if (!user.active) {
      setLoginError('This account has been deactivated. Contact your administrator.')
      return false
    }
    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      setLoginError('Incorrect password. Please try again.')
      return false
    }
    setCurrentUser(user)
    return true
  }

  const logout = () => {
    // Normal logout — do NOT set EXPIRED_KEY
    setCurrentUser(null)
  }

  const refreshCurrentUser = () => {
    if (!currentUser) return
    const fresh = getUserById(currentUser.id)
    if (fresh?.active) setCurrentUser(fresh)
  }

  const isAdmin      = currentUser?.role === 'admin'
  const isSocialMedia = currentUser?.role === 'social_media' || isAdmin
  const isViewer     = currentUser?.role === 'viewer'

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        refreshCurrentUser,
        isAdmin,
        isSocialMedia,
        isViewer,
        loginError,
        authLoaded,
      }}
    >
      {children}

      {/* Idle warning modal — rendered inside Provider so it can call stayActive */}
      {showIdleWarning && currentUser && (
        <IdleWarningModal countdown={idleCountdown} onStay={stayActive} />
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
