import { getPlatform } from '../../data/platforms'

const STATUS_CONFIG = {
  pending:   { label: 'Pending Review', dot: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200/80' },
  approved:  { label: 'Approved',       dot: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200/80' },
  flagged:   { label: 'Needs Revision', dot: 'bg-orange-400',  text: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200/80' },
  deleted:   { label: 'Deleted',        dot: 'bg-slate-300',   text: 'text-slate-500',   bg: 'bg-slate-50',   border: 'border-slate-200' },
  published: { label: 'Published',      dot: 'bg-blue-400',    text: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200/80' },
}

const ROLE_CONFIG = {
  admin:        { label: 'Admin',        text: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200/80' },
  social_media: { label: 'Social Media', text: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200/80' },
  viewer:       { label: 'View Only',    text: 'text-slate-600',  bg: 'bg-slate-50',  border: 'border-slate-200' },
}

export function StatusBadge({ status, compact = false }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span className={`inline-flex items-center gap-1.5 border font-medium rounded-full
      ${compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'}
      ${cfg.text} ${cfg.bg} ${cfg.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

export function PlatformBadge({ platformId, compact = false }) {
  const platform = getPlatform(platformId)
  if (!platform) return null
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold text-white ${compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'}`}
      style={{ backgroundColor: platform.color }}
    >
      {platform.name}
    </span>
  )
}

export function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.viewer
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${cfg.text} ${cfg.bg} ${cfg.border}`}>
      {cfg.label}
    </span>
  )
}
