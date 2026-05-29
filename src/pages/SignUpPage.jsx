import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, Lock, User, Briefcase, AlertCircle, CheckCircle, ArrowLeft, Zap, Eye, EyeOff } from 'lucide-react'
import ReCAPTCHA from 'react-google-recaptcha'
import { useUsers } from '../context/UsersContext'
import { useInvites } from '../context/InvitesContext'
import { notifyNewUserRequest } from '../services/emailService'
import { Events } from '../lib/analytics'

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY

export default function SignUpPage() {
  const { getUserByEmail, addUser, getAdmins } = useUsers()
  const { getValidInvite, acceptInvite } = useInvites()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Invite-mode state
  const [invite, setInvite] = useState(null)        // valid invite object, or null
  const [inviteError, setInviteError] = useState('') // set when token is present but invalid

  const [form, setForm] = useState({ name: '', email: '', title: '', password: '', confirmPw: '' })
  const [showPw, setShowPw]         = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState(false)
  const [loading, setLoading]       = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef(null)

  // Check invite token on mount
  useEffect(() => {
    const token = searchParams.get('invite')
    if (!token) return

    const valid = getValidInvite(token)
    if (valid) {
      setInvite(valid)
      setForm(f => ({
        ...f,
        email: valid.email,
        name:  valid.name || f.name,
      }))
    } else {
      setInviteError('This invite link is invalid or has expired. Please request a new one.')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const name  = form.name.trim()
    const email = form.email.trim().toLowerCase()

    if (!name)  { setError('Enter your full name.'); return }
    if (!email) { setError('Enter your email address.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address.'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (form.password !== form.confirmPw) { setError('Passwords do not match.'); return }
    if (getUserByEmail(email)) { setError('An account with this email already exists. Try signing in instead.'); return }
    if (RECAPTCHA_SITE_KEY && !captchaToken) { setError('Please complete the reCAPTCHA check.'); return }

    setLoading(true)
    if (RECAPTCHA_SITE_KEY && captchaToken) {
      try {
        const r = await fetch('/api/verify-recaptcha', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: captchaToken }),
        })
        const d = await r.json()
        if (!d.success) {
          setLoading(false); setError('reCAPTCHA failed. Please try again.')
          captchaRef.current?.reset(); setCaptchaToken(''); return
        }
      } catch { /* network error — proceed */ }
    }
    try {
      if (invite) {
        // Invited path — immediately active
        await addUser({
          name,
          email,
          title: form.title.trim(),
          role: invite.role || 'social_media',
          password: form.password,
          active: true,
          registration_type: 'invited',
        })
        acceptInvite(invite.token)
        setSuccess(true)
        setTimeout(() => navigate('/login', { replace: true }), 2200)
      } else {
        // Self-registration path — pending admin approval
        const user = await addUser({
          name,
          email,
          title: form.title.trim(),
          role: 'social_media',
          password: form.password,
          active: false,
          registration_type: 'self',
        })
        // Notify all admins
        try {
          await notifyNewUserRequest({ user, admins: getAdmins() })
        } catch {
          // Email failure doesn't block registration
        }
        setSuccess(true)
        setTimeout(() => navigate('/login', { replace: true }), 2800)
      }
    } catch {
      setError('Unable to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #080d1a 0%, #0f172a 50%, #12103a 100%)' }}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -right-20 w-80 h-80 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}>
            <Zap size={20} className="text-white" />
          </div>
          {invite ? (
            <>
              <h1 className="text-2xl font-bold text-white tracking-tight">Create your account</h1>
              <p className="text-slate-400 mt-1 text-sm">You've been invited to Asbury Social Hub</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white tracking-tight">Request access</h1>
              <p className="text-slate-400 mt-1 text-sm">An administrator will review your account</p>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 p-6" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}>

          {/* Invalid invite banner */}
          {inviteError && (
            <div className="mb-4 flex items-start gap-2 px-3 py-3 rounded-xl text-red-400 text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{inviteError}</span>
            </div>
          )}

          {success ? (
            <div className="text-center py-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/20 mb-3">
                <CheckCircle size={22} className="text-emerald-400" />
              </div>
              {invite ? (
                <>
                  <p className="text-white text-sm font-semibold">Account created!</p>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                    You can now sign in with your email and password.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-white text-sm font-semibold">Request submitted</p>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                    Your account is pending administrator approval. You'll be notified when it's activated.
                  </p>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Invite role hint */}
              {invite && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                  style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
                  <span className="text-indigo-300">Role:</span>
                  <span className="text-indigo-200 font-semibold">
                    {invite.role === 'admin' ? 'Administrator' : invite.role === 'viewer' ? 'View Only' : 'Social Media'}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Full name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Jane Doe"
                    required
                    autoComplete="name"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600
                      focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Work email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => !invite && set('email', e.target.value)}
                    readOnly={!!invite}
                    placeholder="you@asburyauto.com"
                    required
                    autoComplete="email"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600
                      focus:outline-none focus:ring-1 focus:ring-indigo-500 ${invite ? 'opacity-70 cursor-default' : ''}`}
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Title <span className="normal-case font-normal text-slate-600">(optional)</span>
                </label>
                <div className="relative">
                  <Briefcase size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                    placeholder="e.g. Social Media Coordinator"
                    autoComplete="organization-title"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600
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
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    autoComplete="new-password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600
                      focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Confirm password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.confirmPw}
                    onChange={(e) => set('confirmPw', e.target.value)}
                    placeholder="Re-enter password"
                    required
                    autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600
                      focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-red-400 text-sm"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {RECAPTCHA_SITE_KEY && (
                <div className="flex justify-center">
                  <ReCAPTCHA
                    ref={captchaRef}
                    sitekey={RECAPTCHA_SITE_KEY}
                    onChange={setCaptchaToken}
                    onExpired={() => setCaptchaToken('')}
                    theme="dark"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (!!inviteError && !invite) || (!!RECAPTCHA_SITE_KEY && !captchaToken)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white
                  disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}
              >
                {loading
                  ? 'Submitting…'
                  : invite
                    ? 'Create account'
                    : 'Request access'}
              </button>
            </form>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft size={12} /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
