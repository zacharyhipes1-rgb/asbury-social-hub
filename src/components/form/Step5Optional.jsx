import { useEffect } from 'react'
import { ChevronLeft, CheckCircle, Users, MessageSquare, Clock, Calendar, Tag } from 'lucide-react'
import { DEALERSHIPS } from '../../data/dealerships'
import { getPlatform, getContentType } from '../../data/platforms'

const CONTENT_PILLARS = [
  { value: 'inventory',   label: 'Inventory / New Arrivals' },
  { value: 'promotion',   label: 'Sales Event / Promotion' },
  { value: 'service',     label: 'Service & Parts' },
  { value: 'brand',       label: 'Brand Culture / Team' },
  { value: 'community',   label: 'Community / Local' },
  { value: 'seasonal',    label: 'Seasonal / Holiday' },
  { value: 'corporate',   label: 'Corporate / Announcement' },
]

const POSTING_REASONS = [
  { value: 'inventory_push',   label: 'Inventory Push — move specific models' },
  { value: 'sales_event',      label: 'Sales Event — weekend / monthly promo' },
  { value: 'brand_awareness',  label: 'Brand Awareness — grow audience' },
  { value: 'service_campaign', label: 'Service Campaign — drive service lane' },
  { value: 'community',        label: 'Community — local event / sponsorship' },
  { value: 'seasonal',         label: 'Seasonal / Holiday content' },
  { value: 'other',            label: 'Other' },
]

const PLATFORM_TIMES = {
  instagram: '10:00',
  facebook:  '11:00',
  tiktok:    '19:00',
  linkedin:  '09:00',
}

const PLATFORM_TIME_TIPS = {
  instagram: 'Tues–Fri 10–11am performs best for auto dealerships',
  facebook:  'Wed 11am–1pm shows highest engagement for local business pages',
  tiktok:    'Tues & Thurs 7–9pm drives the most organic reach',
  linkedin:  'Tues–Thurs 9–10am hits decision-makers before their day fills up',
}

function ReviewRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 w-28 sm:w-36 flex-shrink-0">{label}</span>
      <span className="text-sm text-slate-900 flex-1">{value}</span>
    </div>
  )
}

export default function Step5Optional({ data, onUpdate, onSubmit, onPrev, isSubmitting, adminName = 'your manager' }) {
  const dealership  = DEALERSHIPS.find(d => d.id === data.dealership_id)
  const platform    = getPlatform(data.platform)
  const contentType = getContentType(data.platform, data.content_type)

  // Auto-populate optimal time when step loads if not already set
  useEffect(() => {
    if (!data.optimal_posting_time && data.platform && PLATFORM_TIMES[data.platform]) {
      onUpdate({ optimal_posting_time: PLATFORM_TIMES[data.platform] })
    }
  }, []) // eslint-disable-line

  const valid = data.scheduled_for && data.posting_reason && data.content_pillar

  const pillarLabel   = CONTENT_PILLARS.find(p => p.value === data.content_pillar)?.label
  const reasonLabel   = POSTING_REASONS.find(r => r.value === data.posting_reason)?.label

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5 sm:mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Details & Review</h3>
        <p className="text-sm text-slate-500 mt-1">
          Provide scheduling and context, then review before submitting for approval.
        </p>
      </div>

      <div className="space-y-5 mb-8">

        {/* Content Pillar — NEW */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Tag size={14} />
              Content Pillar
              <span className="text-red-500">*</span>
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CONTENT_PILLARS.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => onUpdate({ content_pillar: p.value })}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  data.content_pillar === p.value
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-1.5">Helps track content mix and ensure strategic balance across pillars.</p>
        </div>

        {/* Posting Reason — now a required dropdown */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            <span className="flex items-center gap-1.5">
              <MessageSquare size={14} />
              Reason for Posting
              <span className="text-red-500">*</span>
            </span>
          </label>
          <select
            value={data.posting_reason}
            onChange={(e) => onUpdate({ posting_reason: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900
              focus:outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all bg-white"
          >
            <option value="">Select a reason…</option>
            {POSTING_REASONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">Gives your manager the context they need to approve quickly.</p>
        </div>

        {/* Scheduled Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              Scheduled Date
              <span className="text-red-500">*</span>
            </span>
          </label>
          <input
            type="date"
            value={data.scheduled_for}
            onChange={(e) => onUpdate({ scheduled_for: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            className="w-full sm:w-auto px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900
              focus:outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all"
          />
          <p className="text-xs text-slate-400 mt-1">When should this post go live? Your manager will approve before publishing.</p>
        </div>

        {/* Optimal Posting Time — now auto-populated */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              Optimal Posting Time
            </span>
          </label>
          <input
            type="time"
            value={data.optimal_posting_time}
            onChange={(e) => onUpdate({ optimal_posting_time: e.target.value })}
            className="w-full sm:w-auto px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900
              focus:outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all"
          />
          {data.platform && PLATFORM_TIME_TIPS[data.platform] && (
            <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
              <span className="font-medium">Tip:</span> {PLATFORM_TIME_TIPS[data.platform]}
            </p>
          )}
        </div>

        {/* Target Audience */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Users size={14} />
              Target Audience
            </span>
          </label>
          <input
            type="text"
            value={data.target_audience}
            onChange={(e) => onUpdate({ target_audience: e.target.value })}
            placeholder="e.g., Honda owners in College Park, ages 25–54"
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400
              focus:outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all"
          />
          <p className="text-xs text-slate-400 mt-1">Used for paid boosting and audience targeting later.</p>
        </div>
      </div>

      {/* Review Summary */}
      <div className="rounded-xl border border-slate-200 overflow-hidden mb-6">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <p className="text-sm font-semibold text-slate-700">Submission Summary</p>
        </div>
        <div className="px-4 py-1">
          <ReviewRow label="Dealership"     value={dealership?.name} />
          <ReviewRow label="Location"       value={dealership?.location} />
          <ReviewRow label="Platform"       value={platform?.name} />
          <ReviewRow label="Content Type"   value={contentType?.name} />
          <ReviewRow label="Content Pillar" value={pillarLabel} />
          <ReviewRow label="Posting Reason" value={reasonLabel} />
          <ReviewRow label="Caption"        value={data.caption ? `${data.caption.slice(0, 80)}${data.caption.length > 80 ? '...' : ''}` : null} />
          <ReviewRow label="Hashtags"       value={data.hashtags.length ? data.hashtags.join(' ') : null} />
          <ReviewRow label="File"           value={data.file_name || null} />
          <ReviewRow label="Scheduled For"  value={data.scheduled_for} />
          <ReviewRow label="Best Time"      value={data.optimal_posting_time} />
          <ReviewRow label="Audience"       value={data.target_audience || null} />
        </div>
      </div>

      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 mb-6">
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Before submitting:</span> Your content will be sent to {adminName} for review. You'll receive an email notification once it's approved, flagged, or removed.
        </p>
      </div>

      <div className="sticky bottom-0 bg-white border-t border-slate-100 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 mt-6 flex items-center justify-between">
        <button
          onClick={onPrev}
          className="flex items-center gap-2 px-4 sm:px-5 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-50 transition-all"
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={!valid || isSubmitting}
          className="flex items-center gap-2 px-5 sm:px-6 py-2.5 bg-green-600 text-white rounded-xl font-medium text-sm
            hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle size={16} />
              Submit for Approval
            </>
          )}
        </button>
      </div>
    </div>
  )
}
