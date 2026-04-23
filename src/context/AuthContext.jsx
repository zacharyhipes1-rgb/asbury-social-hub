import { createContext, useContext, useState, useEffect } from 'react'
import { useUsers } from './UsersContext'
import { verifyPassword } from '../utils/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { getUserByEmail, getUserById, initialized } = useUsers()
  const [currentUser, setCurrentUser] = useState(null)
  const [authLoaded, setAuthLoaded] = useState(false)
  const [loginError, setLoginError] = useState('')

  useEffect(() => {
    if (!initialized) return

    try {
      // headless/demo capture via URL param
      const params = new URLSearchParams(window.location.search)
      const autoId = params.get('autouser')
      if (autoId) {
        const u = getUserById(autoId)
        if (u && u.active) {
          setCurrentUser(u)
          setAuthLoaded(true)
          return
        }
      }

      const saved = localStorage.getItem('asbury_current_user')
      if (saved) {
        const parsed = JSON.parse(saved)
        const fresh = getUserById(parsed.id)
        if (fresh?.active) setCurrentUser(fresh)
      }
    } catch {}

    setAuthLoaded(true)
  }, [initialized]) // eslint-disable-line

  useEffect(() => {
    if (currentUser) {
      const { password_hash, ...safe } = currentUser
      localStorage.setItem('asbury_current_user', JSON.stringify(safe))
    } else {
      localStorage.removeItem('asbury_current_user')
    }
  }, [currentUser])

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

  const logout = () => setCurrentUser(null)

  const refreshCurrentUser = () => {
    if (!currentUser) return
    const fresh = getUserById(currentUser.id)
    if (fresh?.active) setCurrentUser(fresh)
  }

  const isAdmin = currentUser?.role === 'admin'
  const isSocialMedia = currentUser?.role === 'social_media' || isAdmin
  const isViewer = currentUser?.role === 'viewer'

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
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
