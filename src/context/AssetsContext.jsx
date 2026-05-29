import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  uploadToCloudinary,
  deriveThumbnailUrl,
  validateFile,
} from '../lib/cloudinary'

const AssetsContext = createContext(null)

// Supabase row → app shape
function fromRow(r) {
  return {
    id:                r.id,
    file_name:         r.file_name,
    file_size:         r.file_size,
    file_type:         r.file_type,
    file_url:          r.file_url,
    thumbnail_url:     r.thumbnail_url,
    title:             r.title        || '',
    alt_text:          r.alt_text     || '',
    description:       r.description  || '',
    tags:              Array.isArray(r.tags) ? r.tags : [],
    folder_id:         r.folder_id || null,
    uploaded_by:       r.uploaded_by,
    uploaded_by_name:  r.uploaded_by_name,
    uploaded_at:       r.uploaded_at,
    deleted:           !!r.deleted,
  }
}

function normalizeTags(raw) {
  return [...new Set((raw || []).map(t => t.trim().toLowerCase()).filter(Boolean))]
}

export function AssetsProvider({ children }) {
  const [assets, setAssets] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [tableMissing, setTableMissing] = useState(false)

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('deleted', false)
      .order('uploaded_at', { ascending: false })
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        if (!tableMissing) console.warn('[Assets] table "assets" not found — run supabase-schema.sql to create it.')
        setTableMissing(true)
        setAssets([])
      } else {
        console.error('[Assets] fetch failed:', error.message || error)
        setAssets([])
      }
    } else {
      setTableMissing(false)
      setAssets((data || []).map(fromRow))
    }
    setLoaded(true)
  }, [tableMissing])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Realtime + 8s polling fallback
  useEffect(() => {
    if (tableMissing) return
    const channel = supabase
      .channel('assets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => fetchAll())
      .subscribe()
    const poll = setInterval(fetchAll, 8000)
    return () => { supabase.removeChannel(channel); clearInterval(poll) }
  }, [fetchAll, tableMissing])

  const addAsset = useCallback(async ({ file, title, altText, description, tags, folderId, currentUser }) => {
    const validationError = validateFile(file)
    if (validationError) throw new Error(validationError)

    const { secure_url } = await uploadToCloudinary(file)
    const thumbnail_url = deriveThumbnailUrl(secure_url, file.type)

    const row = {
      file_name:        file.name,
      file_size:        file.size,
      file_type:        file.type,
      file_url:         secure_url,
      thumbnail_url,
      title:            (title       || '').trim().slice(0, 200),
      alt_text:         (altText     || '').trim().slice(0, 500),
      description:      (description || '').trim().slice(0, 500),
      tags:             normalizeTags(tags),
      folder_id:        folderId || null,
      uploaded_by:      currentUser?.email,
      uploaded_by_name: currentUser?.name,
    }

    const { data, error } = await supabase.from('assets').insert(row).select().single()
    if (error) throw new Error(error.message || 'Failed to save asset.')

    const fresh = fromRow(data)
    setAssets(prev => [fresh, ...prev.filter(a => a.id !== fresh.id)])
    return fresh
  }, [])

  const updateAssetTags = useCallback(async (id, tags) => {
    const { data, error } = await supabase
      .from('assets')
      .update({ tags: normalizeTags(tags) })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message || 'Failed to update tags.')
    const fresh = fromRow(data)
    setAssets(prev => prev.map(a => a.id === id ? fresh : a))
    return fresh
  }, [])

  // Update any combination of title, alt_text, description, tags on an asset
  const updateAsset = useCallback(async (id, updates) => {
    const patch = {}
    if (updates.title       !== undefined) patch.title       = (updates.title       || '').trim().slice(0, 200)
    if (updates.alt_text    !== undefined) patch.alt_text    = (updates.alt_text    || '').trim().slice(0, 500)
    if (updates.description !== undefined) patch.description = (updates.description || '').trim().slice(0, 500)
    if (updates.tags        !== undefined) patch.tags        = normalizeTags(updates.tags)
    if (!Object.keys(patch).length) return

    const { data, error } = await supabase
      .from('assets')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message || 'Failed to update asset.')
    const fresh = fromRow(data)
    setAssets(prev => prev.map(a => a.id === id ? fresh : a))
    return fresh
  }, [])

  const moveAsset = useCallback(async (id, folderId) => {
    // Optimistic update first for snappy feel
    setAssets(prev => prev.map(a => a.id === id ? { ...a, folder_id: folderId || null } : a))
    const { data, error } = await supabase
      .from('assets')
      .update({ folder_id: folderId || null })
      .eq('id', id)
      .select()
      .single()
    if (error) {
      // Rollback optimistic update
      fetchAll()
      throw new Error(error.message || 'Failed to move asset.')
    }
    const fresh = fromRow(data)
    setAssets(prev => prev.map(a => a.id === id ? fresh : a))
    return fresh
  }, [fetchAll])

  const softDeleteAsset = useCallback(async (id) => {
    const { error } = await supabase
      .from('assets')
      .update({ deleted: true })
      .eq('id', id)
    if (error) throw new Error(error.message || 'Failed to delete asset.')
    setAssets(prev => prev.filter(a => a.id !== id))
  }, [])

  const getAssetById = useCallback(
    (id) => assets.find(a => a.id === id) || null,
    [assets]
  )

  const searchAssets = useCallback((query) => {
    const q = (query || '').trim().toLowerCase()
    if (!q) return assets
    return assets.filter(a =>
      a.file_name?.toLowerCase().includes(q) ||
      a.title?.toLowerCase().includes(q) ||
      a.alt_text?.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q) ||
      (a.tags || []).some(t => t.includes(q))
    )
  }, [assets])

  return (
    <AssetsContext.Provider
      value={{
        assets,
        loaded,
        tableMissing,
        addAsset,
        updateAsset,
        updateAssetTags,
        moveAsset,
        softDeleteAsset,
        getAssetById,
        searchAssets,
      }}
    >
      {children}
    </AssetsContext.Provider>
  )
}

export function useAssets() {
  const ctx = useContext(AssetsContext)
  if (!ctx) throw new Error('useAssets must be used within AssetsProvider')
  return ctx
}
