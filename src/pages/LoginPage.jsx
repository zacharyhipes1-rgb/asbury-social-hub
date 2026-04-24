import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUsers } from '../context/UsersContext'
import { Eye, EyeOff, Mail, Lock, AlertCircle, Zap } from 'lucide-react'

// Anchors: emails + passwords stay fixed; names/titles come from live user data
const DEMO_ANCHORS = [
  { email: 'zhipes@asburyauto.com',    password: 'Demo2026!', fallbackRole: 'Admin'        },
  { email: 'cdavis@asburyauto.com',    password: 'Demo2026!', fallbackRole: 'Admin'        },
  { email: 'rniblett@asburyauto.com',  password: 'Demo2026!', fallbackRole: 'Social Media' },
]

export default function LoginPage() {
  const { login, currentUser, loginError, authLoaded } = useAuth()
  const { getUserByEmail } = useUsers()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)

  const demoAccounts = DEMO_ANCHORS.map(anchor => {
    const user = getUserByEmail(anchor.email)
    return user ? { ...anchor, name: user.name, role: user.title || anchor.fallbackRole } : null
  }).filter(Boolean)

  useEffect(() => {
    if (currentUser) navigate('/', { replace: true })
  }, [currentUser, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const ok = await login(email.trim(), password)
    setLoading(false)
    if (ok) navigate('/', { replace: true })
  }

  const fillDemo = (acc) => {
    setEmail(acc.email)
    setPassword(acc.password)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #080d1a 0%, #0f172a 50%, #12103a 100%)' }}
    >
      {/* Background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -right-20 w-80 h-80 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}>
            <Zap size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Asbury Social Hub</h1>
          <p className="text-slate-400 mt-1 text-sm">Internal content staging platform</p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-white/10 p-6" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@asburyauto.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600 transition-all
                    focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600 transition-all
                    focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-400 text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle size={14} className="flex-shrink-0" />
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !authLoaded}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all
                disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        <div className="mt-4 rounded-2xl border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Demo accounts — click to fill</p>
          <div className="space-y-1.5">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => fillDemo(acc)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-left
                  border border-white/8 hover:border-white/15"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <div>
                  <p className="text-sm font-medium text-slate-200">{acc.name}</p>
                  <p className="text-xs text-slate-500">{acc.role}</p>
                </div>
                <code className="text-xs text-slate-500 font-mono">{acc.password}</code>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-slate-700 mt-6">
          Asbury Automotive Group · Internal Use Only
        </p>
      </div>
    </div>
  )
}
