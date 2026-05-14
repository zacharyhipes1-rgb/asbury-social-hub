import { format, parseISO } from 'date-fns'
import {
  Image, Video, Layout, Type, Calendar, Circle, Music,
  FileText, BookOpen, File, User, Clock, MapPin,
  AlignLeft, Users, MessageSquare, CheckCircle, AlertTriangle, XCircle,
  Download, ExternalLink
} from 'lucide-react'
import Modal from '../common/Modal'
import { StatusBadge, PlatformBadge } from '../common/Badge'
import { getPlatform, getContentType } from '../../data/platforms'
import { DEALERSHIPS } from '../../data/dealerships'
import { useUsers } from '../../context/UsersContext'

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
  const { getUserByEmail } = useUsers()
  if (!post) return null

  const uploaderName = getUserByEmail(post.uploaded_by)?.name || post.uploaded_by_name
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

        {/* Media preview — clickable + downloadable for any viewer */}
        {(() => {
          // Prefer file_url (hosted, cross-user). file_preview blob: URLs are session-local
          // and won't render for other users — skip those.
          const hostedSrc = post.file_url || (
            post.file_preview && !post.file_preview.startsWith('blob:')
              ? post.file_preview : null
          )
          const localSrc = post.file_preview
          const src = hostedSrc || localSrc
          if (!src && !post.file_name) return null

          const isVideo = post.file_type?.startsWith('video/')
          const isBlobOrData = src && (src.startsWith('blob:') || src.startsWith('data:'))
          const showVideoPlayer = isVideo && (hostedSrc || isBlobOrData)
          const downloadName = post.file_name || (isVideo ? 'video' : 'image')

          // For hosted URLs (Cloudinary, https), use fl_attachment to force download from Cloudinary,
          // otherwise rely on the download attribute. Cross-origin downloads may navigate instead.
          const downloadHref = hostedSrc
            ? (hostedSrc.includes('/upload/') && hostedSrc.includes('res.cloudinary.com')
                ? hostedSrc.replace('/upload/', '/upload/fl_attachment/')
                : hostedSrc)
            : src

          if (!src) {
            return (
              <div className="mb-5 flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="p-2.5 bg-slate-100 rounded-lg">
                  <File size={18} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{post.file_name}</p>
                  <p className="text-xs text-slate-500">{formatSize(post.file_size)} · {post.file_type}</p>
                  <p className="text-xs text-slate-400 mt-0.5">No hosted preview — configure Cloudinary in Settings to view this file.</p>
                </div>
              </div>
            )
          }

          return (
            <div className="mb-5">
              <div className="rounded-xl overflow-hidden border border-slate-200 relative bg-slate-50">
                {showVideoPlayer ? (
                  <video src={src} controls className="w-full max-h-72 object-contain bg-black" />
                ) : (
                  <a
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group"
                    title="Open full-size in a new tab"
                  >
                    <img
                      src={src}
                      alt={post.alt_text || 'Post media'}
                      className="w-full max-h-72 object-contain bg-slate-50 transition-opacity group-hover:opacity-95"
                    />
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
                          <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </div>
                    )}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors min-h-[36px]"
                >
                  <ExternalLink size={12} /> View full size
                </a>
                <a
                  href={downloadHref}
                  download={downloadName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors min-h-[36px]"
                >
                  <Download size={12} /> Download
                </a>
                {post.file_name && (
                  <span className="text-xs text-slate-400 truncate flex-1 min-w-0">
                    {post.file_name}{post.file_size ? ` · ${formatSize(post.file_size)}` : ''}
                  </span>
                )}
              </div>
              {!hostedSrc && localSrc && (
                <p className="text-xs text-amber-700 mt-2 flex items-start gap-1.5">
                  <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
                  This preview is only visible in the uploader's browser. Configure Cloudinary in Settings so the team can view the original file.
                </p>
              )}
            </div>
          )
        })()}

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
            <DetailRow icon={User}         label="Uploaded by"   value={uploaderName} />
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
