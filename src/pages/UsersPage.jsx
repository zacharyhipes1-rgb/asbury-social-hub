import { useState } from 'react'
import { Users, UserPlus, Shield, Eye, AtSign, MoreVertical, Search, X, Check, Pencil, UserX, UserCheck, Trash2, AlertTriangle, FileText } from 'lucide-react'
import { useUsers } from '../context/UsersContext'
import { useAuth } from '../context/AuthContext'
import { usePosts } from '../context/PostsContext'
import { RoleBadge } from '../components/common/Badge'

const ROLE_OPTIONS = [
  { value: 'admin',        label: 'Admin',        desc: 'Full access — approve, manage users, settings' },
  { value: 'social_media', label: 'Social Media',  desc: 'Upload content and view own submissions' },
  { value: 'viewer',       label: 'View Only',     desc: 'Read-only access to calendar and posts' },
]

function Avatar({ name, size = 'md' }) {
  const colors = [
    ['from-indigo-500','to-violet-600'],
    ['from-emerald-500','to-teal-600'],
    ['from-amber-400','to-orange-500'],
    ['from-pink-500','to-rose-600'],
    ['from-sky-500','to-blue-600'],
    ['from-purple-500','to-fuchsia-600'],
  ]
  const idx = (name?.charCodeAt(0) || 0) % colors.length
  const [from, to] = colors[idx]
  const initials = name?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?'
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm'
  return (
    <div className={`${sz} rounded-xl bg-gradient-to-br ${from} ${to} flex items-center justify-center font-bold text-white flex-shrink-0`}>
      {initials}
    </div>
  )
}

function UserFormModal({ user, onClose, onSave }) {
  const isEdit = !!user
  const [form, setForm] = useState({
    name:     user?.name     || '',
    email:    user?.email    || '',
    title:    user?.title    || '',
    role:     user?.role     || 'social_media',
    password: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) { setError('Name and email are required.'); return }
    if (!isEdit && !form.password.trim()) { setError('Password is required for new users.'); return }
    if (form.password && form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setSaving(true)
    setError('')
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
          <div className="grid grid-cols-2 gap-4">
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
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function UserRow({ user, onEdit, onToggle, onDelete, isCurrentUser, isLastAdmin, postCount }) {
  const canDelete = !isCurrentUser && !isLastAdmin
  const deleteTitle = isCurrentUser ? "You can't delete your own account"
    : isLastAdmin ? "Can't delete the only admin account"
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
      <td className="px-5 py-4">
        <RoleBadge role={user.role} />
      </td>
      <td className="px-5 py-4">
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
          <FileText size={12} className="text-slate-400" />
          {postCount}
        </span>
      </td>
      <td className="px-5 py-4">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
          user.active
            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
            : 'text-slate-500 bg-slate-50 border-slate-200'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${user.active ? 'bg-emerald-400' : 'bg-slate-300'}`} />
          {user.active ? 'Active' : 'Deactivated'}
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(user)}
            className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors" title="Edit">
            <Pencil size={14} />
          </button>
          <button onClick={() => onToggle(user)}
            className={`p-1.5 rounded-lg transition-colors ${
              user.active
                ? 'hover:bg-amber-50 text-slate-400 hover:text-amber-600'
                : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-600'
            }`} title={user.active ? 'Deactivate' : 'Reactivate'}>
            {user.active ? <UserX size={14} /> : <UserCheck size={14} />}
          </button>
          <button
            onClick={() => canDelete && onDelete(user)}
            disabled={!canDelete}
            title={deleteTitle}
            className={`p-1.5 rounded-lg transition-colors ${
              canDelete
                ? 'hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer'
                : 'text-slate-200 cursor-not-allowed'
            }`}>
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function UsersPage() {
  const { users, addUser, updateUser, deactivateUser, reactivateUser, deleteUser } = useUsers()
  const { currentUser } = useAuth()
  const { posts } = usePosts()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [modal, setModal] = useState(null)        // null | { mode: 'add' } | { mode: 'edit', user }
  const [deleteTarget, setDeleteTarget] = useState(null)

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole   = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const counts = {
    total:  users.length,
    admin:  users.filter(u => u.role === 'admin').length,
    social: users.filter(u => u.role === 'social_media').length,
    viewer: users.filter(u => u.role === 'viewer').length,
  }

  const handleSave = async (form) => {
    if (modal.mode === 'add') {
      await addUser(form)
    } else {
      await updateUser(modal.user.id, form)
    }
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

  const adminCount = users.filter(u => u.role === 'admin').length
  const postCountByEmail = posts.reduce((acc, p) => {
    if (p.approval_status !== 'deleted') acc[p.uploaded_by] = (acc[p.uploaded_by] || 0) + 1
    return acc
  }, {})

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team Members</h1>
          <p className="text-slate-400 mt-1 text-sm">Manage user accounts, roles, and access levels</p>
        </div>
        <button
          onClick={() => setModal({ mode: 'add' })}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}
        >
          <UserPlus size={15} />
          Add User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {[
          { label: 'Total Users',   value: counts.total,  icon: Users,  from: 'from-slate-600', to: 'to-slate-800' },
          { label: 'Admins',        value: counts.admin,  icon: Shield, from: 'from-violet-500', to: 'to-purple-700' },
          { label: 'Social Media',  value: counts.social, icon: AtSign, from: 'from-indigo-500', to: 'to-indigo-700' },
          { label: 'View Only',     value: counts.viewer, icon: Eye,    from: 'from-slate-400', to: 'to-slate-600' },
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            {[
              { value: 'all',        label: 'All' },
              { value: 'admin',      label: 'Admin' },
              { value: 'social_media', label: 'Social' },
              { value: 'viewer',     label: 'Viewer' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setRoleFilter(f.value)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  roleFilter === f.value
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {['User', 'Email', 'Role', 'Posts', 'Status', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm text-slate-400">
                    No users match your search.
                  </td>
                </tr>
              ) : filtered.map(user => (
                <UserRow
                  key={user.id}
                  user={user}
                  onEdit={u => setModal({ mode: 'edit', user: u })}
                  onToggle={handleToggle}
                  onDelete={setDeleteTarget}
                  isCurrentUser={user.id === currentUser?.id}
                  isLastAdmin={user.role === 'admin' && adminCount === 1}
                  postCount={postCountByEmail[user.email] || 0}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  )
}
