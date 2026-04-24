import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Upload, CalendarDays, ShieldCheck, X,
  Users, Settings, BarChart2
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { usePosts } from '../../context/PostsContext'

function NavItem({ to, icon: Icon, label, badge, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative
        ${isActive
          ? 'bg-indigo-500/15 text-indigo-300 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-400 before:rounded-r'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        }`
      }
    >
      <Icon size={17} className="flex-shrink-0" />
      <span className="flex-1 leading-none">{label}</span>
      {badge > 0 && (
        <span className="bg-indigo-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
          {badge}
        </span>
      )}
    </NavLink>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="px-3 pt-5 pb-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest first:pt-2">
      {children}
    </p>
  )
}

export default function Sidebar({ onClose }) {
  const { isAdmin, isSocialMedia } = useAuth()
  const { getPendingPosts } = usePosts()
  const pendingCount = getPendingPosts().length

  return (
    <aside className="w-60 flex flex-col h-full" style={{ background: 'linear-gradient(180deg, #0c1023 0%, #0f172a 100%)' }}>
      {/* Brand */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <img src="/apple-touch-icon.png" alt="Asbury" className="w-7 h-7 rounded-lg flex-shrink-0 object-cover" />
          <div className="leading-none">
            <p className="text-white text-sm font-semibold">Asbury Social</p>
            <p className="text-slate-500 text-[10px] mt-0.5 font-medium tracking-wide">CONTENT HUB</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        <SectionLabel>Main</SectionLabel>
        <NavItem to="/" icon={LayoutDashboard} label="Dashboard" onClick={onClose} />
        <NavItem to="/calendar" icon={CalendarDays} label="Content Calendar" onClick={onClose} />
        <NavItem to="/analytics" icon={BarChart2} label="Analytics" onClick={onClose} />

        {isSocialMedia && (
          <>
            <SectionLabel>Content</SectionLabel>
            <NavItem to="/upload" icon={Upload} label="Upload Content" onClick={onClose} />
          </>
        )}

        {isAdmin && (
          <>
            <SectionLabel>Admin</SectionLabel>
            <NavItem
              to="/admin"
              icon={ShieldCheck}
              label="Approval Queue"
              badge={pendingCount}
              onClick={onClose}
            />
            <NavItem to="/users" icon={Users} label="Team Members" onClick={onClose} />
            <NavItem to="/settings" icon={Settings} label="Settings" onClick={onClose} />
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-3 pt-2 border-t border-white/[0.06] flex-shrink-0">
        <p className="text-[10px] text-slate-600 leading-relaxed px-1">
          Internal tool · not connected to live platforms
        </p>
      </div>
    </aside>
  )
}
