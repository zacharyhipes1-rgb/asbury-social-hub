import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const FoldersContext = createContext(null)

function fromRow(r) {
  return {
    id:               r.id,
    name:             r.name,
    parent_id:        r.parent_id || null,
    created_by:       r.created_by,
    created_by_name:  r.created_by_name || '',
    created_at:       r.created_at,
  }
}

export function FoldersProvider({ children }) {
  const [folders, setFolders] = useState([])
  const [foldersLoaded, setFoldersLoaded] = useState(false)
  const [tableMissing, setTableMissing] = useState(false)

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase
      .from('asset_folders')
      .select('*')
      .order('name', { ascending: true })
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        setTableMissing(true)
        setFolders([])
      } else {
        console.error('[Folders] fetch failed:', error.message)
        setFolders([])
      }
    } else {
      setTableMissing(false)
      setFolders((data || []).map(fromRow))
    }
    setFoldersLoaded(true)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Realtime subscription
  useEffect(() => {
    if (tableMissing) return
    const channel = supabase
      .channel('folders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asset_folders' }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchAll, tableMissing])

  const createFolder = useCallback(async ({ name, parentId, currentUser }) => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Folder name is required.')

    const row = {
      name:             trimmed,
      parent_id:        parentId || null,
      created_by:       currentUser?.email || '',
      created_by_name:  currentUser?.name  || '',
    }

    const { data, error } = await supabase
      .from('asset_folders')
      .insert(row)
      .select()
      .single()
    if (error) throw new Error(error.message || 'Failed to create folder.')

    const fresh = fromRow(data)
    setFolders(prev => [...prev, fresh].sort((a, b) => a.name.localeCompare(b.name)))
    return fresh
  }, [])

  const renameFolder = useCallback(async (id, name) => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Folder name is required.')
    const { data, error } = await supabase
      .from('asset_folders')
      .update({ name: trimmed })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message || 'Failed to rename folder.')
    const fresh = fromRow(data)
    setFolders(prev => prev.map(f => f.id === id ? fresh : f).sort((a, b) => a.name.localeCompare(b.name)))
    return fresh
  }, [])

  const deleteFolder = useCallback(async (id) => {
    const { error } = await supabase
      .from('asset_folders')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message || 'Failed to delete folder.')
    // Cascade removes children; assets get folder_id = null via ON DELETE SET NULL
    setFolders(prev => prev.filter(f => f.id !== id && f.parent_id !== id))
  }, [])

  // Returns ordered array [root → ... → folder] for breadcrumb
  const getFolderPath = useCallback((folderId) => {
    if (!folderId) return []
    const path = []
    let current = folders.find(f => f.id === folderId)
    const visited = new Set()
    while (current && !visited.has(current.id)) {
      visited.add(current.id)
      path.unshift(current)
      current = current.parent_id ? folders.find(f => f.id === current.parent_id) : null
    }
    return path
  }, [folders])

  // Returns immediate children of a parentId (null = root)
  const getChildFolders = useCallback((parentId) => {
    return folders.filter(f => f.parent_id === (parentId || null))
  }, [folders])

  // Count of all assets + subfolders directly inside a folder (for display)
  const getFolderItemCount = useCallback((folderId, assets) => {
    const subfolders = folders.filter(f => f.parent_id === folderId).length
    const assetCount = (assets || []).filter(a => a.folder_id === folderId).length
    return subfolders + assetCount
  }, [folders])

  return (
    <FoldersContext.Provider
      value={{
        folders,
        foldersLoaded,
        tableMissing,
        createFolder,
        renameFolder,
        deleteFolder,
        getFolderPath,
        getChildFolders,
        getFolderItemCount,
      }}
    >
      {children}
    </FoldersContext.Provider>
  )
}

export function useFolders() {
  const ctx = useContext(FoldersContext)
  if (!ctx) throw new Error('useFolders must be used within FoldersProvider')
  return ctx
}
