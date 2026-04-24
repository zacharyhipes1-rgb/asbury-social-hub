import { useState } from 'react'
import { Mail, Send, CheckCircle, X, ExternalLink } from 'lucide-react'
import Modal from '../common/Modal'
import { getPlatform, getContentType } from '../../data/platforms'
import { DEALERSHIPS } from '../../data/dealerships'
import { useAuth } from '../../context/AuthContext'
import { useUsers } from '../../context/UsersContext'
import { notifyApproval, notifyRevision, notifyDeletion } from '../../services/emailService'

const ACTION_CONFIG = {
  approve: {
    title:       'Approve & Notify',
    bodyIntro:   () => 'Your content submission has been approved and is ready for the publishing queue.',
    bodyLabel:   'Approval notes (optional)',
    placeholder: 'Add any notes or instructions for the uploader…',
    button:      'Approve & Notify',
    buttonStyle: 'bg-emerald-600 hover:bg-emerald-700',
    required:    false,
  },
  flag: {
    title:       'Request Revision',
    bodyIntro:   () => 'Your recent content submission requires revisions before it can be approved. Please review the feedback below and resubmit.',
    bodyLabel:   'Revision feedback (required)',
    placeholder: 'Describe what needs to be changed, corrected, or clarified…',
    button:      'Send Revision Request',
    buttonStyle: 'bg-amber-600 hover:bg-amber-700',
    required:    true,
  },
  delete: {
    title:       'Delete & Notify',
    bodyIntro:   () => 'Your recent content submission has been removed from the staging queue.',
    bodyLabel:   'Reason for deletion (required)',
    placeholder: 'Explain why this content was removed…',
    button:      'Delete & Notify',
    buttonStyle: 'bg-red-600 hover:bg-red-700',
    required:    true,
  },
}

function isEmailJSConfigured() {
  try {
    const c = JSON.parse(localStorage.getItem('asbury_emailjs_config') || '{}')
    return !!(c.serviceId && c.templateId && c.publicKey)
  } catch { return false }
}

export default function NotificationModal({ post, action, isOpen, onClose, onConfirm }) {
  const { currentUser } = useAuth()
  const { getUserByEmail } = useUsers()
  const [notes, setNotes]     = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const configured = isEmailJSConfigured()

  if (!post || !action) return null

  const cfg        = ACTION_CONFIG[action]
  const platform   = getPlatform(post.platform)
  const ct         = getContentType(post.platform, post.content_type)
  const dealership = DEALERSHIPS.find((d) => d.id === post.dealership_id)
  const uploader   = getUserByEmail(post.uploaded_by) || { name: post.uploaded_by_name, email: post.uploaded_by }
  const canSubmit  = !cfg.required || notes.trim().length > 0

  const handleConfirm = async () => {
    setSending(true)

    try {
      if (action === 'approve') {
        await notifyApproval({ post, uploader, admin: currentUser, notes })
      } else if (action === 'flag') {
        await notifyRevision({ post, uploader, admin: currentUser, notes })
      } else if (action === 'delete') {
        await notifyDeletion({ post, uploader, admin: currentUser, notes })
      }
    } catch {}

    setSent(true)
    setTimeout(() => {
      onConfirm(notes)
      setSending(false)
      setSent(false)
      setNotes('')
      onClose()
    }, 700)
  }

  const handleClose = () => {
    setNotes('')
    setSent(false)
    setSending(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={cfg.title} size="md">
      <div className="p-6 space-y-5">
        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {cfg.bodyLabel}
            {cfg.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={cfg.placeholder}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400
              focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none transition-all"
          />
        </div>

        {/* Email preview */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Mail size={13} className="text-slate-400" />
              <p className="text-xs font-semibold text-slate-600">Email Preview</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${
              configured
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                : 'text-slate-500 bg-slate-50 border-slate-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${configured ? 'bg-emerald-400' : 'bg-slate-300'}`} />
              {configured ? 'Will send' : 'Logged only'}
            </span>
          </div>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 space-y-1.5">
              {[
                ['From', `${currentUser?.name} <${currentUser?.email}>`],
                ['To',   `${uploader.name} <${uploader.email}>`],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3 text-xs">
                  <span className="text-slate-400 w-10 font-medium">{k}</span>
                  <span className="text-slate-700">{v}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-4 text-sm text-slate-700 space-y-3">
              <p>Hi {uploader.name?.split(' ')[0]},</p>
              <p>{cfg.bodyIntro()}</p>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-xs space-y-1.5">
                <p><span className="font-semibold text-slate-500">Platform:</span> {platform?.name} · {ct?.name}</p>
                <p><span className="font-semibold text-slate-500">Dealership:</span> {dealership?.name}</p>
                {post.caption && (
                  <p><span className="font-semibold text-slate-500">Caption:</span> {post.caption.slice(0, 100)}{post.caption.length > 100 ? '…' : ''}</p>
                )}
                <p><span className="font-semibold text-slate-500">Scheduled:</span> {post.scheduled_for}</p>
              </div>
              {notes && (
                <div className="border-l-2 border-indigo-300 pl-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Manager Notes:</p>
                  <p className="text-slate-800">{notes}</p>
                </div>
              )}
              <p className="text-slate-500 text-xs">Log in to Asbury Social Hub to view full details and take action.</p>
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-400">
                <p className="font-semibold text-slate-500">{currentUser?.name}</p>
                <p>{currentUser?.title} · Asbury Automotive Group</p>
              </div>
            </div>
          </div>
          {!configured && (
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              Configure EmailJS in{' '}
              <a href="/settings" className="text-indigo-500 hover:underline inline-flex items-center gap-0.5">
                Settings <ExternalLink size={10} />
              </a>{' '}
              to send real emails.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit || sending}
            className={`flex items-center gap-2 px-6 py-2.5 text-white rounded-xl text-sm font-semibold
              transition-all disabled:opacity-40 disabled:cursor-not-allowed ${cfg.buttonStyle}`}
          >
            {sent ? (
              <><CheckCircle size={14} /> Done</>
            ) : sending ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
            ) : (
              <><Send size={14} /> {cfg.button}</>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
