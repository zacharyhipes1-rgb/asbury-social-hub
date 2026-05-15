import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  uploadToCloudinary,
  deriveThumbnailUrl,
  validateFile,
} from '../lib/cloudinary'

const AssetsContext = createContext(null)

// Supabase row → app shape (camelCase passthrough for the few columns we use)
function fromRow(r) {
  return {
    id:                r.id,
    file_name:         r.file_name,
    file_size:         r.file_size,
    file_type:         r.file_type,
    file_url:          r.file_url,
    thumbnail_url:     r.thumbnail_url,
    description:       r.description || '',
    uploaded_by:       r.uploaded_by,
    uploaded_by_name:  r.uploaded_by_name,
    uploaded_at:       r.uploaded_at,
    deleted:           !!r.deleted,
  }
}

export function AssetsProvider({ children }) {
  const [assets, setAssets] = useState([])
  const [loaded, setLoaded] = useState(false)
  // tableMissing = true when Supabase returns "relation does not exist" (42P01
  // from PostgreSQL) or "table not in schema cache" (PGRST205 from PostgREST).
  // Used to surface a setup hint to admins and stop the polling spam.
  const [tableMissing, setTableMissing] = useState(false)

  // Initial fetch
  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('deleted', false)
      .order('uploaded_at', { ascending: false })
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        // Log once; the empty state on the page guides the admin to migrate.
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

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Realtime subscription + 8s polling fallback (matches Posts pattern).
  // If the table is missing, skip both subscription and polling — re-mount
  // once the schema is in place will recover.
  useEffect(() => {
    if (tableMissing) return

    const channel = supabase
      .channel('assets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => {
        fetchAll()
      })
      .subscribe()

    const poll = setInterval(fetchAll, 8000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [fetchAll, tableMissing])

  const addAsset = useCallback(async ({ file, description, currentUser }) => {
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
      description:      (description || '').trim().slice(0, 500),
      uploaded_by:      currentUser?.email,
      uploaded_by_name: currentUser?.name,
    }

    const { data, error } = await supabase.from('assets').insert(row).select().single()
    if (error) throw new Error(error.message || 'Failed to save asset.')

    const fresh = fromRow(data)
    setAssets(prev => [fresh, ...prev.filter(a => a.id !== fresh.id)])
    return fresh
  }, [])

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
      a.description?.toLowerCase().includes(q)
    )
  }, [assets])

  return (
    <AssetsContext.Provider
      value={{
        assets,
        loaded,
        tableMissing,
        addAsset,
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
