import { useState } from 'react'
import {
  Users, UserPlus, Shield, Eye, AtSign, Search, X, Check, Pencil,
  UserX, UserCheck, Trash2, AlertTriangle, FileText, Mail, Send,
  Clock, RotateCcw,
} from 'lucide-react'
import { useUsers } from '../context/UsersContext'
import { useAuth } from '../context/AuthContext'
import { usePosts } from '../context/PostsContext'
import { useInvites } from '../context/InvitesContext'
import { useToast } from '../context/ToastContext'
import { RoleBadge } from '../components/common/Badge'
import {
  notifyUserApproved,
  notifyUserRejected,
  sendInvite as emailSendInvite,
} from '../services/emailService'

// ── Constants ──────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: 'admin',        label: 'Admin',       desc: 'Full access — approve, manage users, settings' },
  { value: 'social_media', label: 'Social Media', desc: 'Upload content and view own submissions' },
  { value: 'viewer',       label: 'View Only',    desc: 'Read-only access to calendar and posts' },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function formatRelativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getInviteStatus(invite) {
  if (invite.status === 'accepted') return 'accepted'
  if (invite.status === 'revoked')  return 'revoked'
  if (new Date(invite.expires_at) < new Date()) return 'expired'
  return 'pending'
}

// ── Shared sub-components ──────────────────────────────────────────────────

function Avatar({ name, size = 'md' }) {
  const palettes = [
    ['from-indigo-500', 'to-violet-600'],
    ['from-emerald-500', 'to-teal-600'],
    ['from-amber-400',  'to-orange-500'],
    ['from-pink-500',   'to-rose-600'],
    ['from-sky-500',    'to-blue-600'],
    ['from-purple-500', 'to-fuchsia-600'],
  ]
  const [from, to] = palettes[(name?.charCodeAt(0) || 0) % palettes.length]
  const initials = name?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?'
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm'
  return (
    <div className={`${sz} rounded-xl bg-gradient-to-br ${from} ${to} flex items-center justify-center font-bold text-white flex-shrink-0`}>
      {initials}
    </div>
  )
}

