import { useState, useMemo } from 'react'
import { X, Search, Library } from 'lucide-react'
import { useAssets } from '../../context/AssetsContext'
import AssetCard from './AssetCard'

export default function AssetPickerModal({ isOpen, onClose, onSelect }) {
  const { assets, loaded, searchAssets } = useAssets()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => searchAssets(query), [query, searchAssets])

  if (!isOpen) return null

  const handlePick = (asset) => {
    onSelect(asset)
    setQuery('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Library size={16} className="text-indigo-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">Pick from Asset Library</h2>
              <p className="text-xs text-slate-400">{loaded ? `${assets.length} asset${assets.length === 1 ? '' : 's'} available` : 'Loading…'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 sm:px-6 py-3 border-b border-slate-100">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by file name or description…"
              autoFocus
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {!loaded ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading library…</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Library size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="font-medium text-slate-500 text-sm">
                {query ? 'No assets match your search.' : 'No assets in the library yet.'}
              </p>
              {!query && <p className="text-xs text-slate-400 mt-1">Upload an asset from the Asset Library page to reuse it here.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filtered.map(asset => (
                <AssetCard key={asset.id} asset={asset} onClick={handlePick} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
