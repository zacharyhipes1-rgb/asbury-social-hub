import { useMemo, useState } from 'react'
import { Library, UploadCloud, Search, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAssets } from '../context/AssetsContext'
import AssetCard from '../components/assets/AssetCard'
import AssetDetailModal from '../components/assets/AssetDetailModal'
import AssetUploadModal from '../components/assets/AssetUploadModal'
import { isCloudinaryConfigured } from '../lib/cloudinary'

export default function AssetsPage() {
  const { isAdmin, isSocialMedia } = useAuth()
  const { assets, loaded, tableMissing, searchAssets } = useAssets()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  const canUpload = isAdmin || isSocialMedia
  const cloudReady = isCloudinaryConfigured()
  const filtered = useMemo(() => searchAssets(query), [query, searchAssets])

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Asset Library</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Shared media library. Anyone on the team can browse, download, and reuse these assets.
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
            <span className="hidden sm:inline">Upload</span>
            <span className="sm:hidden">Upload</span>
          </button>
        )}
      </div>

      {/* Setup notice when assets table doesn't exist yet (admin-only hint) */}
      {tableMissing && isAdmin && (
        <div className="flex items-start gap-3 p-4 mb-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Asset table not initialized in Supabase</p>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Open the Supabase SQL editor and run the <code className="bg-amber-100 px-1 rounded">supabase-schema.sql</code> file
              from this repo (or just the <code className="bg-amber-100 px-1 rounded">CREATE TABLE public.assets …</code> block).
              Once it exists, refresh this page.
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5">
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-slate-100">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by file name or description…"
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <span className="text-xs font-semibold text-slate-400 whitespace-nowrap hidden sm:inline">
            {loaded ? `${filtered.length} of ${assets.length}` : 'Loading…'}
          </span>
        </div>

        <div className="p-4 sm:p-5">
          {!loaded ? (
            <div className="py-16 text-center text-sm text-slate-400">Loading library…</div>
          ) : assets.length === 0 ? (
            <div className="py-16 text-center">
              <Library size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="font-semibold text-slate-500 text-sm">No assets yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                {canUpload
                  ? 'Click Upload to add your first asset. It will be available to everyone on the team.'
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
            <div className="py-16 text-center text-sm text-slate-400">No assets match your search.</div>
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
