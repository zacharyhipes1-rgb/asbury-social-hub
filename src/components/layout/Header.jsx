import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, LogOut, ChevronDown, Menu, X, Settings, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { usePosts } from '../../context/PostsContext'

const AVATAR_COLORS = [
  ['#6366f1', '#8b5cf6'],
  ['#0ea5e9', '#6366f1'],
  ['#10b981', '#0ea5e9'],
  ['#f59e0b', '#ef4444'],
  ['#ec4899', '#8b5cf6'],
]

function avatarGradient(name = '') {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  const [a, b] = AVATAR_COLORS[idx]
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`
}

export default function Header({ onMenuToggle, menuOpen }) {
  const { currentUser, logout, isAdmin } = useAuth()
  const { getPendingPosts } = usePosts()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const navigate = useNavigate()

  const pendingCount = getPendingPosts().length

  const handleLogout = () => {
    setDropdownOpen(false)
    logout()
    navigate('/login')
  }

  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-4 lg:px-5 flex-shrink-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <div className="flex items-center gap-2">
        {isAdmin && pendingCount > 0 && (
          <Link
            to="/admin"
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors"
          >
            <Bell size={13} />
            <span className="hidden sm:inline">{pendingCount} pending</span>
            <span className="sm:hidden">{pendingCount}</span>
          </Link>
        )}

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: avatarGradient(currentUser?.name) }}
            >
              <span className="text-white text-xs font-bold">{currentUser?.initials}</span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-slate-800 leading-none">{currentUser?.name}</p>
            </div>
            <ChevronDown size={13} className="text-slate-400" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl border border-slate-200 shadow-xl z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="font-semibold text-slate-900 text-sm leading-tight">{currentUser?.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-tight">{currentUser?.email}</p>
                  <p className="text-xs text-slate-500 mt-0.5 capitalize">{currentUser?.title}</p>
                </div>
                <div className="p-1">
                  {isAdmin && (
                    <>
                      <Link
                        to="/users"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <Users size={14} />
                        Team Members
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <Settings size={14} />
                        Settings
                      </Link>
                      <div className="my-1 border-t border-slate-100" />
                    </>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
