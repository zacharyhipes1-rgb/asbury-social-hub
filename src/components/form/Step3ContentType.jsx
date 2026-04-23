import { ChevronLeft, ChevronRight, Image, Video, Layout, Type, Calendar, Circle, Music, FileText, BookOpen, File } from 'lucide-react'
import { getPlatform } from '../../data/platforms'

const ICON_MAP = {
  Image:    Image,
  Video:    Video,
  Layout:   Layout,
  Type:     Type,
  Calendar: Calendar,
  Circle:   Circle,
  Music:    Music,
  FileText: FileText,
  BookOpen: BookOpen,
  File:     File,
}

const CONTENT_TYPE_TIPS = {
  single_image:   'A single static image. Best for product shots, announcements, or promotions.',
  video:          'A native video post. Videos get 3× more engagement than static images on most platforms.',
  carousel:       'Multiple images or cards. Ideal for showcasing multiple vehicles or telling a step-by-step story.',
  text_post:      'Text-only post. Use sparingly — best for quick announcements or questions that drive comments.',
  event_promotion:'Promotes an upcoming event. Shows on the Events tab and in feeds.',
  reel:           'Short-form video (up to 90s). Reels get the highest organic reach on Instagram.',
  stories:        'Ephemeral 24-hour content. Good for behind-the-scenes, polls, or urgency-driven messages.',
  text_caption:   'Image or video with a focus on a long-form caption. Good for storytelling.',
  trending_sounds:'Video paired with a trending audio track. Dramatically increases TikTok discoverability.',
  carousel_pdf:   'A multi-slide PDF carousel. LinkedIn\'s highest-performing organic format.',
  article:        'A long-form LinkedIn article. Builds thought leadership and search visibility.',
  text_update:    'A text-only LinkedIn post. Best for announcements, quotes, or conversation starters.',
  document:       'Upload a document (PDF, PPT). Shows as a scrollable preview in the feed.',
}

export default function Step3ContentType({ data, onUpdate, onNext, onPrev }) {
  const platform = getPlatform(data.platform)
  const selected = data.content_type

  if (!platform) return null

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: platform.color }}>
            <span className="text-[10px]">
              {platform.name[0]}
            </span>
          </div>
          <span className="text-sm font-medium" style={{ color: platform.color }}>{platform.name}</span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900">Select Content Type</h3>
        <p className="text-sm text-slate-500 mt-1">
          Choose the format that best fits your content. Different formats have different file requirements and audience behaviors.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {platform.contentTypes.map(ct => {
          const IconComponent = ICON_MAP[ct.icon] || Image
          const isSelected = selected === ct.id
          const tip = CONTENT_TYPE_TIPS[ct.id] || ''

          return (
            <button
              key={ct.id}
              type="button"
              onClick={() => onUpdate({ content_type: ct.id })}
              className={`
                text-left p-4 rounded-xl border-2 transition-all
                ${isSelected ? 'border-2 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}
              `}
              style={isSelected ? { borderColor: platform.color, backgroundColor: platform.lightBg } : {}}
            >
              <div className="flex items-start gap-3">
                <div className={`
                  p-2 rounded-lg flex-shrink-0
                  ${isSelected ? 'text-white' : 'bg-slate-100 text-slate-500'}
                `}
                  style={isSelected ? { backgroundColor: platform.color } : {}}
                >
                  <IconComponent size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`font-semibold text-sm ${isSelected ? 'text-slate-900' : 'text-slate-800'}`}>
                      {ct.name}
                    </p>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: platform.color }}>
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
          disabled={!selected}
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
