import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useUsers } from './UsersContext'
import { verifyPassword } from '../utils/auth'
import IdleWarningModal from '../components/common/IdleWarningModal'

// ── Session / idle constants ───────────────────────────────────────────────
const IDLE_TIMEOUT_MS  = 2 * 60 * 1000   // 2 minutes
const IDLE_WARN_MS     = 30 * 1000        // warn 30 s before auto-logout
const ACTIVITY_KEY     = 'asbury_last_activity'
const SESSION_IP_KEY   = 'asbury_session_ip'
export const EXPIRED_KEY = 'asbury_session_expired'

// Fetch our own serverless function — avoids third-party latency / downtime.
async function getClientIp() {
  try {
    const r = await fetch('/api/client-ip')
    if (!r.ok) return null
    const d = await r.json()
    return d.ip || null
  } catch {
    return null
  }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { getUserByEmail, getUserById, initialized } = useUsers()
  const [currentUser, setCurrentUser] = useState(null)
  const [authLoaded, setAuthLoaded]   = useState(false)
  const [loginError, setLoginError]   = useState('')
  const [showIdleWarning, setShowIdleWarning] = useState(false)
  const [idleCountdown,   setIdleCountdown]   = useState(IDLE_WARN_MS / 1000)

  // ── Restore session on mount ──────────────────────────────────────────────
  // Checks the caller's IP against the IP stored at login time.
  // Same IP  → session restored (no re-login needed, even in a new tab).
  // Diff IP  → session cleared, login required.
  // IP check fails → fail-open (restore session; password still required to
  //                  have gotten here in the first place).
  useEffect(() => {
    if (!initialized) return

    const restore = async () => {
      try {
        const saved = localStorage.getItem('asbury_current_user')
        if (saved) {
          const storedIp  = localStorage.getItem(SESSION_IP_KEY)
          let   ipAllowed = true

          if (storedIp) {
            const currentIp = await getClientIp()
            if (currentIp && currentIp !== storedIp) {
              // Different IP — wipe session, force login
              ipAllowed = false
              localStorage.removeItem('asbury_current_user')
              localStorage.removeItem(SESSION_IP_KEY)
              localStorage.removeItem(ACTIVITY_KEY)
            }
          }

          if (ipAllowed) {
            const parsed = JSON.parse(saved)
            const fresh  = getUserById(parsed.id)
            if (fresh?.active) setCurrentUser(fresh)
          }
        }
      } catch {}

      setAuthLoaded(true)
    }

    restore()
  }, [initialized]) // eslint-disable-line

  // ── Persist session (strip password_hash) ─────────────────────────────────
  useEffect(() => {
    if (!authLoaded) return
    if (currentUser) {
      const { password_hash, ...safe } = currentUser
      localStorage.setItem('asbury_current_user', JSON.stringify(safe))
    } else {
      localStorage.removeItem('asbury_current_user')
      localStorage.removeItem(ACTIVITY_KEY)
      localStorage.removeItem(SESSION_IP_KEY)
    }
  }, [currentUser, authLoaded])

  // ── Idle activity tracker ─────────────────────────────────────────────────
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

    stayActive()

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach(e => window.addEventListener(e, stayActive, { passive: true }))

    const tick = setInterval(() => {
      const last      = parseInt(localStorage.getItem(ACTIVITY_KEY) || '0', 10)
      const elapsed   = Date.now() - last
      const remaining = IDLE_TIMEOUT_MS - elapsed

      if (remaining <= 0) {
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

  // ── Auth actions ──────────────────────────────────────────────────────────
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
    // Record login IP so future loads from the same IP skip re-auth
    const ip = await getClientIp()
    if (ip) localStorage.setItem(SESSION_IP_KEY, ip)
    setCurrentUser(user)
    return true
  }

  const logout = () => {
    setCurrentUser(null)
  }

  const refreshCurrentUser = () => {
    if (!currentUser) return
    const fresh = getUserById(currentUser.id)
    if (fresh?.active) setCurrentUser(fresh)
  }

  const isAdmin       = currentUser?.role === 'admin'
  const isSocialMedia = currentUser?.role === 'social_media' || isAdmin
  const isViewer      = currentUser?.role === 'viewer'

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
