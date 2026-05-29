import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, UploadCloud, File, X, Hash, Image, CheckCircle, AlertCircle, Loader, Bookmark, BookmarkCheck, Library, Sparkles } from 'lucide-react'
import {
  validateFile,
  uploadToCloudinary,
  isCloudinaryConfigured,
} from '../../lib/cloudinary'
import { DEALERSHIPS } from '../../data/dealerships'
import AssetPickerModal from '../assets/AssetPickerModal'

function getPresets() {
  try { return JSON.parse(localStorage.getItem('asbury_hashtag_presets') || '{}') } catch { return {} }
}
function savePresets(presets) {
  localStorage.setItem('asbury_hashtag_presets', JSON.stringify(presets))
}

function FileDropZone({ onFile, currentFile, contentType }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const inputRef = useRef(null)

  const isTextOnly = ['text_post', 'text_caption', 'text_update'].includes(contentType)
  if (isTextOnly) return null

  const handleFile = async (file) => {
    if (!file) return
    setUploadError('')

    const error = validateFile(file)
    if (error) { setUploadError(error); return }

    if (isCloudinaryConfigured()) {
      setUploading(true)
      onFile({ file_name: file.name, file_size: file.size, file_type: file.type, file_preview: null, file_url: null })
      try {
        const { secure_url } = await uploadToCloudinary(file)
        onFile({ file_name: file.name, file_size: file.size, file_type: file.type, file_preview: secure_url, file_url: secure_url })
      } catch {
        setUploadError('Cloudinary upload failed — check your config in Settings.')
        // Fall back to local preview so the uploader can still see their file this session
        const localPreview = await getLocalPreview(file)
        onFile({ file_name: file.name, file_size: file.size, file_type: file.type, file_preview: localPreview, file_url: null })
      }
      setUploading(false)
    } else {
      const localPreview = await getLocalPreview(file)
      onFile({ file_name: file.name, file_size: file.size, file_type: file.type, file_preview: localPreview, file_url: null })
    }
  }

  const handlePickFromLibrary = (asset) => {
    onFile({
      file_name:    asset.file_name,
      file_size:    asset.file_size,
      file_type:    asset.file_type,
      file_preview: asset.file_url,
      file_url:     asset.file_url,
    })
  }

  // Returns a preview URL for the file:
  //   images  → base64 data URL  (persists in localStorage; usable as <img src>)
  //   videos  → object URL       (session-only; lets the uploader preview the video right now)
  //   other   → object URL       (session-only)
  const getLocalPreview = (file) => {
    if (file.type.startsWith('image/')) {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = () => resolve(URL.createObjectURL(file)) // fallback
        reader.readAsDataURL(file)
      })
    }
    return Promise.resolve(URL.createObjectURL(file))
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
        <div className="border-2 border-green-200 bg-green-50 rounded-xl overflow-hidden">
          {/* Video preview */}
          {!uploading && currentFile.file_preview && currentFile.file_type?.startsWith('video/') && (
            <video
              src={currentFile.file_preview}
              controls
              className="w-full max-h-48 bg-black object-contain"
            />
          )}
          {/* Image preview */}
          {!uploading && currentFile.file_preview && currentFile.file_type?.startsWith('image/') && (
            <img src={currentFile.file_preview} alt="preview" className="w-full max-h-48 object-cover" />
          )}
          <div className="flex items-center gap-3 p-3">
            {uploading ? (
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <Loader size={18} className="text-indigo-500 animate-spin" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={16} className="text-green-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-slate-900 truncate">{currentFile.file_name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{formatSize(currentFile.file_size)} · {currentFile.file_type}</p>
            </div>
            <button
              type="button"
              onClick={() => onFile({ file_name: '', file_size: 0, file_type: '', file_preview: null })}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
          onClick={() => inputRef.current?.click()}
          className={`
            cursor-pointer border-2 border-dashed rounded-xl p-5 sm:p-8 text-center transition-all
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

      {!currentFile?.file_name && (
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">or</span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>
      )}
      {!currentFile?.file_name && (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-sm font-medium text-slate-700 rounded-xl transition-colors min-h-[44px]"
        >
          <Library size={14} /> Pick from Asset Library
        </button>
      )}

      {uploadError && (
        <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle size={11} />{uploadError}</p>
      )}
      {!uploadError && currentFile?.file_url && (
        <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1"><CheckCircle size={11} />Uploaded to Cloudinary — your team can view this.</p>
      )}
      {!uploadError && currentFile?.file_name && !currentFile?.file_url && !uploading && (
        <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
          <Image size={11} />
          Preview available in this browser session. Configure Cloudinary in Settings for permanent hosting.
        </p>
      )}

      <AssetPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickFromLibrary}
      />
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
  const [aiLoading, setAiLoading] = useState(false)
  const [aiCaptions, setAiCaptions] = useState([])
  const [aiError, setAiError] = useState('')
  const [aiContext, setAiContext] = useState('')

  const handleGenerateCaptions = async () => {
    setAiLoading(true)
    setAiError('')
    setAiCaptions([])
    try {
      // Send full dealership + platform context for much better captions
      const dealershipId = data.dealership_ids?.[0] || data.dealership_id || ''
      const dealership   = DEALERSHIPS.find(d => d.id === dealershipId) || {}
      const res = await fetch('/api/generate-caption', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          dealershipName:     dealership.name     || dealershipId,
          dealershipLocation: dealership.location || '',
          dealershipBrand:    dealership.brand    || '',
          platform:           data.platforms?.[0] || data.platform || 'instagram',
          contentType:        data.content_type   || '',
          altText:            data.alt_text        || '',
          contentPillar:      data.content_pillar  || '',
          postingReason:      data.posting_reason  || '',
          context:            aiContext.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Generation failed')
      setAiCaptions(json.captions || [])
    } catch (err) {
      setAiError(err.message || 'Something went wrong. Check that ANTHROPIC_API_KEY is set in Vercel.')
    } finally {
      setAiLoading(false)
    }
  }
  // Multi-select aware: fall back to legacy singular fields when present
  const platformIds   = data.platforms?.length      ? data.platforms      : (data.platform      ? [data.platform]      : [])
  const dealershipIds = data.dealership_ids?.length ? data.dealership_ids : (data.dealership_id ? [data.dealership_id] : [])
  const primaryPlatformId   = platformIds[0]
  const primaryDealershipId = dealershipIds[0]
  // When multiple platforms are selected, enforce the strictest caption limits across them.
  const platformCaption = platformIds.length > 1
    ? platformIds.reduce((acc, pid) => {
        const c = PLATFORM_CAPTION[pid]
        if (!c) return acc
        return {
          limit: Math.min(acc.limit, c.limit),
          soft:  Math.min(acc.soft,  c.soft),
          tip:   `Strictest limits shown — caption posts to ${platformIds.length} platforms.`,
        }
      }, { limit: 999999, soft: 999999, tip: null })
    : (PLATFORM_CAPTION[primaryPlatformId] || { limit: 2200, soft: 2200, tip: null })

  const valid = data.caption.trim().length > 0 && (isTextOnly || data.file_name)

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5 sm:mb-6">
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

          {/* AI Caption Generator */}
          <div className="mt-3 rounded-xl border border-indigo-100 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-indigo-100">
              <Sparkles size={14} className="text-indigo-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-indigo-700">Generate Caption with AI</p>
              <span className="ml-auto text-xs text-indigo-400">Powered by Claude</span>
            </div>
            <div className="p-3.5 bg-white space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiContext}
                  onChange={e => setAiContext(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !aiLoading && handleGenerateCaptions()}
                  placeholder="Add context — e.g. 'weekend tent sale, Honda Pilot, family audience'"
                  className="flex-1 text-sm px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 bg-white"
                />
                <button
                  type="button"
                  onClick={handleGenerateCaptions}
                  disabled={aiLoading}
                  className="btn-press inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50 whitespace-nowrap transition-all"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', boxShadow: aiLoading ? 'none' : '0 2px 10px rgba(99,102,241,0.3)' }}
                >
                  {aiLoading
                    ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Generating…</>
                    : <><Sparkles size={13} />Generate</>}
                </button>
              </div>
              <p className="text-xs text-slate-400">AI uses the selected dealership, platform, content type, and alt text for context. Press Enter or click Generate.</p>
              {aiError && (
                <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-100 rounded-lg">
                  <AlertCircle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">{aiError}</p>
                </div>
              )}
              {aiCaptions.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-medium text-slate-500">Click any option to use it:</p>
                  {aiCaptions.map((cap, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { onUpdate({ caption: cap }); setAiCaptions([]) }}
                      className="w-full text-left text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 transition-all leading-relaxed whitespace-pre-wrap"
                    >
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 mb-1.5">Option {i + 1}</span>
                      <br />{cap}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <HashtagInput
          value={data.hashtags}
          onChange={(tags) => onUpdate({ hashtags: tags })}
          dealershipId={primaryDealershipId}
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

      <div className="sticky bottom-0 bg-white border-t border-slate-100 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 mt-6 sm:mt-8 flex items-center justify-between">
        <button
          onClick={onPrev}
          className="flex items-center gap-2 px-4 sm:px-5 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-50 transition-all"
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!valid}
          className="flex items-center gap-2 px-5 sm:px-6 py-2.5 bg-slate-900 text-white rounded-xl font-medium text-sm
            hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Continue to Scheduling
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
