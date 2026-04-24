import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, UploadCloud, File, X, Hash, Image, CheckCircle, AlertCircle, Loader, Bookmark, BookmarkCheck } from 'lucide-react'

function getPresets() {
  try { return JSON.parse(localStorage.getItem('asbury_hashtag_presets') || '{}') } catch { return {} }
}
function savePresets(presets) {
  localStorage.setItem('asbury_hashtag_presets', JSON.stringify(presets))
}

function getCloudinaryConfig() {
  try { return JSON.parse(localStorage.getItem('asbury_cloudinary_config') || '{}') } catch { return {} }
}

async function uploadToCloudinary(file, cfg) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', cfg.uploadPreset)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/upload`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.secure_url
}

function FileDropZone({ onFile, currentFile, contentType }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const inputRef = useRef(null)

  const isTextOnly = ['text_post', 'text_caption', 'text_update'].includes(contentType)
  if (isTextOnly) return null

  const handleFile = async (file) => {
    if (!file) return
    setUploadError('')
    const cfg = getCloudinaryConfig()
    const hasCloudinary = !!(cfg.cloudName && cfg.uploadPreset)

    if (hasCloudinary) {
      setUploading(true)
      onFile({ file_name: file.name, file_size: file.size, file_type: file.type, file_preview: null, file_url: null })
      try {
        const url = await uploadToCloudinary(file, cfg)
        onFile({ file_name: file.name, file_size: file.size, file_type: file.type, file_preview: url, file_url: url })
      } catch {
        setUploadError('Cloudinary upload failed — check your config in Settings.')
        onFile({ file_name: file.name, file_size: file.size, file_type: file.type, file_preview: null, file_url: null })
      }
      setUploading(false)
    } else {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => onFile({ file_name: file.name, file_size: file.size, file_type: file.type, file_preview: reader.result, file_url: null })
        reader.readAsDataURL(file)
      } else {
        onFile({ file_name: file.name, file_size: file.size, file_type: file.type, file_preview: null, file_url: null })
      }
    }
  }

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        Media File
        <span className="text-red-500 ml-0.5">*</span>
      </label>

      {currentFile?.file_name ? (
        <div className="flex items-center gap-3 p-4 border-2 border-green-200 bg-green-50 rounded-xl">
          {uploading ? (
            <div className="w-14 h-14 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Loader size={20} className="text-indigo-500 animate-spin" />
            </div>
          ) : currentFile.file_preview && currentFile.file_type?.startsWith('image/') ? (
            <img src={currentFile.file_preview} alt="preview" className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <File size={20} className="text-green-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-slate-900 truncate">{currentFile.file_name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{formatSize(currentFile.file_size)} · {currentFile.file_type}</p>
          </div>
          <button
            type="button"
            onClick={() => onFile({ file_name: '', file_size: 0, file_type: '', file_preview: null })}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
          onClick={() => inputRef.current?.click()}
          className={`
            cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-all
            ${dragging ? 'border-slate-400 bg-slate-50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}
          `}
        >
          <UploadCloud size={28} className="mx-auto text-slate-400 mb-3" />
          <p className="text-sm font-medium text-slate-700">Drop your file here or <span className="text-blue-600">browse</span></p>
          <p className="text-xs text-slate-400 mt-1">Supports images, videos, PDFs, and ZIP archives</p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
            accept="image/*,video/*,.pdf,.zip,.ppt,.pptx"
          />
        </div>
      )}
      {uploadError && (
        <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle size={11} />{uploadError}</p>
      )}
      {!uploadError && currentFile?.file_url && (
        <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1"><CheckCircle size={11} />Uploaded to Cloudinary — Chad can view this.</p>
      )}
      {!uploadError && currentFile?.file_name && !currentFile?.file_url && !uploading && (
        <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
          <Image size={11} />
          Configure Cloudinary in Settings so Chad can view the actual file.
        </p>
      )}
    </div>
  )
}

function HashtagInput({ value, onChange, dealershipId }) {
  const [input, setInput] = useState('')
  const [saved, setSaved] = useState(false)
  const presets = getPresets()
  const hasPresets = dealershipId && presets[dealershipId]?.length > 0

  const addTag = (raw) => {
    const tag = raw.trim().replace(/^#/, '')
    if (!tag || value.includes(`#${tag}`)) return
    onChange([...value, `#${tag}`])
    setInput('')
  }

  const removeTag = (tag) => {
    onChange(value.filter(t => t !== tag))
  }

  const handleKeyDown = (e) => {
    if (['Enter', ',', ' '].includes(e.key)) {
      e.preventDefault()
      addTag(input)
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }

  const loadPresets = () => {
    if (!dealershipId) return
    const preset = presets[dealershipId] || []
    const merged = [...new Set([...value, ...preset])]
    onChange(merged)
  }

  const saveAsPreset = () => {
    if (!dealershipId || value.length === 0) return
    const updated = { ...presets, [dealershipId]: [...value] }
    savePresets(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium text-slate-700">
          Hashtags
          <span className="ml-2 text-xs font-normal text-slate-400">Improves discoverability across platforms</span>
        </label>
        <div className="flex items-center gap-1.5">
          {hasPresets && (
            <button
              type="button"
              onClick={loadPresets}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              <Bookmark size={11} />
              Load presets
            </button>
          )}
          {value.length > 0 && (
            <button
              type="button"
              onClick={saveAsPreset}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors"
            >
              {saved ? <><BookmarkCheck size={11} className="text-green-600" /><span className="text-green-600">Saved!</span></> : <><BookmarkCheck size={11} />Save as preset</>}
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 p-3 border border-slate-300 rounded-xl min-h-[48px] focus-within:border-slate-500 focus-within:ring-2 focus-within:ring-slate-200 transition-all bg-white">
        {value.map(tag => (
          <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 text-sm rounded-lg font-medium">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="text-slate-400 hover:text-slate-600">
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => input && addTag(input)}
          placeholder={value.length === 0 ? 'Type a hashtag and press Enter' : 'Add more...'}
          className="flex-1 min-w-[120px] outline-none text-sm text-slate-900 placeholder:text-slate-400 bg-transparent"
        />
      </div>
      <p className="text-xs text-slate-400 mt-1">{value.length} hashtag{value.length !== 1 ? 's' : ''} added</p>
    </div>
  )
}

const PLATFORM_CAPTION = {
  instagram: { limit: 2200, soft: 125, tip: 'First 125 chars show in feed before "more" — lead with the hook.' },
  facebook:  { limit: 63206, soft: 480, tip: 'Under 480 chars shows without a "See More" cutoff in the news feed.' },
  tiktok:    { limit: 2200, soft: 150, tip: 'TikTok audiences skim — keep it punchy, under 150 chars.' },
  linkedin:  { limit: 3000, soft: 700, tip: 'LinkedIn readers engage with longer copy — 700+ chars can perform well here.' },
}

export default function Step4Upload({ data, onUpdate, onNext, onPrev }) {
  const isTextOnly = ['text_post', 'text_caption', 'text_update'].includes(data.content_type)
  const needsAltText = ['single_image', 'carousel', 'stories'].includes(data.content_type)
  const platformCaption = PLATFORM_CAPTION[data.platform] || { limit: 2200, soft: 2200, tip: null }

  const valid = data.caption.trim().length > 0 && (isTextOnly || data.file_name)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Upload & Caption</h3>
        <p className="text-sm text-slate-500 mt-1">
          Add your media file, write the caption, and include any hashtags. This is what the team will review.
        </p>
      </div>

      <div className="space-y-5">
        <FileDropZone
          contentType={data.content_type}
          currentFile={data}
          onFile={(fileData) => onUpdate(fileData)}
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Caption
            <span className="text-red-500 ml-0.5">*</span>
            <span className="ml-2 text-xs font-normal text-slate-400">
              Write the exact copy that will appear on the platform
            </span>
          </label>
          <textarea
            value={data.caption}
            onChange={(e) => onUpdate({ caption: e.target.value })}
            rows={4}
            maxLength={platformCaption.limit}
            placeholder="Enter your post caption here..."
            className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400
              focus:outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all resize-none"
          />
          <div className="flex justify-between mt-1 gap-4">
            <div className="flex-1">
              {platformCaption.tip && (
                <p className="text-xs text-indigo-600">
                  <span className="font-medium">Tip:</span> {platformCaption.tip}
                </p>
              )}
            </div>
            <p className={`text-xs flex-shrink-0 ${
              data.caption.length > platformCaption.soft ? 'text-amber-500 font-medium' : 'text-slate-400'
            }`}>
              {data.caption.length}/{platformCaption.limit}
              {data.caption.length > platformCaption.soft && ` · over ${platformCaption.soft} soft limit`}
            </p>
          </div>
        </div>

        <HashtagInput
          value={data.hashtags}
          onChange={(tags) => onUpdate({ hashtags: tags })}
          dealershipId={data.dealership_id}
        />

        {needsAltText && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Alt Text
              <span className="ml-2 text-xs font-normal text-slate-400">
                Required for accessibility and improves SEO reach
              </span>
            </label>
            <input
              type="text"
              value={data.alt_text}
              onChange={(e) => onUpdate({ alt_text: e.target.value })}
              maxLength={200}
              placeholder="Describe the image for visually impaired users (e.g., 'Red Honda CR-V parked outside Nalley Honda')"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400
                focus:outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all"
            />
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={onPrev}
          className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-50 transition-all"
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!valid}
          className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-medium text-sm
            hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Continue
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
