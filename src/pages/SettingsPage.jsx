import { useState, useMemo, useEffect } from 'react'
import {
  Settings, Mail, Key, Send, CheckCircle, AlertCircle, ChevronDown, ChevronUp,
  Trash2, Clock, ExternalLink, Cloud, Image, Zap, RotateCcw, Building2, Link2,
  Eye, EyeOff
} from 'lucide-react'

// Field keys whose values are secrets and should be masked by default in inputs
const SENSITIVE_FIELD_KEYS = /token|secret|password|apikey|api_key|refresh/i
import { useAuth } from '../context/AuthContext'
import { getNotificationLog, clearNotificationLog } from '../services/emailService'
import { DEALERSHIPS } from '../data/dealerships'
import { supabase } from '../lib/supabase'
import { MOCK_POSTS } from '../data/mockData'

// ─── Supabase helpers for dealership integrations ─────────────────────────────
// Transforms flat Supabase rows → nested { [dealershipId]: { [platformId]: fields } }
function rowsToIntegrations(rows) {
  const result = {}
  rows.forEach(row => {
    if (!result[row.dealership_id]) result[row.dealership_id] = {}
    result[row.dealership_id][row.platform_id] = row.fields || {}
  })
  return result
}

async function fetchDealerIntegrations() {
  const { data, error } = await supabase.from('dealership_integrations').select('*')
  if (error) { console.error('[Settings] fetch integrations:', error); return {} }
  return rowsToIntegrations(data || [])
}

async function upsertDealerIntegration(dealershipId, platformId, fields) {
  const { error } = await supabase
    .from('dealership_integrations')
    .upsert({ dealership_id: dealershipId, platform_id: platformId, fields, updated_at: new Date().toISOString() })
  if (error) console.error('[Settings] upsert integration:', error)
}

// ─── Platform definitions ─────────────────────────────────────────────────────
const PLATFORMS = [
  {
    id: 'facebook',
    name: 'Facebook',
    color: '#1877F2',
    twBg: 'bg-blue-50',
    twText: 'text-blue-700',
    twBorder: 'border-blue-100',
    twActive: 'bg-blue-600 text-white',
    fields: [
      { key: 'pageId',      label: 'Page ID',           placeholder: '123456789012345',  hint: 'Page → About → numeric Page ID' },
      { key: 'accessToken', label: 'Page Access Token', placeholder: 'EAAxxxx...',        hint: 'Long-lived token from Meta Graph API Explorer — expires after 60 days' },
    ],
    guide: [
      ['Create a Meta Developer App', 'developers.facebook.com → My Apps → Create App → Business type'],
      ['Add Pages API product', 'Add Facebook Login and Pages API products to your app'],
      ['Generate a long-lived Page Token', 'Graph API Explorer → generate User Token → exchange for long-lived Page Access Token'],
      ['Find your Page ID', 'Open Facebook Page → About → scroll to the bottom for numeric Page ID'],
    ],
    docsUrl: 'https://developers.facebook.com/docs/pages/publishing',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    color: '#E1306C',
    twBg: 'bg-pink-50',
    twText: 'text-pink-700',
    twBorder: 'border-pink-100',
    twActive: 'bg-pink-600 text-white',
    fields: [
      { key: 'businessAccountId', label: 'Instagram Business Account ID', placeholder: '17841400000000000', hint: 'GET /me/accounts?fields=instagram_business_account in Graph API Explorer' },
      { key: 'accessToken',       label: 'Access Token',                  placeholder: 'EAAxxxx...',         hint: 'Same long-lived token from your Facebook app' },
    ],
    guide: [
      ['Switch to Business/Creator account', 'Must be linked to a Facebook Page'],
      ['Use your existing Facebook app', 'Instagram publishing uses the same Meta Developer app'],
      ['Get Business Account ID', 'Graph API Explorer: GET /me/accounts?fields=instagram_business_account'],
      ['Reuse Page Access Token', 'Same long-lived token from Facebook setup'],
    ],
    docsUrl: 'https://developers.facebook.com/docs/instagram-api/guides/content-publishing',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: '#010101',
    twBg: 'bg-slate-50',
    twText: 'text-slate-800',
    twBorder: 'border-slate-200',
    twActive: 'bg-slate-900 text-white',
    fields: [
      { key: 'clientKey',    label: 'Client Key',    placeholder: 'awxxx...',   hint: 'From TikTok for Developers app dashboard' },
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'xxxxx...',   hint: 'Keep private — never expose publicly' },
      { key: 'accessToken',  label: 'Access Token',  placeholder: 'act.xxx...', hint: 'Generated via TikTok OAuth flow for this posting account' },
    ],
    guide: [
      ['Create TikTok for Business account', 'Register at business.tiktok.com'],
      ['Apply for Content Posting API', 'developers.tiktok.com → My Apps → apply for Content Posting API (review required)'],
      ['Get Client Key & Secret', 'Approved app dashboard → Manage App'],
      ['Authorize and get Access Token', 'Run TikTok OAuth 2.0 for the posting account'],
    ],
    docsUrl: 'https://developers.tiktok.com/doc/content-posting-api-get-started',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    color: '#0A66C2',
    twBg: 'bg-sky-50',
    twText: 'text-sky-700',
    twBorder: 'border-sky-100',
    twActive: 'bg-sky-700 text-white',
    fields: [
      { key: 'clientId',       label: 'Client ID',          placeholder: '86xxxx...',                  hint: 'LinkedIn Developer app → Auth tab' },
      { key: 'clientSecret',   label: 'Client Secret',      placeholder: 'xxxxx...',                   hint: 'Primary Client Secret → Auth tab' },
      { key: 'organizationId', label: 'Organization URN',   placeholder: 'urn:li:organization:123456', hint: 'Company Page numeric ID as a URN' },
      { key: 'accessToken',    label: 'OAuth Access Token', placeholder: 'AQV...',                     hint: 'Expires after 60 days — refresh required' },
    ],
    guide: [
      ['Create LinkedIn Developer App', 'linkedin.com/developers → Create App → link to Company Page'],
      ['Request permissions', 'Products: "Share on LinkedIn" + "Marketing Developer Platform"'],
      ['Copy Client ID & Secret', 'App settings → Auth tab'],
      ['Get Organization URN', 'urn:li:organization:XXXXXXX — numeric ID from Company Page URL'],
      ['Run OAuth for Access Token', 'Scopes: r_organization_social + w_organization_social'],
    ],
    docsUrl: 'https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api',
  },
]

