import { createContext, useContext, useState, useEffect } from 'react'
import { MOCK_USERS } from '../data/mockData'
import { hashPassword } from '../utils/auth'

const UsersContext = createContext(null)

function initials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function UsersProvider({ children }) {
  const [users, setUsers] = useState([])
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('asbury_users')
    if (saved) {
      const parsed = JSON.parse(saved)
      const existingEmails = new Set(parsed.map(u => u.email.toLowerCase()))
      const missing = MOCK_USERS.filter(u => !existingEmails.has(u.email.toLowerCase()))

      // Patch stale titles for existing users (e.g. wrong title from old seed)
      const TITLE_PATCHES = { 'zhipes@asburyauto.com': 'SEO | AEO Strategist' }
      const patched = parsed.map(u => {
        const fix = TITLE_PATCHES[u.email.toLowerCase()]
        return fix && u.title !== fix ? { ...u, title: fix } : u
      })

      if (missing.length > 0) {
        Promise.all(
          missing.map(async (u) => ({
            ...u,
            password_hash: await hashPassword(u.defaultPassword),
            active: true,
            created_at: '2026-01-15T09:00:00.000Z',
          }))
        ).then((newUsers) => {
          setUsers([...newUsers, ...patched])
          setInitialized(true)
        })
      } else {
        setUsers(patched)
        setInitialized(true)
      }
    } else {
      Promise.all(
        MOCK_USERS.map(async (u) => ({
          ...u,
          password_hash: await hashPassword(u.defaultPassword),
          active: true,
          created_at: '2026-01-15T09:00:00.000Z',
        }))
      ).then((hashed) => {
        setUsers(hashed)
        setInitialized(true)
      })
    }
  }, [])

  useEffect(() => {
    if (initialized) {
      localStorage.setItem('asbury_users', JSON.stringify(users))
    }
  }, [users, initialized])

  const addUser = async ({ name, email, role, title, password }) => {
    const user = {
      id: `user-${Date.now()}`,
      name,
      email,
      role,
      title: title || '',
      initials: initials(name),
      password_hash: await hashPassword(password),
      active: true,
      created_at: new Date().toISOString(),
    }
    setUsers((prev) => [...prev, user])
    return user
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
