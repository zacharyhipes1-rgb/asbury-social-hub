import { useRef, useState } from 'react'
import { X, UploadCloud, AlertCircle, Loader, CheckCircle, ExternalLink, Tag } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useAssets } from '../../context/AssetsContext'
import { useToast } from '../../context/ToastContext'
import { isCloudinaryConfigured, validateFile } from '../../lib/cloudinary'

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AssetUploadModal({ isOpen, onClose }) {
  const { currentUser } = useAuth()
  const { addAsset } = useAssets()
  const { addToast } = useToast()
  const inputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [description, setDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const cloudinaryReady = isCloudinaryConfigured()

  if (!isOpen) return null

  const reset = () => {
    setFile(null)
    setDescription('')
    setTagInput('')
    setTags([])
    setError('')
    setDragging(false)
    setUploading(false)
  }

  const addTag = (raw) => {
    const t = raw.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) }
    if (e.key === 'Backspace' && !tagInput && tags.length) setTags(prev => prev.slice(0, -1))
  }

  const handleClose = () => {
    if (uploading) return
    reset()
    onClose()
  }

  const handleFileSelect = (next) => {
    if (!next) return
    const err = validateFile(next)
    if (err) { setError(err); return }
    setError('')
    setFile(next)
  }

  const handleSubmit = async () => {
    if (!file) { setError('Choose a file to upload.'); return }
    setError('')
    setUploading(true)
    try {
      const finalTags = tagInput.trim() ? [...tags, tagInput.trim().toLowerCase()] : tags
      await addAsset({ file, description, tags: finalTags, currentUser })
      addToast(`Uploaded: ${file.name}`, 'success')
      reset()
      onClose()
    } catch (err) {
      setError(err.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Upload to Asset Library</h2>
          <button onClick={handleClose} disabled={uploading} className="text-slate-400 hover:text-slate-700 p-1 disabled:opacity-50" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {!cloudinaryReady && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-amber-800 text-sm bg-amber-50 border border-amber-200">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Cloudinary isn't configured</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Visit <a href="/settings" className="underline font-medium inline-flex items-center gap-0.5">Settings <ExternalLink size={10} /></a> to add your Cloud Name + Upload Preset before uploading.
                </p>
              </div>
            </div>
          )}

          {/* File picker */}
          {file ? (
            <div className="border-2 border-emerald-200 bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                {uploading
                  ? <Loader size={18} className="text-emerald-700 animate-spin" />
                  : <CheckCircle size={18} className="text-emerald-700" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{formatSize(file.size)} · {file.type || 'unknown'}</p>
              </div>
              {!uploading && (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                  aria-label="Remove file"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); handleFileSelect(e.dataTransfer.files[0]) }}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer border-2 border-dashed rounded-xl p-6 sm:p-10 text-center transition-all
                ${dragging ? 'border-indigo-400 bg-indigo-50/40' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}`}
            >
              <UploadCloud size={32} className="mx-auto text-slate-400 mb-3" />
              <p className="text-sm font-medium text-slate-700">Drop a file here or <span className="text-indigo-600">browse</span></p>
              <p className="text-xs text-slate-400 mt-1">Images, video, PDF, ZIP, PowerPoint · 100 MB max</p>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files[0])}
                accept="image/*,video/*,.pdf,.zip,.ppt,.pptx"
              />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-red-700 text-sm bg-red-50 border border-red-200">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Description <span className="normal-case font-normal text-slate-400">(optional, helps search)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="e.g. Red 2026 Honda CR-V on showroom floor"
              rows={3}
              maxLength={500}
              disabled={uploading}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none disabled:opacity-60"
            />
            <p className="text-[10px] text-slate-400 mt-1 text-right">{description.length}/500</p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Tags <span className="normal-case font-normal text-slate-400">(optional — press Enter or comma to add)</span>
            </label>
            <div
              className="flex flex-wrap gap-1.5 min-h-[42px] px-3 py-2 border border-slate-200 rounded-xl bg-white focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 cursor-text"
              onClick={() => document.getElementById('tag-input-upload')?.focus()}
            >
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                  <Tag size={9} />
                  {tag}
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setTags(prev => prev.filter(t => t !== tag)) }}
                    className="hover:text-red-500 transition-colors ml-0.5"
                    disabled={uploading}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                id="tag-input-upload"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => tagInput.trim() && addTag(tagInput)}
                placeholder={tags.length === 0 ? 'e.g. inventory, promotion, bmw…' : ''}
                disabled={uploading}
                className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-slate-300 disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <button
            onClick={handleClose}
            disabled={uploading}
            className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-white transition-colors disabled:opacity-50 min-h-[40px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || uploading || !cloudinaryReady}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}
          >
            {uploading
              ? <><Loader size={14} className="animate-spin" /><span>Uploading…</span></>
              : <><UploadCloud size={14} /><span>Upload</span></>}
          </button>
        </div>
      </div>
    </div>
  )
}
