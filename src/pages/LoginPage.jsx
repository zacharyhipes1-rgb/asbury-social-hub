import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import ReCAPTCHA from 'react-google-recaptcha'
import { useAuth } from '../context/AuthContext'
import { useUsers } from '../context/UsersContext'
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react'
import { DEMO_USER_ID, DEMO_USER_PASSWORD } from '../data/mockData'
import { Events } from '../lib/analytics'

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY

const inputBaseStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  borderRadius: '10px',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
}

export default function LoginPage() {
  const { login, currentUser, loginError, authLoaded } = useAuth()
  const { getUserById } = useUsers()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]      = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [emailFocus, setEmailFocus] = useState(false)
  const [passFocus, setPassFocus]   = useState(false)
  const captchaRef = useRef(null)

  const demoUser = getUserById(DEMO_USER_ID)

  useEffect(() => {
    if (currentUser) navigate('/', { replace: true })
  }, [currentUser, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    // If reCAPTCHA is configured, verify token before proceeding
    if (RECAPTCHA_SITE_KEY && !captchaToken) return
    setLoading(true)
    if (RECAPTCHA_SITE_KEY && captchaToken) {
      try {
        const r = await fetch('/api/verify-recaptcha', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: captchaToken }),
        })
        const d = await r.json()
        if (!d.success) { setLoading(false); captchaRef.current?.reset(); setCaptchaToken(''); return }
      } catch { /* network error — proceed anyway */ }
    }
    const ok = await login(email.trim(), password)
    setLoading(false)
    if (ok) { Events.LOGIN(); navigate('/', { replace: true }) }
    else { captchaRef.current?.reset(); setCaptchaToken('') }
  }

  const fillDemo = async () => {
    if (!demoUser) return
    setEmail(demoUser.email)
    setPassword(DEMO_USER_PASSWORD)
    setLoading(true)
    const ok = await login(demoUser.email, DEMO_USER_PASSWORD)
    setLoading(false)
    if (ok) navigate('/', { replace: true })
  }

  const focusedInputStyle = (focused) => ({
    ...inputBaseStyle,
    borderColor: focused ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)',
    boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
  })

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0c1023 0%, #0f172a 100%)' }}
    >
      {/* Ambient orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none"
        style={{
          position: 'absolute',
          top: '-100px',
          left: '-100px',
          width: 'clamp(240px, 60vw, 400px)',
          height: 'clamp(240px, 60vw, 400px)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 65%)',
          animation: 'orb-drift 20s ease-in-out infinite alternate',
          zIndex: 0,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none"
        style={{
          position: 'absolute',
          bottom: '-80px',
          right: '-60px',
          width: 'clamp(200px, 50vw, 300px)',
          height: 'clamp(200px, 50vw, 300px)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 65%)',
          animation: 'orb-drift 16s ease-in-out infinite alternate-reverse',
          zIndex: 0,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none hidden sm:block"
        style={{
          position: 'absolute',
          top: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 60%)',
          animation: 'orb-drift 24s ease-in-out infinite alternate',
          zIndex: 0,
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative w-full"
        style={{ maxWidth: '400px', zIndex: 1 }}
      >
        {/* Form card */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(16px) saturate(1.2)',
            WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
            borderRadius: '20px',
            padding: 'clamp(24px, 6vw, 40px)',
          }}
        >
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
            className="flex items-center gap-3 mb-8"
          >
            <img src="/apple-touch-icon.png" alt="Asbury" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
            <div className="leading-tight">
              <p className="text-white font-bold text-xl">Asbury Social</p>
              <p className="text-indigo-400 text-xs tracking-widest font-semibold mt-0.5">CONTENT HUB</p>
            </div>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocus(true)}
                  onBlur={() => setEmailFocus(false)}
                  placeholder="you@asburyauto.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 text-sm placeholder:text-white/30 focus:outline-none"
                  style={focusedInputStyle(emailFocus)}
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPassFocus(true)}
                  onBlur={() => setPassFocus(false)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 text-sm placeholder:text-white/30 focus:outline-none"
                  style={focusedInputStyle(passFocus)}
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
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <AlertCircle size={14} className="flex-shrink-0" />
                {loginError}
              </div>
            )}

            {RECAPTCHA_SITE_KEY && (
              <div className="flex justify-center pt-1">
                <ReCAPTCHA
                  ref={captchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  onChange={setCaptchaToken}
                  onExpired={() => setCaptchaToken('')}
                  theme="dark"
                  size="normal"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !authLoaded || (!!RECAPTCHA_SITE_KEY && !captchaToken)}
              className="group btn-press relative overflow-hidden w-full py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (e.currentTarget.disabled) return
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.5)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.35)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              />
              <span className="relative z-10">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : 'Sign In'}
              </span>
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <Link to="/forgot-password" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                Forgot password?
              </Link>
              <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                Request access
              </Link>
            </div>
          </form>
        </div>

        {/* Single demo account — delete the "Demo Admin" user from Team Members to remove this shortcut */}
        {demoUser && (
          <div
            className="mt-4 p-4"
            style={{
              background: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
            }}
          >
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Demo account — click to sign in</p>
            <button
              type="button"
              onClick={fillDemo}
              disabled={loading}
              className="btn-press w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all text-left disabled:opacity-50 min-h-[44px]"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-200 truncate">{demoUser.name}</p>
                <p className="text-xs text-slate-500 truncate">Full admin access · delete to disable</p>
              </div>
              <code className="text-xs text-slate-500 font-mono flex-shrink-0">{DEMO_USER_PASSWORD}</code>
            </button>
          </div>
        )}

        <p className="text-center text-xs text-slate-700 mt-6">
          Asbury Automotive Group · Internal Use Only
        </p>
      </motion.div>
    </div>
  )
}
