import { motion } from 'framer-motion'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Upload, CalendarDays, ShieldCheck, X,
  Users, Settings, BarChart2, Library, Wrench
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { usePosts } from '../../context/PostsContext'

function NavItem({ to, icon: Icon, label, badge, onClick }) {
  const location = useLocation()
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
        ${isActive ? 'text-indigo-300' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
    >
      {isActive && (
        <motion.span
          layoutId="nav-indicator"
          className="absolute inset-0 rounded-lg bg-indigo-500/15"
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          aria-hidden="true"
        />
      )}
      {isActive && (
        <motion.span
          layoutId="nav-bar"
          className="absolute left-0 top-2 bottom-2 w-0.5 bg-indigo-400 rounded-r"
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          aria-hidden="true"
        />
      )}
      <Icon size={17} className="flex-shrink-0 relative z-10" />
      <span className="flex-1 leading-none relative z-10">{label}</span>
      {badge > 0 && (
        <span className="relative z-10 bg-indigo-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none animate-pulse">
          {badge}
        </span>
      )}
    </NavLink>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="relative z-10 px-3 pt-5 pb-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest first:pt-2">
      {children}
    </p>
  )
}

export default function Sidebar({ onClose }) {
  const { isAdmin, isSocialMedia } = useAuth()
  const { getPendingPosts } = usePosts()
  const pendingCount = getPendingPosts().length

  return (
    <aside
      className="w-60 flex flex-col h-full"
      style={{
        background: 'linear-gradient(180deg, #0c1023 0%, #0f172a 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient orb */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          animation: 'orb-drift 18s ease-in-out infinite alternate',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Brand */}
      <div className="relative z-10 h-14 flex items-center justify-between px-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <img src="/apple-touch-icon.png" alt="Pulse Social" className="w-7 h-7 rounded-lg flex-shrink-0 object-cover" />
          <div className="leading-none">
            <p className="text-white text-sm font-semibold">Pulse Social</p>
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

      {/* Primary action — Upload Content. Social posting is the platform's core purpose,
          so this lives at the top as a high-contrast gradient CTA. */}
      {(isSocialMedia || isAdmin) && (
        <div className="relative z-10 px-3 pt-3 pb-1 flex-shrink-0">
          <NavLink
            to="/upload"
            onClick={onClose}
            className={({ isActive }) =>
              `group relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[13px] font-semibold text-white tracking-tight transition-all overflow-hidden hover:-translate-y-px ${
                isActive ? 'ring-2 ring-orange-200/50 ring-offset-2 ring-offset-[#0c1023]' : ''
              }`
            }
            style={{
              background: 'linear-gradient(135deg, #fb923c 0%, #f97316 55%, #ea580c 100%)',
              boxShadow: '0 6px 20px rgba(249,115,22,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
            }}
          >
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Upload size={14} strokeWidth={2.4} className="relative z-10 flex-shrink-0" />
            <span className="relative z-10 leading-none">Upload Content</span>
          </NavLink>
        </div>
      )}

      {/* Nav */}
      <nav className="relative z-10 flex-1 px-2 py-2 overflow-y-auto">
        <SectionLabel>Main</SectionLabel>
        <NavItem to="/" icon={LayoutDashboard} label="Dashboard" onClick={onClose} />
        <NavItem to="/calendar" icon={CalendarDays} label="Content Calendar" onClick={onClose} />
        <NavItem to="/analytics" icon={BarChart2} label="Analytics" onClick={onClose} />

        <SectionLabel>Content</SectionLabel>
        <NavItem to="/assets" icon={Library} label="Asset Library" onClick={onClose} />
        <NavItem to="/tools" icon={Wrench} label="Tools" onClick={onClose} />

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
            <NavItem to="/users" icon={Users} label="Users & Security" onClick={onClose} />
            <NavItem to="/settings" icon={Settings} label="Settings" onClick={onClose} />
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="relative z-10 px-3 pb-3 pt-2 border-t border-white/[0.06] flex-shrink-0">
        <p className="text-[10px] text-slate-600 leading-relaxed px-1">
          Internal tool · not connected to live platforms
        </p>
      </div>
    </aside>
  )
}