const PLATFORM_MAP = Object.fromEntries(PLATFORMS.map(p => [p.id, p]))
const BRANDS = ['All', 'BMW', 'Honda', 'Toyota', 'Lexus', 'Acura', 'Corporate']

const BRAND_BADGE = {
  BMW:       'bg-slate-900 text-white',
  Honda:     'bg-red-600 text-white',
  Toyota:    'bg-red-700 text-white',
  Lexus:     'bg-slate-700 text-white',
  Acura:     'bg-slate-800 text-white',
  Corporate: 'bg-indigo-600 text-white',
}

// ─── Platform status dot ──────────────────────────────────────────────────────
function PlatformDot({ platform, configured }) {
  return (
    <div
      title={`${platform.name}: ${configured ? 'Connected' : 'Not configured'}`}
      className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold transition-all ${
        configured
          ? 'text-white shadow-sm'
          : 'bg-slate-100 text-slate-300'
      }`}
      style={configured ? { backgroundColor: platform.color } : {}}
    >
      {platform.name[0]}
    </div>
  )
}

// ─── Masked input for credentials/tokens ─────────────────────────────────────
function SecretInput({ field, value, onChange }) {
  const { key, label, placeholder, hint } = field
  const isSecret = SENSITIVE_FIELD_KEYS.test(key)
  const [reveal, setReveal] = useState(false)
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="relative">
        <Key size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type={isSecret && !reveal ? 'password' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className={`w-full pl-9 ${isSecret ? 'pr-10' : 'pr-4'} py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100`}
        />
        {isSecret && (
          <button
            type="button"
            onClick={() => setReveal(r => !r)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
            title={reveal ? 'Hide' : 'Show'}
            aria-label={reveal ? 'Hide secret' : 'Show secret'}
          >
            {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

// ─── Credential fields for one platform within a dealership ──────────────────
function DealerPlatformEditor({ dealershipId, platform, allIntegrations, onSave }) {
  const stored  = allIntegrations[dealershipId]?.[platform.id] || {}
  const [fields, setFields] = useState(stored)
  const [saved,  setSaved]  = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)

  const isConfigured = platform.fields.every(f => !!fields[f.key]?.trim())
  const set = (k, v) => setFields(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    await onSave(dealershipId, platform.id, fields)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Collapsible setup guide */}
      <div className={`border rounded-xl overflow-hidden ${platform.twBorder}`}>
        <button
          onClick={() => setGuideOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
        >
          <span className="text-xs font-semibold text-slate-600">
            How to get {platform.name} API credentials
          </span>
          {guideOpen
            ? <ChevronUp size={13} className="text-slate-400" />
            : <ChevronDown size={13} className="text-slate-400" />}
        </button>
        {guideOpen && (
          <div className="px-4 pb-4 space-y-2.5 border-t border-slate-100 pt-3">
            {platform.guide.map(([title, desc], i) => (
              <div key={i} className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">{title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
            <a
              href={platform.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline mt-1"
            >
              {platform.name} API docs <ExternalLink size={10} />
            </a>
          </div>
        )}
      </div>

      {/* Credential inputs */}
      <div className="space-y-3">
        {platform.fields.map(field => (
          <SecretInput
            key={field.key}
            field={field}
            value={fields[field.key] || ''}
            onChange={(v) => set(field.key, v)}
          />
        ))}
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2 flex-wrap">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}
        >
          {saved
            ? <><CheckCircle size={14} /><span>Saved!</span></>
            : <><Settings size={14} /><span>Save Credentials</span></>}
        </button>
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl border flex-shrink-0 ${
          isConfigured
            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
            : 'text-slate-400 bg-slate-50 border-slate-200'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isConfigured ? 'bg-emerald-400' : 'bg-slate-300'}`} />
          {isConfigured ? 'Configured' : 'Not configured'}
        </span>
      </div>
    </div>
  )
}

