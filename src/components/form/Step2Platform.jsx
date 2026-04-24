import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react'
import { PLATFORMS } from '../../data/platforms'

const PLATFORM_META = {
  facebook: {
    icon: '𝐟',
    description: 'Best for event promotions, video content, and reaching an older, established audience.',
    audience: '35–65+',
    strength: 'Events & Video',
  },
  instagram: {
    icon: '◎',
    description: 'Ideal for visual storytelling, Reels, and building brand lifestyle with younger buyers.',
    audience: '18–44',
    strength: 'Visual & Reels',
  },
  tiktok: {
    icon: '♪',
    description: 'High-reach short video platform for first-time buyers and brand awareness at scale.',
    audience: '18–34',
    strength: 'Organic Reach',
  },
  linkedin: {
    icon: 'in',
    description: 'Professional network for corporate updates, thought leadership, and B2B content.',
    audience: '30–55',
    strength: 'B2B & Corporate',
  },
}

export default function Step2Platform({ data, onUpdate, onNext, onPrev }) {
  const selected = data.platform

  const handleSelect = (id) => {
    onUpdate({ platform: id, content_type: '' })
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Select Platform</h3>
        <p className="text-sm text-slate-500 mt-1">
          Choose where this content will be published. Platform selection determines which content formats are available in the next step.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLATFORMS.map(platform => {
          const meta = PLATFORM_META[platform.id]
          const isSelected = selected === platform.id

          return (
            <button
              key={platform.id}
              type="button"
              onClick={() => handleSelect(platform.id)}
              className={`
                text-left p-5 rounded-xl border-2 transition-all
                ${isSelected
                  ? 'border-2 shadow-md'
                  : selected
                    ? 'border-slate-200 bg-white opacity-40 hover:opacity-70 hover:border-slate-300'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }
              `}
              style={isSelected ? {
                borderColor: platform.color,
                backgroundColor: platform.lightBg,
              } : {}}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: platform.color }}
                >
                  {meta.icon}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{platform.name}</p>
                  <p className="text-xs text-slate-500">Audience: {meta.audience}</p>
                </div>
                {isSelected && (
                  <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: platform.color }}>
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{meta.description}</p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-slate-200 text-slate-600">
                <TrendingUp size={11} />
                {meta.strength}
              </div>
            </button>
          )
        })}
      </div>

      <div className="sticky bottom-0 bg-white border-t border-slate-100 -mx-6 px-6 py-4 mt-8 flex items-center justify-between">
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
          {selected ? `Continue with ${PLATFORMS.find(p => p.id === selected)?.name}` : 'Continue'}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
