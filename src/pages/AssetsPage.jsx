import { useMemo, useState, useRef, useEffect } from 'react'
import {
  Library, UploadCloud, Search, AlertTriangle,
  ChevronDown, X, Image as ImageIcon, Film, FileText, File as FileIcon,
  FolderPlus, Folder, ChevronRight, Pencil, Trash2, Check, Home,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAssets } from '../context/AssetsContext'
import { useFolders } from '../context/FoldersContext'
import { useToast } from '../context/ToastContext'
import AssetCard from '../components/assets/AssetCard'
import AssetDetailModal from '../components/assets/AssetDetailModal'
import AssetUploadModal from '../components/assets/AssetUploadModal'
import { isCloudinaryConfigured } from '../lib/cloudinary'

const TYPE_TABS = [
  { id: 'all',   label: 'All',    icon: null },
  { id: 'image', label: 'Images', icon: ImageIcon },
  { id: 'video', label: 'Videos', icon: Film },
  { id: 'pdf',   label: 'PDFs',   icon: FileText },
  { id: 'other', label: 'Other',  icon: FileIcon },
]

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'name',   label: 'Name A–Z' },
  { id: 'size',   label: 'Largest first' },
]

function matchesType(asset, tab) {
  if (tab === 'all')   return true
  if (tab === 'image') return asset.file_type?.startsWith('image/')
  if (tab === 'video') return asset.file_type?.startsWith('video/')
  if (tab === 'pdf')   return asset.file_type === 'application/pdf'
  return !asset.file_type?.startsWith('image/')
      && !asset.file_type?.startsWith('video/')
      &&  asset.file_type !== 'application/pdf'
}

function FolderNameInput({ initialValue = '', onSave, onCancel, placeholder = 'Folder name…' }) {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select() }, [])

  const handleKey = (e) => {
    if (e.key === 'Enter')  { e.preventDefault(); if (value.trim()) onSave(value.trim()) }
    if (e.key === 'Escape') { e.preventDefault(); onCancel() }
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        maxLength={60}
        className="flex-1 min-w-0 px-2.5 py-1.5 border-2 border-indigo-400 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white"
      />
      <button
        onClick={() => value.trim() && onSave(value.trim())}
        disabled={!value.trim()}
        className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors flex-shrink-0"
      >
        <Check size={13} />
      </button>
      <button onClick={onCancel} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors flex-shrink-0">
        <X size={13} />
      </button>
    </div>
  )
}

function FolderCard({ folder, itemCount, onClick, onRename, onDelete }) {
  const [renaming, setRenaming] = useState(false)

  if (renaming) {
    return (
      <div className="bg-white border-2 border-indigo-300 rounded-2xl p-4 shadow-sm">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)' }}>
          <Folder size={20} className="text-indigo-500" />
        </div>
        <FolderNameInput
          initialValue={folder.name}
          onSave={(name) => { onRename(folder.id, name); setRenaming(false) }}
          onCancel={() => setRenaming(false)}
        />
      </div>
    )
  }

  return (
    <div className="group relative bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-sm">
      <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.stopPropagation(); setRenaming(true) }}
          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-colors"
          title="Rename"
        >
          <Pencil size={11} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(folder) }}
          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 shadow-sm transition-colors"
          title="Delete"
        >
          <Trash2 size={11} />
        </button>
      </div>
      <div onClick={() => onClick(folder.id)} className="flex flex-col">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)' }}>
          <Folder size={20} className="text-indigo-500" />
        </div>
        <p className="text-xs font-bold text-slate-800 truncate pr-8">{folder.name}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
      </div>
    </div>
  )
}

function NewFolderCard({ onSubmit }) {
  const [creating, setCreating] = useState(false)

  if (creating) {
    return (
      <div className="border-2 border-indigo-300 bg-indigo-50/40 rounded-2xl p-4 min-h-[100px]">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)' }}>
          <FolderPlus size={20} className="text-indigo-500" />
        </div>
        <FolderNameInput
          onSave={(name) => { onSubmit(name); setCreating(false) }}
          onCancel={() => setCreating(false)}
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => setCreating(true)}
      className="border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 rounded-2xl p-4 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 min-h-[100px]"
    >
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
        <FolderPlus size={16} className="text-slate-400" />
      </div>
      <span className="text-xs font-semibold text-slate-400">New folder</span>
    </button>
  )
}

function DeleteFolderModal({ folder, assetCount, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Trash2 size={22} className="text-red-600" />
          </div>
          <h2 className="text-base font-bold text-slate-900 text-center">Delete "{folder.name}"?</h2>
          {assetCount > 0 ? (
            <p className="text-sm text-slate-500 text-center mt-2 leading-relaxed">
              {assetCount} {assetCount === 1 ? 'asset' : 'assets'} will be moved to the parent folder. Any subfolders will also be deleted.
            </p>
          ) : (
            <p className="text-sm text-slate-500 text-center mt-2">This folder and any subfolders will be permanently deleted.</p>
          )}
          <p className="text-xs text-red-500 text-center mt-2 font-medium">This cannot be undone.</p>
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors">Delete</button>
        </div>
      </div>
    </div>
  )
}

