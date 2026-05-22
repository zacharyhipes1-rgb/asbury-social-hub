import { createContext, useContext, useState, useCallback } from 'react'

const InvitesContext = createContext(null)

const STORAGE_KEY = 'asbury_invites'

function loadInvites() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function saveInvites(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {}
}

function newUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export function InvitesProvider({ children }) {
  const [invites, setInvites] = useState(() => loadInvites())

  // Wrapped setState that also persists to localStorage synchronously
  const persist = useCallback((updater) => {
    setInvites(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveInvites(next)
      return next
    })
  }, [])

  const createInvite = useCallback(({ email, name, role, currentUser }) => {
    const invite = {
      id:               newUUID(),
      token:            newUUID(),
      email:            email.trim().toLowerCase(),
      name:             name?.trim() || null,
      role:             role || 'social_media',
      invited_by:       currentUser?.email || '',
      invited_by_name:  currentUser?.name  || '',
      created_at:       new Date().toISOString(),
      expires_at:       new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status:           'pending',
    }
    persist(prev => [invite, ...prev])
    return invite
  }, [persist])

  const revokeInvite = useCallback((id) => {
    persist(prev => prev.map(i => i.id === id ? { ...i, status: 'revoked' } : i))
  }, [persist])

  // Generates a fresh token + expiry, returns the updated invite object
  const resendInvite = useCallback((id) => {
    const newToken  = newUUID()
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    let updated = null
    persist(prev => prev.map(i => {
      if (i.id !== id) return i
      updated = { ...i, token: newToken, expires_at: newExpiry, status: 'pending' }
      return updated
    }))
    return updated
  }, [persist])

  // Call this when a user completes signup via an invite link
  const acceptInvite = useCallback((token) => {
    persist(prev => prev.map(i =>
      i.token === token
        ? { ...i, status: 'accepted', accepted_at: new Date().toISOString() }
        : i
    ))
  }, [persist])

  // Read directly from localStorage so it works on the invite recipient's machine
  // even before the InvitesProvider has seen an update from the inviting admin
  const getInviteByToken = useCallback((token) => {
    return invites.find(i => i.token === token) || null
  }, [invites])

  const getValidInvite = useCallback((token) => {
    const invite = invites.find(i => i.token === token)
    if (!invite) return null
    if (invite.status !== 'pending') return null
    if (new Date(invite.expires_at) < new Date()) return null
    return invite
  }, [invites])

  return (
    <InvitesContext.Provider value={{
      invites,
      createInvite,
      revokeInvite,
      resendInvite,
      acceptInvite,
      getInviteByToken,
      getValidInvite,
    }}>
      {children}
    </InvitesContext.Provider>
  )
}

export function useInvites() {
  const ctx = useContext(InvitesContext)
  if (!ctx) throw new Error('useInvites must be used within InvitesProvider')
  return ctx
}