// ─── Accordion row for one dealership ────────────────────────────────────────
function DealershipRow({ dealership, allIntegrations, onSave }) {
  const [open, setOpen]             = useState(false)
  const [activePlatform, setActive] = useState('facebook')

  const dealerConfig   = allIntegrations[dealership.id] || {}
  const configuredCount = PLATFORMS.filter(p =>
    p.fields.every(f => !!dealerConfig[p.id]?.[f.key]?.trim())
  ).length

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${open ? 'border-indigo-200 shadow-sm' : 'border-slate-100'}`}>
      {/* Row header */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${open ? 'bg-indigo-50/50' : 'bg-white hover:bg-slate-50'}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-800 leading-tight">{dealership.name}</p>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0 ${BRAND_BADGE[dealership.brand] || 'bg-slate-200 text-slate-600'}`}>
              {dealership.brand}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{dealership.location}</p>
        </div>

        {/* Platform status dots */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {PLATFORMS.map(p => (
            <PlatformDot
              key={p.id}
              platform={p}
              configured={p.fields.every(f => !!dealerConfig[p.id]?.[f.key]?.trim())}
            />
          ))}
        </div>

        {/* Connected count */}
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
          configuredCount === PLATFORMS.length
            ? 'text-emerald-700 bg-emerald-50'
            : configuredCount > 0
            ? 'text-amber-700 bg-amber-50'
            : 'text-slate-400 bg-slate-100'
        }`}>
          {configuredCount}/{PLATFORMS.length}
        </span>

        {open
          ? <ChevronUp size={15} className="text-slate-400 flex-shrink-0" />
          : <ChevronDown size={15} className="text-slate-400 flex-shrink-0" />}
      </button>

      {/* Expanded: platform tabs + editor */}
      {open && (
        <div className="border-t border-slate-100 bg-white">
          {/* Platform tab strip */}
          <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-hide">
            {PLATFORMS.map(p => {
              const isActive     = activePlatform === p.id
              const isConfigured = p.fields.every(f => !!dealerConfig[p.id]?.[f.key]?.trim())
              return (
                <button
                  key={p.id}
                  onClick={() => setActive(p.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex-shrink-0 ${
                    isActive
                      ? 'border-indigo-500 text-indigo-700 bg-indigo-50/40'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: isConfigured ? p.color : '#cbd5e1' }}
                  >
                    {p.name[0]}
                  </span>
                  {p.name}
                  {isConfigured && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />}
                </button>
              )
            })}
          </div>

          {/* Active platform editor */}
          <div className="p-5">
            <DealerPlatformEditor
              key={`${dealership.id}-${activePlatform}`}
              dealershipId={dealership.id}
              platform={PLATFORM_MAP[activePlatform]}
              allIntegrations={allIntegrations}
              onSave={onSave}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── EmailJS guide ────────────────────────────────────────────────────────────
function EmailGuide() {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-700">How to set up EmailJS (step-by-step)</span>
        {open ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          {[
            ['Create an account', 'Go to emailjs.com and sign up (200 emails/month free).'],
            ['Add an Email Service', 'Email Services → Add New Service → connect Gmail, Outlook, or SMTP.'],
            ['Create a Template', 'Email Templates → Create New → use {{to_name}}, {{subject}}, {{message}} variables.'],
            ['Get your credentials', 'Service ID from Email Services, Template ID from your template, Public Key from Account → API Keys.'],
            ['Paste below & test', 'Enter all three values and click Send Test Email.'],
          ].map(([title, desc], i) => (
            <div key={i} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
          <a href="https://www.emailjs.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:underline mt-1">
            Open EmailJS <ExternalLink size={11} />
          </a>
        </div>
      )}
    </div>
  )
}

// ─── Demo reset ───────────────────────────────────────────────────────────────
function DemoResetButton() {
  const [confirm, setConfirm]   = useState(false)
  const [resetting, setResetting] = useState(false)

  const handleReset = async () => {
    setResetting(true)
    try {
      // 1. Soft-delete every existing post (RLS denies hard DELETE for anon)
      await supabase.from('posts').update({ approval_status: 'deleted' }).neq('id', '__none__')
      // 2. Re-seed with mock data — upsert so re-runs don't conflict on PK
      await supabase.from('posts').upsert(MOCK_POSTS, { onConflict: 'id' })
      // Note: dealership_integrations are NOT wiped — clear individual rows from the UI.
      // This prevents accidental/malicious bulk credential deletion via the anon key.
    } catch (e) {
      console.error('[DemoReset]', e)
    }
    // 3. Clear local configs except EmailJS/Cloudinary
    ;['asbury_emailjs_config', 'asbury_cloudinary_config'].forEach(k => {
      const v = localStorage.getItem(k)
      localStorage.clear()
      if (v) localStorage.setItem(k, v)
    })
    window.location.href = '/login'
  }

  if (confirm) return (
    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
      <div className="flex-1 text-sm font-medium text-red-800">This will delete all posts and social account credentials. Continue?</div>
      <button onClick={() => setConfirm(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-white transition-colors">Cancel</button>
      <button onClick={handleReset} disabled={resetting} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
        {resetting
          ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /><span>Resetting…</span></>
          : <span>Reset Now</span>}
      </button>
    </div>
  )
  return (
    <button onClick={() => setConfirm(true)} className="flex items-center gap-2 px-5 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors">
      <RotateCcw size={14} /><span>Reset to Demo Defaults</span>
    </button>
  )
}

// ─── EmailJS config keys ──────────────────────────────────────────────────────
const LS_EMAIL_KEY = 'asbury_emailjs_config'
const LS_CL_KEY    = 'asbury_cloudinary_config'

function loadEmailConfig() {
  try {
    const cfg = JSON.parse(localStorage.getItem(LS_EMAIL_KEY) || '{}')
    // Migrate legacy single templateId → templateOtp
    if (cfg.templateId && !cfg.templateOtp) {
      cfg.templateOtp = cfg.templateId
      delete cfg.templateId
    }
    return cfg
  } catch { return {} }
}
function loadCloudinary()   { try { return JSON.parse(localStorage.getItem(LS_CL_KEY)    || '{}') } catch { return {} } }

async function testCloudinary(cfg) {
  const fd = new FormData()
  fd.append('file', 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==')
  fd.append('upload_preset', cfg.uploadPreset)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/upload`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error(await res.text())
}

