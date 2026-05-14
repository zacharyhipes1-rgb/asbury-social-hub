import { createContext, useContext, useState, useEffect } from 'react'
import { MOCK_USERS } from '../data/mockData'
import { hashPassword } from '../utils/auth'

const UsersContext = createContext(null)

const STORAGE_KEY = 'asbury_users'
const SCHEMA_VERSION_KEY = 'asbury_users_schema'
const SCHEMA_VERSION = 'v2-single-demo'

function initials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// Random 32-byte hex string — used as a placeholder password for seeded real users
// who don't have a defaultPassword. Effectively locks the account until the user
// resets via the Forgot Password flow.
function randomLockoutSecret() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function seedUserFromMock(u) {
  const secret = u.defaultPassword || randomLockoutSecret()
  return {
    ...u,
    password_hash: await hashPassword(secret),
    needs_password_reset: !u.defaultPassword,
    active: true,
    created_at: '2026-01-15T09:00:00.000Z',
  }
}

function stripUiOnlyFields(users) {
  return users.map(({ defaultPassword, ...rest }) => rest)
}

export function UsersProvider({ children }) {
  const [users, setUsers] = useState([])
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const seedFromMock = () =>
      Promise.all(MOCK_USERS.map(seedUserFromMock))
        .then((hashed) => { setUsers(stripUiOnlyFields(hashed)); setInitialized(true) })
        .catch(() => { setUsers([]); setInitialized(true) })

    try {
      const storedVersion = localStorage.getItem(SCHEMA_VERSION_KEY)
      if (storedVersion !== SCHEMA_VERSION) {
        // Schema changed — wipe stale localStorage and re-seed from mock
        localStorage.removeItem(STORAGE_KEY)
        localStorage.setItem(SCHEMA_VERSION_KEY, SCHEMA_VERSION)
        seedFromMock()
        return
      }

      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) { seedFromMock(); return }

      const parsed = JSON.parse(saved)

      // Strip fake users — keep only real team member emails
      const realEmails = new Set(MOCK_USERS.map(u => u.email.toLowerCase()))
      const cleaned = parsed.filter(u => realEmails.has(u.email?.toLowerCase()))

      // Patch stale titles
      const TITLE_PATCHES = { 'zhipes@asburyauto.com': 'SEO | AEO Strategist' }
      const patched = cleaned.map(u => {
        const fix = TITLE_PATCHES[u.email.toLowerCase()]
        return fix && u.title !== fix ? { ...u, title: fix } : u
      })

      // Add any MOCK_USERS not yet in localStorage
      const existingEmails = new Set(patched.map(u => u.email.toLowerCase()))
      const missing = MOCK_USERS.filter(u => !existingEmails.has(u.email.toLowerCase()))

      if (missing.length > 0) {
        Promise.all(missing.map(seedUserFromMock))
          .then((newUsers) => {
            setUsers(stripUiOnlyFields([...newUsers, ...patched]))
            setInitialized(true)
          })
          .catch(() => seedFromMock())
      } else {
        setUsers(patched)
        setInitialized(true)
      }
    } catch {
      seedFromMock()
    }
  }, [])

  useEffect(() => {
    if (initialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
    }
  }, [users, initialized])

  const addUser = async ({ name, email, role, title, password, active = true }) => {
    const user = {
      id: `user-${Date.now()}`,
      name,
      email,
      role,
      title: title || '',
      initials: initials(name),
      password_hash: await hashPassword(password),
      active,
      created_at: new Date().toISOString(),
    }
    setUsers((prev) => [...prev, user])
    return user
  }

  const setPasswordByEmail = async (email, newPassword) => {
    const normalized = email.trim().toLowerCase()
    const existing = users.find(u => u.email.toLowerCase() === normalized)
    if (!existing) return false
    const password_hash = await hashPassword(newPassword)
    setUsers((prev) =>
      prev.map((u) =>
        u.email.toLowerCase() === normalized
          ? { ...u, password_hash, needs_password_reset: false }
          : u
      )
    )
    return true
  }

  const updateUser = async (id, updates) => {
    const extra = {}
    if (updates.password?.trim()) {
      extra.password_hash = await hashPassword(updates.password)
    }
    if (updates.name) extra.initials = initials(updates.name)
    const { password, ...safe } = updates
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...safe, ...extra } : u))
    )
  }

  const deactivateUser = (id) =>
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active: false } : u)))

  const reactivateUser = (id) =>
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active: true } : u)))

  const deleteUser = (id) =>
    setUsers((prev) => prev.filter((u) => u.id !== id))

  const getUserByEmail = (email) =>
    users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())

  const getUserById = (id) => users.find((u) => u.id === id)

  const getActiveUsers = () => users.filter((u) => u.active)

  const getSocialTeam = () => users.filter((u) => u.active && u.role === 'social_media')

  const getAdmins = () => users.filter((u) => u.active && u.role === 'admin')

  return (
    <UsersContext.Provider
      value={{
        users,
        initialized,
        addUser,
        updateUser,
        deactivateUser,
        reactivateUser,
        deleteUser,
        setPasswordByEmail,
        getUserByEmail,
        getUserById,
        getActiveUsers,
        getSocialTeam,
        getAdmins,
      }}
    >
      {children}
    </UsersContext.Provider>
  )
}

export function useUsers() {
  const ctx = useContext(UsersContext)
  if (!ctx) throw new Error('useUsers must be used within UsersProvider')
  return ctx
}
