import { useMemo, useState } from 'react'
import {
  Library, UploadCloud, Search, AlertTriangle,
  ChevronDown, X, Image as ImageIcon, Film, FileText, File as FileIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAssets } from '../context/AssetsContext'
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
  // 'other' = anything that isn't image, video, or pdf
  return !asset.file_type?.startsWith('image/')
      && !asset.file_type?.startsWith('video/')
      &&  asset.file_type !== 'application/pdf'
}

export default function AssetsPage() {
  const { isAdmin, isSocialMedia } = useAuth()
  const { assets, loaded, tableMissing, searchAssets } = useAssets()

  const [query,     setQuery]     = useState('')
  const [typeTab,   setTypeTab]   = useState('all')
  const [sortBy,    setSortBy]    = useState('newest')
  const [activeTag, setActiveTag] = useState(null)
  const [selected,  setSelected]  = useState(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  const canUpload  = isAdmin || isSocialMedia
  const cloudReady = isCloudinaryConfigured()

  // Collect all tags from every asset, sorted by frequency
  const allTags = useMemo(() => {
    const counts = {}
    assets.forEach(a => (a.tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1 }))
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
  }, [assets])

  const filtered = useMemo(() => {
    let list = searchAssets(query)
    if (typeTab !== 'all') list = list.filter(a => matchesType(a, typeTab))
    if (activeTag)         list = list.filter(a => (a.tags || []).includes(activeTag))
    return [...list].sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.uploaded_at) - new Date(b.uploaded_at)
      if (sortBy === 'name')   return (a.file_name || '').localeCompare(b.file_name || '')
      if (sortBy === 'size')   return (b.file_size || 0) - (a.file_size || 0)
      return new Date(b.uploaded_at) - new Date(a.uploaded_at) // newest
    })
  }, [assets, query, typeTab, activeTag, sortBy, searchAssets])

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Asset Library</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Shared media library. Browse, filter, and reuse assets across the team.
          </p>
        </div>
        {canUpload && (
          <button
            onClick={() => setUploadOpen(true)}
            disabled={!cloudReady}
            title={cloudReady ? 'Upload a new asset' : 'Configure Cloudinary in Settings first'}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}
          >
            <UploadCloud size={15} />
            <span>Upload</span>
          </button>
        )}
      </div>

      {/* Schema missing warning */}
      {tableMissing && isAdmin && (
        <div className="flex items-start gap-3 p-4 mb-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Asset table not initialized in Supabase</p>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Open the Supabase SQL editor and run <code className="bg-amber-100 px-1 rounded">supabase-schema.sql</code> from this repo, then refresh.
            </p>
          </div>
        </div>
      )}

      {/* Toolbar card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5">

        {/* Row 1: Search + sort */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-slate-100">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, description, or tag…"
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Sort dropdown */}
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

        {/* Row 2: Type filter tabs */}
        <div className="flex items-center gap-1 px-4 sm:px-5 py-2.5 border-b border-slate-100 overflow-x-auto">
          {TYPE_TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setTypeTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  typeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                {Icon && <Icon size={11} />}
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Row 3: Tag filter — only shown when tags exist */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 px-4 sm:px-5 py-2.5 border-b border-slate-100 overflow-x-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex-shrink-0">Tags</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    activeTag === tag
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
              {activeTag && (
                <button
                  onClick={() => setActiveTag(null)}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                >
                  <X size={9} /> Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="p-4 sm:p-5">
          {!loaded ? (
            <div className="py-16 text-center text-sm text-slate-400">Loading library…</div>
          ) : assets.length === 0 ? (
            <div className="py-16 text-center">
              <Library size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="font-semibold text-slate-500 text-sm">No assets yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                {canUpload
                  ? 'Click Upload to add your first asset. It will be available to the whole team.'
                  : 'Ask an admin or content specialist to upload assets here.'}
              </p>
              {canUpload && cloudReady && (
                <button
                  onClick={() => setUploadOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm text-indigo-600 font-semibold hover:text-indigo-700"
                >
                  <UploadCloud size={14} /> Upload an asset
                </button>
              )}
              {canUpload && !cloudReady && (
                <p className="mt-3 text-xs text-amber-700">
                  Configure Cloudinary in <a href="/settings" className="underline font-medium">Settings</a> before uploading.
                </p>
              )}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              No assets match your filters.
              <button
                onClick={() => { setQuery(''); setTypeTab('all'); setActiveTag(null) }}
                className="block mx-auto mt-2 text-indigo-500 font-semibold hover:underline text-xs"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {filtered.map(asset => (
                <AssetCard key={asset.id} asset={asset} onClick={setSelected} />
              ))}
            </div>
          )}
        </div>
      </div>

      <AssetDetailModal asset={selected} isOpen={!!selected} onClose={() => setSelected(null)} />
      <AssetUploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  )
}