async function sendTestEmail(cfg, fromUser) {
  // Use the OTP template for the test (it's the simplest)
  const templateId = cfg.templateOtp || cfg.templateInvite || cfg.templateApproval || cfg.templateUpload || cfg.templateId
  if (!templateId) throw new Error('No template ID configured')
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id:  cfg.serviceId,
      template_id: templateId,
      user_id:     cfg.publicKey,
      template_params: {
        to_email:  fromUser.email,
        to_name:   fromUser.name,
        subject:   'Asbury Social Hub — Email Test',
        otp_code:  '——',
        // Approval/upload template vars (ignored if wrong template)
        status_icon:  '✅',
        status_label: 'Email Test',
        status_color: '#16a34a',
        status_bg:    '#f0fdf4',
        platform:     'Test',
        dealership:   'Asbury Social Hub',
        scheduled_for:'Now',
        notes:        'Your EmailJS configuration is working correctly!',
        cta_url:      typeof window !== 'undefined' ? window.location.origin : '',
        cta_label:    'Open Asbury Social Hub',
        // Invite template vars
        invited_by:   'Asbury Social Hub',
        role_name:    'Test',
        invite_url:   typeof window !== 'undefined' ? window.location.origin : '',
        expires_note: 'This is a test email.',
        // Upload template vars
        uploader_name:  'Asbury Social Hub',
        caption_preview:'Your EmailJS configuration is working correctly!',
        review_url:     typeof window !== 'undefined' ? window.location.origin : '',
      },
    }),
  })
  if (!res.ok) throw new Error(await res.text())
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { currentUser } = useAuth()

  // EmailJS state
  const [emailCfg,   setEmailCfg]   = useState(loadEmailConfig)
  const [emailSaved, setEmailSaved] = useState(false)
  const [emailTest,  setEmailTest]  = useState(false)
  const [emailResult,setEmailResult]= useState(null)
  const emailConfigured = !!(
    emailCfg.serviceId && emailCfg.publicKey &&
    (emailCfg.templateOtp || emailCfg.templateInvite || emailCfg.templateApproval || emailCfg.templateUpload || emailCfg.templateId)
  )

  // Cloudinary state
  const [cl,       setCl]       = useState(loadCloudinary)
  const [clSaved,  setClSaved]  = useState(false)
  const [clTest,   setClTest]   = useState(false)
  const [clResult, setClResult] = useState(null)
  const clConfigured = !!(cl.cloudName && cl.uploadPreset)

  // Notification log
  const [log, setLog] = useState(getNotificationLog)

  // Dealership integrations — loaded from Supabase on mount
  const [allIntegrations, setAllIntegrations] = useState({})
  const [brandFilter, setBrandFilter]         = useState('All')

  useEffect(() => {
    fetchDealerIntegrations().then(data => setAllIntegrations(data))
  }, [])

  // Summary counts for social account manager header
  const totalConnected = useMemo(() => {
    let count = 0
    DEALERSHIPS.forEach(d => {
      PLATFORMS.forEach(p => {
        if (p.fields.every(f => !!allIntegrations[d.id]?.[p.id]?.[f.key]?.trim())) count++
      })
    })
    return count
  }, [allIntegrations])
  const totalPossible = DEALERSHIPS.length * PLATFORMS.length

  const filteredDealerships = useMemo(
    () => brandFilter === 'All' ? DEALERSHIPS : DEALERSHIPS.filter(d => d.brand === brandFilter),
    [brandFilter]
  )

  // Save one platform's credentials for one dealership → Supabase
  const handleDealerSave = async (dealershipId, platformId, fields) => {
    await upsertDealerIntegration(dealershipId, platformId, fields)
    setAllIntegrations(prev => ({
      ...prev,
      [dealershipId]: {
        ...prev[dealershipId],
        [platformId]: fields,
      },
    }))
  }

  // EmailJS handlers
  const setEmail = (k, v) => setEmailCfg(p => ({ ...p, [k]: v }))
  const handleEmailSave = () => {
    localStorage.setItem(LS_EMAIL_KEY, JSON.stringify(emailCfg))
    setEmailSaved(true)
    setTimeout(() => setEmailSaved(false), 2000)
  }
  const handleEmailTest = async () => {
    if (!emailConfigured) return
    setEmailTest(true); setEmailResult(null)
    try {
      await sendTestEmail(emailCfg, currentUser)
      setEmailResult({ ok: true, msg: `Test email sent to ${currentUser.email}` })
    } catch (e) {
      setEmailResult({ ok: false, msg: e.message || 'Send failed' })
    }
    setEmailTest(false)
  }

  // Cloudinary handlers
  const setCld = (k, v) => setCl(p => ({ ...p, [k]: v }))
  const handleClSave = () => {
    localStorage.setItem(LS_CL_KEY, JSON.stringify(cl))
    setClSaved(true)
    setTimeout(() => setClSaved(false), 2000)
  }
  const handleClTest = async () => {
    setClTest(true); setClResult(null)
    try {
      await testCloudinary(cl)
      setClResult({ ok: true, msg: 'Cloudinary connection successful!' })
    } catch (e) {
      setClResult({ ok: false, msg: e.message || 'Connection failed — check your credentials.' })
    }
    setClTest(false)
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-400 mt-1 text-sm">Configure notifications, file hosting, and social media accounts per dealership</p>
      </div>

      {/* ── EmailJS ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Mail size={16} className="text-indigo-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-slate-900">Email Notifications (EmailJS)</h2>
            <p className="text-xs text-slate-400 mt-0.5">Send approval/flag alerts without a backend server</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${
            emailConfigured ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-500 bg-slate-50 border-slate-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${emailConfigured ? 'bg-emerald-400' : 'bg-slate-300'}`} />
            {emailConfigured ? 'Configured' : 'Not configured'}
          </span>
        </div>
        <div className="p-6 space-y-5">
          <EmailGuide />
          <div className="space-y-4">
            {[
              { key: 'serviceId', label: 'Service ID', placeholder: 'service_xxxxxxx', note: 'From Email Services in EmailJS' },
              { key: 'publicKey', label: 'Public Key', placeholder: 'Your EmailJS public key', note: 'From Account → General in EmailJS' },
            ].map(({ key, label, placeholder, note }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label} <span className="normal-case font-normal text-slate-400">— {note}</span></label>
                <div className="relative">
                  <Key size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={emailCfg[key] || ''} onChange={e => setEmail(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                </div>
              </div>
            ))}
            <div className="pt-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Email Templates <span className="normal-case font-normal text-slate-400">— one per email type</span></p>
              <div className="space-y-3">
                {[
                  { key: 'templateOtp',      label: 'Password Reset / OTP',      placeholder: 'template_xxxxxxx' },
                  { key: 'templateInvite',   label: 'New User Invitation',       placeholder: 'template_xxxxxxx' },
                  { key: 'templateApproval', label: 'Post Status (Approved / Revision / Rejected)', placeholder: 'template_xxxxxxx' },
                  { key: 'templateUpload',   label: 'New Upload (Needs Review)', placeholder: 'template_xxxxxxx' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
                    <div className="relative">
                      <Key size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={emailCfg[key] || ''} onChange={e => setEmail(key, e.target.value)}
                        placeholder={placeholder}
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {emailResult && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border ${
              emailResult.ok ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'
            }`}>
              {emailResult.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {emailResult.msg}
            </div>
          )}
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            <button onClick={handleEmailSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }}>
              {emailSaved ? <><CheckCircle size={14} /><span>Saved!</span></> : <><Settings size={14} /><span>Save Configuration</span></>}
            </button>
            <button onClick={handleEmailTest} disabled={!emailConfigured || emailTest}
              className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
              {emailTest
                ? <><span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin flex-shrink-0" /><span>Sending…</span></>
                : <><Send size={14} /><span>Send Test Email</span></>}
            </button>
          </div>
        </div>
      </div>

      {/* ── Cloudinary ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
            <Cloud size={16} className="text-sky-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-slate-900">File Uploads (Cloudinary)</h2>
            <p className="text-xs text-slate-400 mt-0.5">Host images and videos so any team member can preview them</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${
            clConfigured ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-500 bg-slate-50 border-slate-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${clConfigured ? 'bg-emerald-400' : 'bg-slate-300'}`} />
            {clConfigured ? 'Configured' : 'Not configured'}
          </span>
        </div>
        <div className="p-6 space-y-4">
          <div className="border border-slate-200 rounded-xl p-4 text-sm text-slate-600 space-y-1.5">
            <p className="font-semibold text-slate-800">Setup (2 minutes, free tier available):</p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-slate-500">
              <li>Create a free account at <a href="https://cloudinary.com" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">cloudinary.com</a></li>
              <li>Settings → Upload → Add upload preset → Signing Mode: <strong>Unsigned</strong> → Save</li>
              <li>Copy your <strong>Cloud Name</strong> and <strong>Upload Preset name</strong> below</li>
            </ol>
          </div>
          {[
            { key: 'cloudName',    label: 'Cloud Name',    placeholder: 'my-cloud-name' },
            { key: 'uploadPreset', label: 'Upload Preset', placeholder: 'my-unsigned-preset' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
              <div className="relative">
                <Key size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={cl[key] || ''} onChange={e => setCld(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </div>
            </div>
          ))}
          {clResult && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border ${
              clResult.ok ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'
            }`}>
              {clResult.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {clResult.msg}
            </div>
          )}
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            <button onClick={handleClSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }}>
              {clSaved ? <><CheckCircle size={14} /><span>Saved!</span></> : <><Settings size={14} /><span>Save</span></>}
            </button>
            <button onClick={handleClTest} disabled={!clConfigured || clTest}
              className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
              {clTest
                ? <><span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin flex-shrink-0" /><span>Testing…</span></>
                : <><Image size={14} /><span>Test Connection</span></>}
            </button>
          </div>
        </div>
      </div>

      {/* ── Social Account Manager ── */}
      <div className="mb-2">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <h2 className="text-base font-bold text-slate-900">Social Media Accounts</h2>
            <p className="text-xs text-slate-400 mt-0.5">Each dealership connects its own handles — credentials never mix between locations</p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 mt-0.5 ${
            totalConnected === totalPossible
              ? 'text-emerald-700 bg-emerald-50'
              : totalConnected > 0
              ? 'text-amber-700 bg-amber-50'
              : 'text-slate-500 bg-slate-100'
          }`}>
            {totalConnected}/{totalPossible} connected
          </span>
        </div>

        {/* Platform legend */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {PLATFORMS.map(p => (
            <div key={p.id} className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: p.color }}>
                {p.name[0]}
              </div>
              {p.name}
            </div>
          ))}
          <span className="text-xs text-slate-300 ml-1">· grey = not configured</span>
        </div>

        {/* Brand filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          {BRANDS.map(b => (
            <button
              key={b}
              onClick={() => setBrandFilter(b)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                brandFilter === b
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Dealership accordion list */}
      <div className="space-y-2 mb-6">
        {filteredDealerships.map(d => (
          <DealershipRow
            key={d.id}
            dealership={d}
            allIntegrations={allIntegrations}
            onSave={handleDealerSave}
          />
        ))}
      </div>

      {/* ── Danger Zone ── */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden mb-5">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-red-50">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <RotateCcw size={16} className="text-red-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Reset Demo Data</h2>
            <p className="text-xs text-slate-400 mt-0.5">Wipe all posts and restore default seed data</p>
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4">
            Restores the platform to its original demo state. Integration credentials (EmailJS, Cloudinary, social accounts) are preserved.
          </p>
          <DemoResetButton />
        </div>
      </div>

      {/* ── Notification Log ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Clock size={15} className="text-slate-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Notification Log</h2>
              <p className="text-xs text-slate-400 mt-0.5">All email events — sent or logged only</p>
            </div>
          </div>
          {log.length > 0 && (
            <button onClick={() => { clearNotificationLog(); setLog([]) }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors">
              <Trash2 size={13} />Clear log
            </button>
          )}
        </div>
        {log.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No notifications logged yet.</div>
        ) : (
          <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
            {[...log].reverse().map((entry, i) => (
              <div key={i} className="flex items-start gap-4 px-6 py-3.5">
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5 ${
                  entry.sent ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-500 bg-slate-50 border-slate-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${entry.sent ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                  {entry.sent ? 'Sent' : 'Logged'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{entry.type}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{entry.to}</p>
                </div>
                <p className="text-xs text-slate-400 flex-shrink-0">{new Date(entry.timestamp).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
