import { ChevronLeft, ChevronRight, Image, Video, Layout, Type, Calendar, Circle, Music, FileText, BookOpen, File } from 'lucide-react'
import { getPlatform } from '../../data/platforms'

const ICON_MAP = {
  Image, Video, Layout, Type, Calendar, Circle, Music, FileText, BookOpen, File,
}

const CONTENT_TYPE_TIPS = {
  single_image:    'A single static image. Best for product shots, announcements, or promotions.',
  video:           'A native video post. Videos get 3× more engagement than static images on most platforms.',
  carousel:        'Multiple images or cards. Ideal for showcasing multiple vehicles or telling a step-by-step story.',
  text_post:       'Text-only post. Use sparingly — best for quick announcements or questions that drive comments.',
  event_promotion: 'Promotes an upcoming event. Shows on the Events tab and in feeds.',
  reel:            'Short-form video (up to 90s). Reels get the highest organic reach on Instagram.',
  stories:         'Ephemeral 24-hour content. Good for behind-the-scenes, polls, or urgency-driven messages.',
  text_caption:    'Image or video with a focus on a long-form caption. Good for storytelling.',
  trending_sounds: 'Video paired with a trending audio track. Dramatically increases TikTok discoverability.',
  carousel_pdf:    "A multi-slide PDF carousel. LinkedIn's highest-performing organic format.",
  article:         'A long-form LinkedIn article. Builds thought leadership and search visibility.',
  text_update:     'A text-only LinkedIn post. Best for announcements, quotes, or conversation starters.',
  document:        'Upload a document (PDF, PPT). Shows as a scrollable preview in the feed.',
}

// Universal content types used when multiple platforms are selected
const UNIVERSAL_TYPES = [
  { id: 'single_image', name: 'Photo',    icon: 'Image',  description: 'A static image — works on all platforms.' },
  { id: 'video',        name: 'Video',    icon: 'Video',  description: 'A video post — Reel on Instagram, Short Video on TikTok, native video on Facebook/LinkedIn.' },
  { id: 'carousel',     name: 'Carousel', icon: 'Layout', description: 'Multiple images/slides — supported across Facebook, Instagram, and LinkedIn.' },
  { id: 'text_post',    name: 'Text',     icon: 'Type',   description: 'Text-only post. Best for LinkedIn and Facebook updates.' },
]

export default function Step3ContentType({ data, onUpdate, onNext, onPrev }) {
  const platforms     = data.platforms || []
  const isMulti       = platforms.length > 1
  const primaryId     = platforms[0]
  const platform      = getPlatform(primaryId)
  const selected      = data.content_type

  const contentTypes  = isMulti ? UNIVERSAL_TYPES : (platform?.contentTypes || [])

  if (!isMulti && !platform) return null

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5 sm:mb-6">
        {isMulti ? (
          <>
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              {platforms.map(pid => {
                const p = getPlatform(pid)
                return p ? (
                  <span key={pid} className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded text-white" style={{ backgroundColor: p.color }}>
                    {p.name}
                  </span>
                ) : null
              })}
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Select Content Format</h3>
            <p className="text-sm text-slate-500 mt-1">
              Choose a universal format that works across all selected platforms. Each platform will receive the same file and caption.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: platform.color }}>
                <span className="text-[10px]">{platform.name[0]}</span>
              </div>
              <span className="text-sm font-medium" style={{ color: platform.color }}>{platform.name}</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Select Content Type</h3>
            <p className="text-sm text-slate-500 mt-1">
              Choose the format that best fits your content. Different formats have different file requirements and audience behaviors.
            </p>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {contentTypes.map(ct => {
          const IconComponent = ICON_MAP[ct.icon] || Image
          const isSelected    = selected === ct.id
          const tip           = ct.description || CONTENT_TYPE_TIPS[ct.id] || ''
          const accentColor   = isMulti ? '#6366f1' : platform?.color

          return (
            <button
              key={ct.id}
              type="button"
              onClick={() => onUpdate({ content_type: ct.id })}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'shadow-sm'
                  : selected
                    ? 'border-slate-200 bg-white opacity-40 hover:opacity-70 hover:border-slate-300'
                    : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
              style={isSelected ? { borderColor: accentColor, backgroundColor: isMulti ? '#eef2ff' : platform?.lightBg } : {}}
            >
              <div className="flex items-start gap-3">
                <div
                  className="p-2 rounded-lg flex-shrink-0"
                  style={isSelected ? { backgroundColor: accentColor } : { backgroundColor: '#f1f5f9', color: '#64748b' }}
                >
                  <IconComponent size={16} className={isSelected ? 'text-white' : ''} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-slate-800">{ct.name}</p>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: accentColor }}>
                        <span className="text-white text-[9px]">✓</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{tip}</p>
                </div>
              </div>
            </button>
          )
        })}
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
          disabled={!selected}
          className="flex items-center gap-2 px-5 sm:px-6 py-2.5 bg-slate-900 text-white rounded-xl font-medium text-sm
            hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {selected
            ? `Continue with ${contentTypes.find(c => c.id === selected)?.name}`
            : 'Continue'}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
