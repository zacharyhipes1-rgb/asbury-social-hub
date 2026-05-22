import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Shield, AlertCircle, CheckCircle, ArrowLeft, Zap, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { useUsers } from '../context/UsersContext'
import { sendOtpCode } from '../services/emailService'

// ── OTP helpers ────────────────────────────────────────────────────────────
const OTP_TTL    = 10 * 60 * 1000   // 10 minutes
const MAX_TRIES  = 3
const RESEND_CD  = 60               // seconds

function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function otpKey(email) { return `asbury_otp_${email.toLowerCase()}` }

function saveOtp(email, code) {
  sessionStorage.setItem(otpKey(email), JSON.stringify({
    code,
    expiry:   Date.now() + OTP_TTL,
    attempts: 0,
  }))
}

function loadOtp(email) {
  try { return JSON.parse(sessionStorage.getItem(otpKey(email)) || 'null') } catch { return null }
}

function clearOtp(email) { sessionStorage.removeItem(otpKey(email)) }

function bumpAttempts(email) {
  const entry = loadOtp(email)
  if (!entry) return 0
  entry.attempts += 1
  sessionStorage.setItem(otpKey(email), JSON.stringify(entry))
  return entry.attempts
}

// ── Password strength ──────────────────────────────────────────────────────
function passwordStrength(pw) {
  if (!pw) return { label: '', color: '', width: '0%' }
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { label: 'Weak',   color: 'bg-red-400',    width: '25%' }
  if (score <= 2) return { label: 'Fair',   color: 'bg-amber-400',  width: '50%' }
  if (score <= 3) return { label: 'Good',   color: 'bg-blue-400',   width: '75%' }
  return               { label: 'Strong', color: 'bg-emerald-400', width: '100%' }
}

// ── Countdown timer display ────────────────────────────────────────────────
function useCountdown(expiry) {
  const [remaining, setRemaining] = useState(0)
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.floor((expiry - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [expiry])
  const m = Math.floor(remaining / 60)
  const s = String(remaining % 60).padStart(2, '0')
  return { remaining, display: `${m}:${s}` }
}

// ── Shared page shell ──────────────────────────────────────────────────────
function Shell({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #080d1a 0%, #0f172a 50%, #12103a 100%)' }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -right-20 w-80 h-80 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
      </div>
      <div className="relative w-full max-w-sm">{children}</div>
    </div>
  )
}

function StepDots({ step }) {
  return (
    <div className="flex items-center gap-1.5 justify-center mb-6">
      {[0,1,2].map(i => (
        <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-indigo-400' : i < step ? 'w-6 bg-indigo-600' : 'w-6 bg-white/15'}`} />
      ))}
    </div>
  )
}

function ErrorBanner({ msg }) {
  if (!msg) return null
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-red-400 text-sm"
      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
      <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
      <span>{msg}</span>
    </div>
  )
}