function InviteStatusBadge({ status }) {
  const cfg = {
    pending:  { label: 'Pending',  cls: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
    expired:  { label: 'Expired',  cls: 'text-amber-700 bg-amber-50 border-amber-200' },
    accepted: { label: 'Accepted', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    revoked:  { label: 'Revoked',  cls: 'text-slate-500 bg-slate-50 border-slate-200' },
  }
  const { label, cls } = cfg[status] || cfg.pending
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  )
}

// ── Team Members tab sub-components ───────────────────────────────────────

function UserFormModal({ user, onClose, onSave }) {
  const isEdit = !!user
  const [form, setForm] = useState({
    name:     user?.name     || '',
    email:    user?.email    || '',
    title:    user?.title    || '',
    role:     user?.role     || 'social_media',
    password: '',
  })
  const [error, setSaving_error] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) { setSaving_error('Name and email are required.'); return }
    if (!isEdit && !form.password.trim()) { setSaving_error('Password is required for new users.'); return }
    if (form.password && form.password.length < 8) { setSaving_error('Password must be at least 8 characters.'); return }
    setSaving(true)
    setSaving_error('')
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">{isEdit ? 'Edit User' : 'Add New User'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Full Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Title</label>
              <input value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="e.g. Social Media Manager"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email *</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              {isEdit ? 'New Password (leave blank to keep current)' : 'Password *'}
            </label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
              placeholder={isEdit ? '••••••••' : 'Min. 8 characters'}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Role *</label>
            <div className="space-y-2">
              {ROLE_OPTIONS.map(opt => (
                <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  form.role === opt.value ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input type="radio" name="role" value={opt.value} checked={form.role === opt.value}
                    onChange={() => set('role', opt.value)} className="mt-0.5 accent-indigo-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{opt.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <button onClick={onClose} className="px-5 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-white transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
            {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={14} />}
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add User'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirmModal({ user, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={22} className="text-red-600" />
          </div>
          <h2 className="text-base font-bold text-slate-900 text-center">Delete Team Member?</h2>
          <p className="text-sm text-slate-500 text-center mt-2">
            <span className="font-semibold text-slate-700">{user.name}</span> will be permanently removed.
            Their submitted posts will remain but their account will be gone.
          </p>
          <p className="text-xs text-red-600 text-center mt-2 font-medium">This cannot be undone.</p>
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function UserActions({ user, onEdit, onToggle, onDelete, canDelete, deleteTitle, alwaysVisible = false }) {
  return (
    <div className={`flex items-center gap-1 ${alwaysVisible ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
      <button onClick={() => onEdit(user)}
        className="p-2 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center" title="Edit">
        <Pencil size={15} />
      </button>
      <button onClick={() => onToggle(user)}
        className={`p-2 rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center ${
          user.active ? 'hover:bg-amber-50 text-slate-400 hover:text-amber-600' : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-600'
        }`} title={user.active ? 'Deactivate' : 'Reactivate'}>
        {user.active ? <UserX size={15} /> : <UserCheck size={15} />}
      </button>
      <button
        onClick={() => canDelete && onDelete(user)}
        disabled={!canDelete}
        title={deleteTitle}
        className={`p-2 rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center ${
          canDelete ? 'hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer' : 'text-slate-200 cursor-not-allowed'
        }`}>
        <Trash2 size={15} />
      </button>
    </div>
  )
}

function UserRow({ user, onEdit, onToggle, onDelete, isCurrentUser, isLastAdmin, postCount }) {
  const canDelete = !isCurrentUser && !isLastAdmin
  const deleteTitle = isCurrentUser ? "You can't delete your own account"
    : isLastAdmin ? "Can't delete the only admin"
    : 'Delete user permanently'

  return (
    <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors group">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} />
          <div>
            <p className="text-sm font-semibold text-slate-800">{user.name}</p>
            <p className="text-xs text-slate-400">{user.title || '—'}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
          <AtSign size={12} className="text-slate-400" />
          {user.email}
        </span>
      </td>
      <td className="px-5 py-4"><RoleBadge role={user.role} /></td>
      <td className="px-5 py-4">
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
          <FileText size={12} className="text-slate-400" />
          {postCount}
        </span>
      </td>
      <td className="px-5 py-4">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
          user.active ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-500 bg-slate-50 border-slate-200'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${user.active ? 'bg-emerald-400' : 'bg-slate-300'}`} />
          {user.active ? 'Active' : 'Deactivated'}
        </span>
      </td>
      <td className="px-5 py-4">
        <UserActions user={user} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} canDelete={canDelete} deleteTitle={deleteTitle} />
      </td>
    </tr>
  )
}

function UserCard({ user, onEdit, onToggle, onDelete, isCurrentUser, isLastAdmin, postCount }) {
  const canDelete = !isCurrentUser && !isLastAdmin
  const deleteTitle = isCurrentUser ? "You can't delete your own account"
    : isLastAdmin ? "Can't delete the only admin"
    : 'Delete user permanently'

  return (
    <div className="px-4 py-4 border-b border-slate-50 last:border-0">
      <div className="flex items-start gap-3 mb-3">
        <Avatar name={user.name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.title || '—'}</p>
            </div>
            <span className={`flex-shrink-0 inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
              user.active ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-500 bg-slate-50 border-slate-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${user.active ? 'bg-emerald-400' : 'bg-slate-300'}`} />
              {user.active ? 'Active' : 'Off'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 truncate flex items-center gap-1">
            <AtSign size={11} className="text-slate-400 flex-shrink-0" />
            {user.email}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <RoleBadge role={user.role} />
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <FileText size={11} className="text-slate-400" />
              {postCount} {postCount === 1 ? 'post' : 'posts'}
            </span>
          </div>
        </div>
      </div>
      <UserActions user={user} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} canDelete={canDelete} deleteTitle={deleteTitle} alwaysVisible />
    </div>
  )
}

// ── Pending Requests tab ───────────────────────────────────────────────────

function RejectConfirmModal({ user, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={22} className="text-red-600" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Reject this request?</h2>
          <p className="text-sm text-slate-500 mt-2">
            <span className="font-semibold text-slate-700">{user.name}</span>'s account will be removed.
          </p>
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors">
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

function PendingCard({ user, onApprove, onReject }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Avatar name={user.name} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">{user.name}</p>
              {user.title && <p className="text-xs text-slate-400 mt-0.5">{user.title}</p>}
            </div>
            <span className="flex-shrink-0 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
              Pending
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
            <AtSign size={11} className="text-slate-400 flex-shrink-0" />
            {user.email}
          </p>
          {user.created_at && (
            <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
              <Clock size={10} className="flex-shrink-0" />
              Requested {formatRelativeTime(user.created_at)}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-50">
        <button
          onClick={() => onApprove(user)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors"
        >
          <UserCheck size={13} />
          Approve
        </button>
        <button
          onClick={() => onReject(user)}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl text-xs font-semibold transition-colors"
        >
          <UserX size={13} />
          Reject
        </button>
      </div>
    </div>
  )
}

// ── Invitations tab ────────────────────────────────────────────────────────

function InviteModal({ onClose, onSend }) {
  const [form, setForm] = useState({ email: '', name: '', role: 'social_media' })
  const [error, setError]   = useState('')
  const [sending, setSending] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSend = async () => {
    if (!form.email.trim()) { setError('Email is required.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setError('Enter a valid email address.'); return }
    setSending(true)
    setError('')
    try {
      await onSend(form)
      onClose()
    } catch (err) {
      setError(err?.message || 'Failed to send invite.')
      setSending(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'INPUT' && e.target.type !== 'radio') return
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'radio') handleSend()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onKeyDown={handleKey}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Send size={16} className="text-indigo-600" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Send an Invite</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="colleague@asburyauto.com"
              autoFocus
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Name <span className="normal-case font-normal text-slate-400">(optional — pre-fills their signup form)</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Jane Doe"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Role *</label>
            <div className="space-y-2">
              {ROLE_OPTIONS.map(opt => (
                <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  form.role === opt.value ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input type="radio" name="invite-role" value={opt.value} checked={form.role === opt.value}
                    onChange={() => set('role', opt.value)} className="mt-0.5 accent-indigo-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{opt.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <button onClick={onClose} className="px-5 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
          >
            {sending
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Sending…</span></>
              : <><Send size={14} /><span>Send Invite</span></>}
          </button>
        </div>
      </div>
    </div>
  )
}

function InviteRow({ invite, onResend, onRevoke }) {
  const status = getInviteStatus(invite)
  const canResend = status === 'pending' || status === 'expired'
  const canRevoke = status === 'pending'

  return (
    <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50/40 transition-colors">
      <td className="px-5 py-4">
        <p className="text-sm font-medium text-slate-800">{invite.email}</p>
        {invite.name && <p className="text-xs text-slate-400 mt-0.5">{invite.name}</p>}
      </td>
      <td className="px-5 py-4"><RoleBadge role={invite.role} /></td>
      <td className="px-5 py-4">
        <p className="text-sm text-slate-600">{invite.invited_by_name || invite.invited_by || '—'}</p>
      </td>
      <td className="px-5 py-4">
        <p className="text-sm text-slate-500">{formatDate(invite.created_at)}</p>
      </td>
      <td className="px-5 py-4"><InviteStatusBadge status={status} /></td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-1">
          {canResend && (
            <button
              onClick={() => onResend(invite)}
              title={status === 'expired' ? 'Re-invite' : 'Resend invite'}
              className="p-2 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <RotateCcw size={14} />
            </button>
          )}
          {canRevoke && (
            <button
              onClick={() => onRevoke(invite)}
              title="Revoke invite"
              className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

function InviteCard({ invite, onResend, onRevoke }) {
  const status = getInviteStatus(invite)
  const canResend = status === 'pending' || status === 'expired'
  const canRevoke = status === 'pending'

  return (
    <div className="px-4 py-4 border-b border-slate-50 last:border-0">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{invite.email}</p>
          {invite.name && <p className="text-xs text-slate-400 mt-0.5">{invite.name}</p>}
          <div className="flex items-center gap-3 mt-2">
            <RoleBadge role={invite.role} />
            <InviteStatusBadge status={status} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            By {invite.invited_by_name || invite.invited_by || '—'} · {formatDate(invite.created_at)}
          </p>
        </div>
      </div>
      {(canResend || canRevoke) && (
        <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
          {canResend && (
            <button
              onClick={() => onResend(invite)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 rounded-lg text-xs font-medium transition-colors"
            >
              <RotateCcw size={12} />
              {status === 'expired' ? 'Re-invite' : 'Resend'}
            </button>
          )}
          {canRevoke && (
            <button
              onClick={() => onRevoke(invite)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-lg text-xs font-medium transition-colors"
            >
              <X size={12} />
              Revoke
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { users, addUser, updateUser, deactivateUser, reactivateUser, deleteUser, getPendingUsers } = useUsers()
  const { currentUser } = useAuth()
  const { posts } = usePosts()
  const { invites, createInvite, revokeInvite, resendInvite } = useInvites()
  const { addToast } = useToast()

  const [activeTab,    setActiveTab]    = useState('team')
  const [search,       setSearch]       = useState('')
  const [roleFilter,   setRoleFilter]   = useState('all')
  const [modal,        setModal]        = useState(null)         // { mode: 'add' } | { mode: 'edit', user }
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [inviteModal,  setInviteModal]  = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null)

  const pendingUsers = getPendingUsers()

  // Pending invites count (status=pending and not expired)
  const pendingInvitesCount = invites.filter(i =>
    i.status === 'pending' && new Date(i.expires_at) > new Date()
  ).length

  // Team members = everyone except unapproved self-registrations
  const teamMembers = users.filter(u => !(u.registration_type === 'self' && !u.active))

  const filteredTeam = teamMembers.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole   = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const counts = {
    total:  teamMembers.length,
    admin:  teamMembers.filter(u => u.role === 'admin').length,
    social: teamMembers.filter(u => u.role === 'social_media').length,
    viewer: teamMembers.filter(u => u.role === 'viewer').length,
  }

  const adminCount = teamMembers.filter(u => u.role === 'admin').length
  const postCountByEmail = posts.reduce((acc, p) => {
    if (p.approval_status !== 'deleted') acc[p.uploaded_by] = (acc[p.uploaded_by] || 0) + 1
    return acc
  }, {})

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleSave = async (form) => {
    if (modal.mode === 'add') await addUser({ ...form, registration_type: 'seeded' })
    else await updateUser(modal.user.id, form)
    setModal(null)
  }

  const handleToggle = (user) => {
    if (user.active) deactivateUser(user.id)
    else reactivateUser(user.id)
  }

  const handleDeleteConfirm = () => {
    if (deleteTarget) deleteUser(deleteTarget.id)
    setDeleteTarget(null)
  }

  const handleApprove = async (user) => {
    reactivateUser(user.id)
    try { await notifyUserApproved({ user }) } catch {}
    addToast(`${user.name} approved`, 'success')
  }

  const handleReject = (user) => setRejectTarget(user)

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return
    const user = rejectTarget
    setRejectTarget(null)
    try { await notifyUserRejected({ user }) } catch {}
    deleteUser(user.id)
    addToast(`${user.name}'s request declined`, 'success')
  }

  const handleSendInvite = async (form) => {
    const invite = createInvite({ ...form, currentUser })
    const result = await emailSendInvite({ invite, invitedBy: currentUser })
    if (result?.sent) {
      addToast(`Invite sent to ${invite.email}`, 'success')
    } else if (result?.configured === false) {
      addToast('Invite created — set up email in Settings to send it', 'warning')
    } else {
      addToast('Invite created — email failed to send', 'warning')
    }
  }

  const handleResend = async (invite) => {
    const updated = resendInvite(invite.id)
    if (!updated) return
    const result = await emailSendInvite({ invite: updated, invitedBy: currentUser })
    if (result?.sent) {
      addToast(`Invite resent to ${invite.email}`, 'success')
    } else if (result?.configured === false) {
      addToast('Token refreshed — set up email in Settings to send it', 'warning')
    } else {
      addToast('Token refreshed — email failed to send', 'warning')
    }
  }

  const handleRevoke = (invite) => {
    revokeInvite(invite.id)
    addToast('Invite revoked', 'success')
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Users & Security</h1>
          <p className="text-slate-400 mt-1 text-sm">Manage team members, access requests, and invitations</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            <Send size={14} />
            <span className="hidden sm:inline">Send Invite</span>
          </button>
          {activeTab === 'team' && (
            <button
              onClick={() => setModal({ mode: 'add' })}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}
            >
              <UserPlus size={15} />
              <span className="hidden sm:inline">Add User</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-end gap-1 mb-6 border-b border-slate-200">
        {[
          { id: 'team',        label: 'Team Members',    count: counts.total,        countColor: 'bg-slate-200 text-slate-600' },
          { id: 'pending',     label: 'Pending Requests',count: pendingUsers.length, countColor: 'bg-amber-100 text-amber-700',  hidden: pendingUsers.length === 0 },
          { id: 'invitations', label: 'Invitations',     count: pendingInvitesCount, countColor: 'bg-indigo-100 text-indigo-700', hidden: pendingInvitesCount === 0 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all whitespace-nowrap rounded-t-xl ${
              activeTab === tab.id
                ? 'text-indigo-700 bg-white border-t border-l border-r border-slate-200 -mb-px z-10'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {tab.count > 0 && !tab.hidden && (
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${tab.countColor}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Team Members tab ─────────────────────────────────────────── */}
      {activeTab === 'team' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {[
              { label: 'Total Users',  value: counts.total,  icon: Users,  from: 'from-slate-600',   to: 'to-slate-800' },
              { label: 'Admins',       value: counts.admin,  icon: Shield, from: 'from-violet-500',  to: 'to-purple-700' },
              { label: 'Social Media', value: counts.social, icon: AtSign, from: 'from-indigo-500',  to: 'to-indigo-700' },
              { label: 'View Only',    value: counts.viewer, icon: Eye,    from: 'from-slate-400',   to: 'to-slate-600' },
            ].map(({ label, value, icon: Icon, from, to }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${from} ${to} flex items-center justify-center mb-3`}>
                  <Icon size={18} className="text-white" />
                </div>
                <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
                <p className="text-sm font-medium text-slate-600 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100">
              <div className="relative flex-1 sm:max-w-xs">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex items-center gap-1.5 sm:ml-auto overflow-x-auto scrollbar-hide -mx-1 px-1">
                {[
                  { value: 'all',         label: 'All' },
                  { value: 'admin',       label: 'Admin' },
                  { value: 'social_media',label: 'Social' },
                  { value: 'viewer',      label: 'Viewer' },
                ].map(f => (
                  <button
                    key={f.value}
                    onClick={() => setRoleFilter(f.value)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${
                      roleFilter === f.value ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile */}
            <div className="lg:hidden">
              {filteredTeam.length === 0
                ? <div className="py-16 text-center text-sm text-slate-400">No users match your search.</div>
                : filteredTeam.map(user => (
                  <UserCard
                    key={user.id} user={user}
                    onEdit={u => setModal({ mode: 'edit', user: u })}
                    onToggle={handleToggle}
                    onDelete={setDeleteTarget}
                    isCurrentUser={user.id === currentUser?.id}
                    isLastAdmin={user.role === 'admin' && adminCount === 1}
                    postCount={postCountByEmail[user.email] || 0}
                  />
                ))
              }
            </div>

            {/* Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {['User', 'Email', 'Role', 'Posts', 'Status', ''].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTeam.length === 0
                    ? <tr><td colSpan={6} className="py-16 text-center text-sm text-slate-400">No users match your search.</td></tr>
                    : filteredTeam.map(user => (
                      <UserRow
                        key={user.id} user={user}
                        onEdit={u => setModal({ mode: 'edit', user: u })}
                        onToggle={handleToggle}
                        onDelete={setDeleteTarget}
                        isCurrentUser={user.id === currentUser?.id}
                        isLastAdmin={user.role === 'admin' && adminCount === 1}
                        postCount={postCountByEmail[user.email] || 0}
                      />
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Pending Requests tab ──────────────────────────────────────── */}
      {activeTab === 'pending' && (
        pendingUsers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-14 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <UserCheck size={22} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No pending requests</p>
            <p className="text-xs text-slate-400 mt-1">New access requests will appear here for your review</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingUsers.map(user => (
              <PendingCard key={user.id} user={user} onApprove={handleApprove} onReject={handleReject} />
            ))}
          </div>
        )
      )}

      {/* ── Invitations tab ───────────────────────────────────────────── */}
      {activeTab === 'invitations' && (
        invites.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-14 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Mail size={22} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No invitations yet</p>
            <p className="text-xs text-slate-400 mt-1">Click "Send Invite" to invite a team member by email</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Mobile */}
            <div className="lg:hidden divide-y divide-slate-50">
              {invites.map(invite => (
                <InviteCard key={invite.id} invite={invite} onResend={handleResend} onRevoke={handleRevoke} />
              ))}
            </div>
            {/* Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {['Email', 'Role', 'Invited by', 'Date', 'Status', ''].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invites.map(invite => (
                    <InviteRow key={invite.id} invite={invite} onResend={handleResend} onRevoke={handleRevoke} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ── Modals ────────────────────────────────────────────────────── */}
      {modal && (
        <UserFormModal
          user={modal.mode === 'edit' ? modal.user : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
      {rejectTarget && (
        <RejectConfirmModal
          user={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleRejectConfirm}
        />
      )}
      {inviteModal && (
        <InviteModal
          onClose={() => setInviteModal(false)}
          onSend={handleSendInvite}
        />
      )}
    </div>
  )
}
