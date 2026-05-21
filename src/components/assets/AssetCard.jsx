import { format, parseISO } from 'date-fns'
import { FileText, Film, Image as ImageIcon, File as FileIcon, FileArchive } from 'lucide-react'

function fileIconFor(type) {
  if (type?.startsWith('image/')) return ImageIcon
  if (type?.startsWith('video/')) return Film
  if (type === 'application/pdf') return FileText
  if (type === 'application/zip' || type === 'application/x-zip-compressed') return FileArchive
  return FileIcon
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AssetCard({ asset, onClick }) {
  const Icon = fileIconFor(asset.file_type)
  const isVisual = asset.file_type?.startsWith('image/') || asset.file_type?.startsWith('video/')
  const date = (() => {
    try { return format(parseISO(asset.uploaded_at), 'MMM d, yyyy') } catch { return '' }
  })()

  return (
    <button
      type="button"
      onClick={() => onClick(asset)}
      className="card-hover group text-left bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md hover:border-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-300"
    >
      {/* Preview */}
      <div className="aspect-square bg-slate-50 flex items-center justify-center overflow-hidden relative">
        {isVisual && asset.thumbnail_url ? (
          <img
            src={asset.thumbnail_url}
            alt={asset.file_name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400 px-3 text-center">
            <Icon size={28} />
            <span className="text-[10px] font-semibold uppercase tracking-widest">
              {asset.file_type?.split('/')[1]?.slice(0, 4) || 'file'}
            </span>
          </div>
        )}
        {asset.file_type?.startsWith('video/') && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/15 pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-black/55 flex items-center justify-center">
              <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>
      {/* Meta */}
      <div className="px-3 py-2.5">
        <p className="text-xs font-semibold text-slate-800 truncate" title={asset.file_name}>
          {asset.file_name}
        </p>
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className="text-[10px] text-slate-400 truncate flex-1">{asset.uploaded_by_name || asset.uploaded_by}</p>
          <p className="text-[10px] text-slate-300 flex-shrink-0">{formatSize(asset.file_size)}</p>
        </div>
        {date && <p className="text-[10px] text-slate-300 mt-0.5">{date}</p>}
      </div>
    </button>
  )
}