export default function AssetsPage() {
  const { currentUser, isAdmin, isSocialMedia } = useAuth()
  const { assets, loaded, tableMissing, searchAssets, moveAsset } = useAssets()
  const { folders, createFolder, renameFolder, deleteFolder, getFolderPath, getChildFolders, getFolderItemCount } = useFolders()
  const { addToast } = useToast()

  const [query,             setQuery]             = useState('')
  const [typeTab,           setTypeTab]           = useState('all')
  const [sortBy,            setSortBy]            = useState('newest')
  const [activeTag,         setActiveTag]         = useState(null)
  const [selected,          setSelected]          = useState(null)
  const [uploadOpen,        setUploadOpen]        = useState(false)
  const [currentFolderId,   setCurrentFolderId]   = useState(null)
  const [deletingFolder,    setDeletingFolder]    = useState(null)
  const [creatingFromHeader,setCreatingFromHeader]= useState(false)

  const canUpload  = isAdmin || isSocialMedia
  const cloudReady = isCloudinaryConfigured()

  const breadcrumb = useMemo(() => getFolderPath(currentFolderId), [getFolderPath, currentFolderId])
  const subfolders = useMemo(() => getChildFolders(currentFolderId), [getChildFolders, currentFolderId])

  const allTags = useMemo(() => {
    const counts = {}
    assets.forEach(a => (a.tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1 }))
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([tag]) => tag)
  }, [assets])

  const filtered = useMemo(() => {
    let list = searchAssets(query).filter(a => a.folder_id === currentFolderId)
    if (typeTab !== 'all') list = list.filter(a => matchesType(a, typeTab))
    if (activeTag)         list = list.filter(a => (a.tags || []).includes(activeTag))
    return [...list].sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.uploaded_at) - new Date(b.uploaded_at)
      if (sortBy === 'name')   return (a.file_name || '').localeCompare(b.file_name || '')
      if (sortBy === 'size')   return (b.file_size || 0) - (a.file_size || 0)
      return new Date(b.uploaded_at) - new Date(a.uploaded_at)
    })
  }, [assets, query, typeTab, activeTag, sortBy, currentFolderId, searchAssets])

  const navigateTo = (folderId) => {
    setCurrentFolderId(folderId)
    setQuery('')
    setActiveTag(null)
    setTypeTab('all')
  }

  const handleCreateFolder = async (name, parentId) => {
    try {
      await createFolder({ name, parentId: parentId ?? currentFolderId, currentUser })
      addToast(`Folder "${name}" created`, 'success')
    } catch (err) {
      addToast(err.message || 'Failed to create folder', 'error')
    }
  }

  const handleRenameFolder = async (id, name) => {
    try {
      await renameFolder(id, name)
      addToast('Folder renamed', 'success')
    } catch (err) {
      addToast(err.message || 'Failed to rename', 'error')
    }
  }

  const handleDeleteFolder = async () => {
    if (!deletingFolder) return
    try {
      const parentId = deletingFolder.parent_id || null
      const assetsInFolder = assets.filter(a => a.folder_id === deletingFolder.id)
      await Promise.all(assetsInFolder.map(a => moveAsset(a.id, parentId)))
      await deleteFolder(deletingFolder.id)
      addToast(`"${deletingFolder.name}" deleted`, 'success')
      if (currentFolderId === deletingFolder.id) setCurrentFolderId(parentId)
    } catch (err) {
      addToast(err.message || 'Failed to delete folder', 'error')
    } finally {
      setDeletingFolder(null)
    }
  }

  const folderAssetCount = deletingFolder ? assets.filter(a => a.folder_id === deletingFolder.id).length : 0
  const showFolderSection = subfolders.length > 0
  const showFilesDivider  = showFolderSection && filtered.length > 0

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Asset Library</h1>
          <p className="text-slate-400 mt-1 text-sm">Shared media library. Browse, filter, and reuse assets across the team.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!creatingFromHeader ? (
            <button
              onClick={() => setCreatingFromHeader(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-indigo-600 border border-indigo-200 bg-white hover:bg-indigo-50 transition-colors"
            >
              <FolderPlus size={15} />
              <span className="hidden sm:inline">New Folder</span>
            </button>
          ) : (
            <div className="w-52">
              <FolderNameInput
                onSave={(name) => { handleCreateFolder(name); setCreatingFromHeader(false) }}
                onCancel={() => setCreatingFromHeader(false)}
              />
            </div>
          )}
          {canUpload && (
            <button
              onClick={() => setUploadOpen(true)}
              disabled={!cloudReady}
              title={cloudReady ? 'Upload a new asset' : 'Configure Cloudinary in Settings first'}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}
            >
              <UploadCloud size={15} />
              <span>Upload</span>
            </button>
          )}
        </div>
      </div>

      {tableMissing && isAdmin && (
        <div className="flex items-start gap-3 p-4 mb-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Asset table not initialized in Supabase</p>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">Run <code className="bg-amber-100 px-1 rounded">supabase-schema.sql</code> in the Supabase SQL editor, then refresh.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5">
        {/* Breadcrumb + search + sort */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-slate-100 min-h-[52px]">
          <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
            <button
              onClick={() => navigateTo(null)}
              className={`flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap transition-colors ${currentFolderId === null ? 'text-slate-500 cursor-default' : 'text-indigo-600 hover:text-indigo-800'}`}
            >
              <Home size={13} />
              <span>All Assets</span>
            </button>
            {breadcrumb.map(folder => (
              <span key={folder.id} className="flex items-center gap-1 min-w-0">
                <ChevronRight size={13} className="text-slate-300 flex-shrink-0" />
                <button
                  onClick={() => navigateTo(folder.id)}
                  className={`text-sm font-semibold truncate transition-colors ${folder.id === currentFolderId ? 'text-slate-600 cursor-default' : 'text-indigo-600 hover:text-indigo-800'}`}
                >
                  {folder.name}
                </button>
              </span>
            ))}
          </div>
          <div className="relative flex-shrink-0 w-44 sm:w-60">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search assets…"
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="relative flex-shrink-0">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:border-indigo-400 cursor-pointer"
            >
              {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <span className="text-xs font-semibold text-slate-400 whitespace-nowrap hidden sm:inline">
            {loaded ? `${filtered.length} of ${assets.length}` : 'Loading…'}
          </span>
        </div>

        {/* Type tabs */}
        <div className="flex items-center gap-1 px-4 sm:px-5 py-2.5 border-b border-slate-100 overflow-x-auto">
          {TYPE_TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setTypeTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${typeTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
              >
                {Icon && <Icon size={11} />}
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 px-4 sm:px-5 py-2.5 border-b border-slate-100 overflow-x-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex-shrink-0">Tags</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${activeTag === tag ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
                >
                  {tag}
                </button>
              ))}
              {activeTag && (
                <button onClick={() => setActiveTag(null)} className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors">
                  <X size={9} /> Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-5">
          {!loaded ? (
            <div className="py-16 text-center text-sm text-slate-400">Loading library…</div>
          ) : (
            <>
              {subfolders.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Folders</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {subfolders.map(folder => (
                      <FolderCard
                        key={folder.id}
                        folder={folder}
                        itemCount={getFolderItemCount(folder.id, assets)}
                        onClick={navigateTo}
                        onRename={handleRenameFolder}
                        onDelete={setDeletingFolder}
                      />
                    ))}
                    <NewFolderCard onSubmit={name => handleCreateFolder(name, currentFolderId)} />
                  </div>
                </div>
              )}

              {showFilesDivider && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px bg-slate-100 flex-1" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Files</span>
                  <div className="h-px bg-slate-100 flex-1" />
                </div>
              )}

              {subfolders.length === 0 && assets.length > 0 && (
                <div className="mb-4">
                  <div className="inline-block">
                    <NewFolderCard onSubmit={name => handleCreateFolder(name, currentFolderId)} />
                  </div>
                </div>
              )}

              {assets.length === 0 ? (
                <div className="py-16 text-center">
                  <Library size={32} className="mx-auto text-slate-200 mb-3" />
                  <p className="font-semibold text-slate-500 text-sm">No assets yet</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    {canUpload ? 'Click Upload to add your first asset.' : 'Ask an admin or content specialist to upload assets here.'}
                  </p>
                  {canUpload && cloudReady && (
                    <button onClick={() => setUploadOpen(true)} className="mt-4 inline-flex items-center gap-1.5 text-sm text-indigo-600 font-semibold hover:text-indigo-700">
                      <UploadCloud size={14} /> Upload an asset
                    </button>
                  )}
                </div>
              ) : filtered.length === 0 && !showFolderSection ? (
                <div className="py-16 text-center text-sm text-slate-400">
                  {query || typeTab !== 'all' || activeTag
                    ? <><span>No assets match your filters.</span><button onClick={() => { setQuery(''); setTypeTab('all'); setActiveTag(null) }} className="block mx-auto mt-2 text-indigo-500 font-semibold hover:underline text-xs">Clear all filters</button></>
                    : <span>This folder is empty. {canUpload && <button onClick={() => setUploadOpen(true)} className="text-indigo-500 font-semibold hover:underline">Upload an asset</button>}</span>
                  }
                </div>
              ) : filtered.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {filtered.map(asset => (
                    <AssetCard key={asset.id} asset={asset} onClick={setSelected} />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <AssetDetailModal
        asset={selected}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        currentFolderId={currentFolderId}
        folders={folders}
      />
      <AssetUploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        currentFolderId={currentFolderId}
        folderPath={breadcrumb}
      />
      {deletingFolder && (
        <DeleteFolderModal
          folder={deletingFolder}
          assetCount={folderAssetCount}
          onClose={() => setDeletingFolder(null)}
          onConfirm={handleDeleteFolder}
        />
      )}
    </div>
  )
}