function DarkInput({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      {Icon && <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />}
      <input
        {...props}
        className={`w-full ${Icon ? 'pl-10' : 'pl-3.5'} pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
      />
    </div>
  )
}

// ── Step 1: Email ──────────────────────────────────────────────────────────
function StepEmail({ onNext }) {
  const { getUserByEmail } = useUsers()
  const [email, setEmail]   = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) { setError('Enter your work email.'); return }
    const user = getUserByEmail(trimmed)
    if (!user)        { setError('No account found with that email address.'); return }
    if (!user.active) { setError('That account is deactivated. Contact your administrator.'); return }

    setLoading(true)
    const code = makeCode()
    saveOtp(trimmed, code)
    try {
      await sendOtpCode({ recipient: { name: user.name, email: trimmed }, code })
    } catch {
      // Email failure is non-fatal — code is in sessionStorage for demo
    }
    setLoading(false)
    onNext(trimmed, user.name)
  }

  return (
    <>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 shadow-lg"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}>
          <Mail size={20} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Reset your password</h1>
        <p className="text-slate-400 mt-1 text-sm">Enter your work email to receive a verification code</p>
      </div>
      <div className="rounded-2xl border border-white/10 p-6 space-y-4" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}>
        <StepDots step={0} />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Work Email</label>
            <DarkInput icon={Mail} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@asburyauto.com" required autoComplete="email" autoFocus />
          </div>
          <ErrorBanner msg={error} />
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}>
            {loading ? 'Sending code…' : 'Send verification code →'}
          </button>
        </form>
      </div>
      <div className="mt-4 text-center">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft size={12} /> Back to sign in
        </Link>
      </div>
    </>
  )
}

// ── Step 2: OTP code ───────────────────────────────────────────────────────
function StepCode({ email, userName, onNext, onBack }) {
  const [digits, setDigits] = useState(['','','','','',''])
  const [error, setError]   = useState('')
  const [resendCd, setResendCd] = useState(RESEND_CD)
  const inputRefs = useRef([])

  const otp = loadOtp(email)
  const { remaining, display } = useCountdown(otp?.expiry || Date.now())

  // Resend cooldown tick
  useEffect(() => {
    if (resendCd <= 0) return
    const id = setInterval(() => setResendCd(p => Math.max(0, p - 1)), 1000)
    return () => clearInterval(id)
  }, [resendCd])

  // Focus first empty
  useEffect(() => { inputRefs.current[0]?.focus() }, [])

  const handleDigit = (idx, val) => {
    // Handle paste of full code
    if (val.length > 1) {
      const clean = val.replace(/\D/g, '').slice(0, 6)
      if (clean.length === 6) {
        const next = clean.split('')
        setDigits(next)
        inputRefs.current[5]?.focus()
        return
      }
    }
    const d = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[idx] = d
    setDigits(next)
    if (d && idx < 5) inputRefs.current[idx + 1]?.focus()
  }

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
    if (e.key === 'Enter') handleVerify()
  }

  const handleVerify = useCallback(() => {
    setError('')
    const code = digits.join('')
    if (code.length < 6) { setError('Enter all 6 digits.'); return }

    const entry = loadOtp(email)
    if (!entry)              { setError('Code expired. Request a new one.'); return }
    if (Date.now() > entry.expiry) { clearOtp(email); setError('Code expired. Request a new one.'); return }

    if (code !== entry.code) {
      const attempts = bumpAttempts(email)
      if (attempts >= MAX_TRIES) {
        clearOtp(email)
        setError('Too many incorrect attempts. Please request a new code.')
        setDigits(['','','','','',''])
        inputRefs.current[0]?.focus()
      } else {
        setError(`Incorrect code. ${MAX_TRIES - attempts} attempt${MAX_TRIES - attempts === 1 ? '' : 's'} remaining.`)
        setDigits(['','','','','',''])
        inputRefs.current[0]?.focus()
      }
      return
    }

    clearOtp(email)
    onNext()
  }, [digits, email, onNext])

  const handleResend = async () => {
    if (resendCd > 0) return
    const code = makeCode()
    saveOtp(email, code)
    setDigits(['','','','','',''])
    setError('')
    setResendCd(RESEND_CD)
    inputRefs.current[0]?.focus()
    try { await sendOtpCode({ recipient: { email }, code }) } catch {}
  }

  return (
    <>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 shadow-lg"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}>
          <Shield size={20} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Check your email</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Code sent to <span className="text-indigo-300 font-semibold">{email}</span>
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 p-6 space-y-5" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}>
        <StepDots step={1} />
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">Verification Code</label>
          <div className="flex justify-center gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={d}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className={`w-11 h-13 text-center text-xl font-bold rounded-xl transition-all focus:outline-none
                  ${d ? 'text-white' : 'text-transparent'}
                `}
                style={{
                  height: '52px',
                  background: d ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.07)',
                  border: d ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.12)',
                  boxShadow: d ? '0 0 0 2px rgba(99,102,241,0.1)' : 'none',
                }}
              />
            ))}
          </div>
          <div className="flex items-center justify-center gap-3 mt-3 text-xs">
            {remaining > 0
              ? <span className="text-slate-500">Expires in <span className="text-amber-400 font-semibold tabular-nums">{display}</span></span>
              : <span className="text-red-400 font-semibold">Code expired</span>
            }
            <span className="text-slate-600">·</span>
            <button
              onClick={handleResend}
              disabled={resendCd > 0}
              className="text-indigo-400 hover:text-indigo-300 disabled:text-slate-600 disabled:cursor-not-allowed font-semibold transition-colors flex items-center gap-1"
            >
              <RefreshCw size={11} />
              {resendCd > 0 ? `Resend in ${resendCd}s` : 'Resend code'}
            </button>
          </div>
        </div>
        <ErrorBanner msg={error} />
        <button
          onClick={handleVerify}
          disabled={digits.join('').length < 6 || remaining === 0}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}
        >
          Verify code →
        </button>
      </div>
      <div className="mt-4 text-center">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft size={12} /> Change email
        </button>
      </div>
    </>
  )
}

// ── Step 3: New password ───────────────────────────────────────────────────
function StepPassword({ email, onDone }) {
  const { setPasswordByEmail } = useUsers()
  const [pw, setPw]           = useState('')
  const [confirmPw, setConfirm] = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const strength = passwordStrength(pw)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (pw.length < 8)    { setError('Password must be at least 8 characters.'); return }
    if (pw !== confirmPw) { setError('Passwords do not match.'); return }
    setLoading(true)
    const ok = await setPasswordByEmail(email, pw)
    setLoading(false)
    if (!ok) { setError('Unable to update password. Please try again.'); return }
    onDone()
  }

  return (
    <>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 shadow-lg"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}>
          <Lock size={20} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Choose new password</h1>
        <p className="text-slate-400 mt-1 text-sm">Code verified ✓ — set your new password</p>
      </div>
      <div className="rounded-2xl border border-white/10 p-6" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}>
        <StepDots step={2} />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">New Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={e => setPw(e.target.value)}
                placeholder="Min. 8 characters"
                required autoFocus autoComplete="new-password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
              />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {pw && (
              <div className="mt-2 space-y-1">
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: strength.width }} />
                </div>
                <p className={`text-[10px] font-semibold ${
                  strength.label === 'Strong' ? 'text-emerald-400'
                  : strength.label === 'Good' ? 'text-blue-400'
                  : strength.label === 'Fair' ? 'text-amber-400'
                  : 'text-red-400'}`}>{strength.label}</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Confirm Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPw ? 'text' : 'password'}
                value={confirmPw}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                required autoComplete="new-password"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
              />
            </div>
          </div>
          <ErrorBanner msg={error} />
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}>
            {loading ? 'Updating…' : 'Update password ✓'}
          </button>
        </form>
      </div>
    </>
  )
}

// ── Success ────────────────────────────────────────────────────────────────
function StepSuccess() {
  const navigate = useNavigate()
  useEffect(() => { const id = setTimeout(() => navigate('/login', { replace: true }), 2000); return () => clearTimeout(id) }, [navigate])
  return (
    <div className="rounded-2xl border border-white/10 p-8 text-center" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}>
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/20 mb-4">
        <CheckCircle size={26} className="text-emerald-400" />
      </div>
      <p className="text-white text-base font-bold">Password updated!</p>
      <p className="text-slate-400 text-sm mt-1">Redirecting to sign in…</p>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
  const [step,  setStep]  = useState('email')   // 'email' | 'code' | 'password' | 'success'
  const [email, setEmail] = useState('')
  const [name,  setName]  = useState('')

  return (
    <Shell>
      {step === 'email' && (
        <StepEmail onNext={(e, n) => { setEmail(e); setName(n); setStep('code') }} />
      )}
      {step === 'code' && (
        <StepCode
          email={email}
          userName={name}
          onNext={() => setStep('password')}
          onBack={() => setStep('email')}
        />
      )}
      {step === 'password' && (
        <StepPassword email={email} onDone={() => setStep('success')} />
      )}
      {step === 'success' && <StepSuccess />}
    </Shell>
  )
}
