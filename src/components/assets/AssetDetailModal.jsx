import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  X, Download, ExternalLink, Send, Trash2, AlertTriangle,
  User, Clock, AlignLeft, File as FileIcon, FileText, Film, FileArchive,
  Tag, Check, Pencil,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useAssets } from '../../context/AssetsContext'
import { useToast } from '../../context/ToastContext'
import { forceDownloadUrl } from '../../lib/cloudinary'

function fileIconFor(type) {
  if (type?.startsWith('image/')) return null // images render the actual image
  if (type?.startsWith('video/')) return Film
  if (type === 'application/pdf') return FileText
  if (type === 'application/zip' || type === 'application/x-zip-compressed') return FileArchive
  return FileIcon
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr) {
  try { return format(parseISO(dateStr), 'MMM d, yyyy · h:mm a') } catch { return dateStr || '' }
}

export default function AssetDetailModal({ asset, isOpen, onClose }) {
  const { isAdmin, isSocialMedia } = useAuth()
  const { softDeleteAsset, updateAssetTags } = useAssets()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const tagInputRef = useRef(null)

  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfDownloading, setPdfDownloading] = useState(false)

  // Tag editing state
  const [editingTags, setEditingTags] = useState(false)
  const [tagDraft, setTagDraft] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [savingTags, setSavingTags] = useState(false)

  // Fetch PDF via same-origin proxy → blob URL → bypasses X-Frame-Options: DENY
  // Only runs when the modal is open and the asset is a PDF.
  useEffect(() => {
    if (!isOpen || !asset) return
    if (asset.file_type !== 'application/pdf') { setPdfBlobUrl(null); return }

    let blobUrl = null
    setPdfLoading(true)
    setPdfBlobUrl(null)

    fetch(`/api/pdf?url=${encodeURIComponent(asset.file_url)}`)
      .then(r => { if (!r.ok) throw new Error('fetch failed'); return r.blob() })
      .then(blob => { blobUrl = URL.createObjectURL(blob); setPdfBlobUrl(blobUrl) })
      .catch(() => { /* silent — fallback UI shown when pdfBlobUrl is null */ })
      .finally(() => setPdfLoading(false))

    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [isOpen, asset?.id])  // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen || !asset) return null

  const isImage = asset.file_type?.startsWith('image/')
  const isVideo = asset.file_type?.startsWith('video/')
  const isPDF   = asset.file_type === 'application/pdf'
  const Icon = fileIconFor(asset.file_type)

  // Proxy URL used for "View full size" (opens in new tab) and as fallback link
  const proxyViewUrl = isPDF
    ? `/api/pdf?url=${encodeURIComponent(asset.file_url)}`
    : null

  // Download URL: PDFs go through proxy with dl=1 (server sends Content-Disposition: attachment)
  // Images/video use Cloudinary fl_attachment transform. Raw files returned as-is.
  const downloadHref = isPDF
    ? `/api/pdf?url=${encodeURIComponent(asset.file_url)}&dl=1&name=${encodeURIComponent(asset.file_name || 'document.pdf')}`
    : forceDownloadUrl(asset.file_url)

  const viewHref = isPDF ? proxyViewUrl : asset.file_url

  const handlePdfDownload = async () => {
    if (pdfDownloading) return
    setPdfDownloading(true)
    try {
      const src = pdfBlobUrl
        ? pdfBlobUrl
        : await fetch(`/api/pdf?url=${encodeURIComponent(asset.file_url)}&dl=1`)
            .then(r => { if (!r.ok) throw new Error('fetch failed'); return r.blob() })
            .then(b => URL.createObjectURL(b))
      const a = document.createElement('a')
      a.href = src
      a.download = asset.file_name || 'document.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      if (!pdfBlobUrl) setTimeout(() => URL.revokeObjectURL(src), 5000)
    } catch { /* silent */ } finally {
      setPdfDownloading(false)
    }
  }

  const startEditTags = () => { setTagDraft([...(asset.tags || [])]); setTagInput(''); setEditingTags(true) }
  const cancelEditTags = () => { setEditingTags(false); setTagInput('') }

  const addTagToDraft = (raw) => {
    const t = raw.trim().toLowerCase()
    if (t && !tagDraft.includes(t)) setTagDraft(prev => [...prev, t])
    setTagInput('')
  }
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTagToDraft(tagInput) }
    if (e.key === 'Backspace' && !tagInput && tagDraft.length) setTagDraft(prev => prev.slice(0, -1))
  }

  const saveTags = async () => {
    const finalDraft = tagInput.trim() ? [...tagDraft, tagInput.trim().toLowerCase()] : tagDraft
    setSavingTags(true)
    try {
      await updateAssetTags(asset.id, finalDraft)
      addToast('Tags updated', 'success')
      setEditingTags(false)
      setTagInput('')
    } catch (err) {
      addToast(err.message || 'Failed to save tags', 'error')
    } finally { setSavingTags(false) }
  }

  const handleUseInPost = () => {
    navigate(`/upload?asset=${asset.id}`)
    onClose()
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await softDeleteAsset(asset.id)
      addToast(`Removed: ${asset.file_name}`, 'success')
      onClose()
    } catch (err) {
      addToast(err.message || 'Delete failed.', 'error')
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-bold text-slate-900 truncate flex-1 pr-3" title={asset.file_name}>
            {asset.file_name}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {/* Preview */}
          <div className="mb-5 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
            {isImage && (
              <a href={asset.file_url} target="_blank" rel="noopener noreferrer" title="Open full size in a new tab" className="block">
                <img src={asset.file_url} alt={asset.file_name} className="w-full max-h-[60vh] object-contain bg-slate-50" />
              </a>
            )}
            {isVideo && (
              <video src={asset.file_url} controls className="w-full max-h-[60vh] object-contain bg-black" />
            )}
            {isPDF && (
              pdfLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                  <p className="text-sm text-slate-400">Loading PDF…</p>
                </div>
              ) : pdfBlobUrl ? (
                <iframe
                  src={pdfBlobUrl}
                  className="w-full rounded-sm"
                  style={{ height: '420px', border: 'none' }}
                  title={asset.file_name}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                  <FileText size={40} />
                  <p className="text-sm text-slate-500">PDF preview unavailable</p>
                  <a
                    href={proxyViewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink size={12} /> Open PDF in new tab
                  </a>
                </div>
              )
            )}
            {!isImage && !isVideo && !isPDF && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                {Icon && <Icon size={48} />}
                <p className="text-sm font-medium text-slate-700">{asset.file_name}</p>
                <p className="text-xs text-slate-400">{formatSize(asset.file_size)} · {asset.file_type || 'file'}</p>
              </div>
            )}
          </div>

          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <a
              href={viewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors min-h-[40px]"
            >
              <ExternalLink size={13} /> View full size
            </a>
            {isPDF ? (
              <button
                onClick={handlePdfDownload}
                disabled={pdfDownloading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors min-h-[40px] disabled:opacity-50"
              >
                <Download size={13} /> {pdfDownloading ? 'Downloading…' : 'Download'}
              </button>
            ) : (
              <a
                href={downloadHref}
                download={asset.file_name}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors min-h-[40px]"
              >
                <Download size={13} /> Download
              </a>
            )}
            {(isAdmin || isSocialMedia) && (
              <button
                onClick={handleUseInPost}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white rounded-lg transition-all min-h-[40px] hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 2px 8px rgba(99,102,241,0.25)' }}
              >
                <Send size={13} /> Use in post
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={deleting}
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 min-h-[40px]"
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>

          {/* Description */}
          {asset.description && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Description</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{asset.description}</p>
            </div>
          )}

          {/* Tags */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tags</p>
              {isAdmin && !editingTags && (
                <button
                  onClick={startEditTags}
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
                >
                  <Pencil size={10} /> Edit
                </button>
              )}
            </div>

            {editingTags ? (
              <div className="space-y-2">
                <div
                  className="flex flex-wrap gap-1.5 min-h-[42px] px-3 py-2 border border-indigo-300 rounded-xl bg-white ring-2 ring-indigo-100 cursor-text"
                  onClick={() => tagInputRef.current?.focus()}
                >
                  {tagDraft.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                      <Tag size={9} />
                      {tag}
                      <button type="button" onClick={e => { e.stopPropagation(); setTagDraft(prev => prev.filter(t => t !== tag)) }} className="hover:text-red-500 ml-0.5">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={tagInputRef}
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onBlur={() => tagInput.trim() && addTagToDraft(tagInput)}
                    placeholder={tagDraft.length === 0 ? 'Type a tag, press Enter…' : ''}
                    className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-slate-300"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveTags}
                    disabled={savingTags}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    <Check size={11} /> {savingTags ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={cancelEditTags} className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs font-medium hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(asset.tags || []).length === 0 ? (
                  <p className="text-xs text-slate-300 italic">{isAdmin ? 'No tags — click Edit to add some.' : 'No tags.'}</p>
                ) : (
                  (asset.tags || []).map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold">
                      <Tag size={10} /> {tag}
                    </span>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</p>
            </div>
            <div className="px-4 py-1">
              <DetailRow icon={User}      label="Uploaded by" value={asset.uploaded_by_name || asset.uploaded_by} />
              <DetailRow icon={Clock}     label="Uploaded at" value={formatDate(asset.uploaded_at)} />
              <DetailRow icon={AlignLeft} label="File type"   value={asset.file_type || 'unknown'} />
              <DetailRow icon={AlignLeft} label="File size"   value={formatSize(asset.file_size) || '—'} />
            </div>
          </div>
        </div>

        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={22} className="text-red-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900 text-center">Remove this asset?</h3>
              <p className="text-sm text-slate-500 text-center mt-2">
                <span className="font-semibold text-slate-700">{asset.file_name}</span> will be hidden from the library.
                Posts that already reference it will keep working.
              </p>
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex items-start gap-2 w-32 flex-shrink-0">
        <Icon size={13} className="text-slate-400 mt-0.5" />
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <span className="text-xs text-slate-700 flex-1 break-words">{value}</span>
    </div>
  )
}
