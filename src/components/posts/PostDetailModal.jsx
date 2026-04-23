import { format, parseISO } from 'date-fns'
import {
  Image, Video, Layout, Type, Calendar, Circle, Music,
  FileText, BookOpen, File, User, Clock, MapPin, Hash,
  AlignLeft, Users, MessageSquare, CheckCircle, AlertTriangle, XCircle
} from 'lucide-react'
import Modal from '../common/Modal'
import { StatusBadge, PlatformBadge } from '../common/Badge'
import { getPlatform, getContentType } from '../../data/platforms'
import { DEALERSHIPS } from '../../data/dealerships'

const ICON_MAP = { Image, Video, Layout, Type, Calendar, Circle, Music, FileText, BookOpen, File }

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-start gap-2 w-36 flex-shrink-0">
        <Icon size={14} className="text-slate-400 mt-0.5" />
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <span className="text-sm text-slate-900 flex-1">{value}</span>
    </div>
  )
}

export default function PostDetailModal({ post, isOpen, onClose }) {
  if (!post) return null

  const platform = getPlatform(post.platform)
  const ct = getContentType(post.platform, post.content_type)
  const dealership = DEALERSHIPS.find(d => d.id === post.dealership_id)
  const ContentIcon = ICON_MAP[ct?.icon] || File

  const formatSize = (bytes) => {
    if (!bytes) return null
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateStr) => {
    try { return format(parseISO(dateStr), 'MMM d, yyyy · h:mm a') }
    catch { return dateStr }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Post Details" size="md">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <PlatformBadge platformId={post.platform} />
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                <ContentIcon size={11} />
                {ct?.name}
              </span>
              <StatusBadge status={post.approval_status} />
            </div>
            <h3 className="font-semibold text-slate-900">{dealership?.name}</h3>
            <p className="text-sm text-slate-500">{dealership?.location}</p>
          </div>
        </div>

        {/* Media preview */}
        {(post.file_url || post.file_preview) && (
          <div className="mb-5 rounded-xl overflow-hidden border border-slate-200">
            {post.file_type?.startsWith('video/') ? (
              <video src={post.file_url || post.file_preview} controls className="w-full max-h-64 object-contain bg-black" />
            ) : (
              <img src={post.file_url || post.file_preview} alt={post.alt_text || 'Post media'} className="w-full max-h-64 object-cover" />
            )}
          </div>
        )}

        {!post.file_url && !post.file_preview && post.file_name && (
          <div className="mb-5 flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="p-2.5 bg-amber-100 rounded-lg">
              <File size={18} className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{post.file_name}</p>
              <p className="text-xs text-slate-500">{formatSize(post.file_size)} · {post.file_type}</p>
              <p className="text-xs text-amber-600 mt-0.5">File not hosted — configure Cloudinary in Settings to enable previews.</p>
            </div>
          </div>
        )}

        {/* Caption */}
        {post.caption && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Caption</p>
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{post.caption}</p>
          </div>
        )}

        {/* Hashtags */}
        {post.hashtags?.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Hashtags</p>
            <div className="flex flex-wrap gap-1.5">
              {post.hashtags.map(tag => (
                <span key={tag} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-100">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="rounded-xl border border-slate-200 overflow-hidden mb-5">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Post Details</p>
          </div>
          <div className="px-4 py-1">
            <DetailRow icon={MapPin}       label="Dealership"    value={`${dealership?.name}, ${dealership?.location}`} />
            <DetailRow icon={Calendar}     label="Scheduled"     value={post.scheduled_for} />
            <DetailRow icon={Clock}        label="Best time"     value={post.optimal_posting_time} />
            <DetailRow icon={Users}        label="Audience"      value={post.target_audience} />
            <DetailRow icon={MessageSquare} label="Reason"       value={post.posting_reason} />
            <DetailRow icon={AlignLeft}    label="Alt text"      value={post.alt_text} />
            <DetailRow icon={User}         label="Uploaded by"   value={post.uploaded_by_name} />
            <DetailRow icon={Clock}        label="Uploaded at"   value={formatDate(post.uploaded_at)} />
          </div>
        </div>

        {/* Chad's notes */}
        {post.chad_notes && (
          <div className={`p-4 rounded-xl border ${
            post.approval_status === 'approved'
              ? 'bg-green-50 border-green-200'
              : post.approval_status === 'flagged'
              ? 'bg-orange-50 border-orange-200'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {post.approval_status === 'approved' && <CheckCircle size={14} className="text-green-600" />}
              {post.approval_status === 'flagged' && <AlertTriangle size={14} className="text-orange-600" />}
              {post.approval_status === 'deleted' && <XCircle size={14} className="text-red-600" />}
              <p className="text-xs font-semibold text-slate-700">Manager Feedback</p>
              {post.chad_action_at && (
                <p className="text-xs text-slate-400 ml-auto">{formatDate(post.chad_action_at)}</p>
              )}
            </div>
            <p className="text-sm text-slate-800 leading-relaxed">{post.chad_notes}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
