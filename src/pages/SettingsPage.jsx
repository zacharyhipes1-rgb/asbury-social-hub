import { useState } from 'react'
import { Settings, Mail, Key, Send, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Trash2, Clock, ExternalLink, Cloud, Image, Zap, Link2, RotateCcw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getNotificationLog, clearNotificationLog } from '../services/emailService'

const PLATFORM_INTEGRATIONS = [
  {
    id: 'facebook',
    name: 'Facebook',
    color: '#1877F2',
    twBg: 'bg-blue-50',
    twIcon: 'text-blue-600',
    twBorder: 'border-blue-100',
    description: 'Auto-publish posts to your Facebook Business Page on the scheduled date.',
    lsKey: 'asbury_platform_facebook',
    fields: [
      { key: 'pageId',      label: 'Page ID',           placeholder: '123456789012345',  hint: 'Found in your Page → About section, or via Meta for Developers' },
      { key: 'accessToken', label: 'Page Access Token', placeholder: 'EAAxxxx...',        hint: 'Long-lived token from Meta Graph API Explorer — expires after 60 days' },
    ],
    guide: [
      ['Create a Meta Developer App', 'Go to developers.facebook.com → My Apps → Create App → select Business type.'],
      ['Add Pages API product', 'In your app, add the Facebook Login and Pages API products.'],
      ['Generate a long-lived Page Token', 'Use the Graph API Explorer → select your app → generate a User Token → exchange it for a long-lived Page Access Token.'],
      ['Find your Page ID', 'Open your Facebook Page → About → scroll to the bottom to find the numeric Page ID.'],
    ],
    docsUrl: 'https://developers.facebook.com/docs/pages/publishing',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    color: '#E1306C',
    twBg: 'bg-pink-50',
    twIcon: 'text-pink-600',
    twBorder: 'border-pink-100',
    description: 'Auto-publish images, Reels, and Stories to your Instagram Business account.',
    lsKey: 'asbury_platform_instagram',
    fields: [
      { key: 'businessAccountId', label: 'Instagram Business Account ID', placeholder: '17841400000000000', hint: 'Call GET /me/accounts?fields=instagram_business_account in Graph API Explorer' },
      { key: 'accessToken',       label: 'Access Token',                  placeholder: 'EAAxxxx...',         hint: 'Same long-lived token from your Facebook app — Meta uses one token for both' },
    ],
    guide: [
      ['Switch to a Business or Creator account', 'Your Instagram account must be a Business/Creator account linked to a Facebook Page.'],
      ['Use your existing Facebook app', 'Instagram publishing uses the same Meta Developer app — no new app needed.'],
      ['Get the Business Account ID', 'In Graph API Explorer: GET /me/accounts?fields=instagram_business_account → copy the id value.'],
      ['Reuse your Page Access Token', 'The same long-lived token from your Facebook setup grants Instagram Content Publishing permissions.'],
    ],
    docsUrl: 'https://developers.facebook.com/docs/instagram-api/guides/content-publishing',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: '#010101',
    twBg: 'bg-slate-50',
    twIcon: 'text-slate-700',
    twBorder: 'border-slate-200',
    description: 'Auto-publish short-form videos to your TikTok Business account.',
    lsKey: 'asbury_platform_tiktok',
    fields: [
      { key: 'clientKey',    label: 'Client Key',    placeholder: 'awxxx...',  hint: 'From your TikTok for Developers app dashboard' },
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'xxxxx...', hint: 'Keep private — never expose this publicly' },
      { key: 'accessToken',  label: 'Access Token',  placeholder: 'act.xxx...', hint: 'Generated via TikTok OAuth flow for the posting account' },
    ],
    guide: [
      ['Create a TikTok for Business account', 'Register at business.tiktok.com — you need a Business account to use the API.'],
      ['Apply for Content Posting API', 'Go to developers.tiktok.com → My Apps → Create App → apply for the Content Posting API (review required).'],
      ['Get Client Key & Secret', 'Once approved, your Client Key and Client Secret appear in the app dashboard under Manage App.'],
      ['Authorize and get Access Token', 'Run the TikTok OAuth 2.0 flow for your posting account to generate a user Access Token.'],
    ],
    docsUrl: 'https://developers.tiktok.com/doc/content-posting-api-get-started',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    color: '#0A66C2',
    twBg: 'bg-sky-50',
    twIcon: 'text-sky-700',
    twBorder: 'border-sky-100',
    description: 'Auto-publish company updates and thought leadership content to your LinkedIn Page.',
    lsKey: 'asbury_platform_linkedin',
    fields: [
      { key: 'clientId',       label: 'Client ID',            placeholder: '86xxxx...',                hint: 'From your LinkedIn Developer app under Auth tab' },
      { key: 'clientSecret',   label: 'Client Secret',        placeholder: 'xxxxx...',                 hint: 'Primary Client Secret from the Auth tab — keep private' },
      { key: 'organizationId', label: 'Organization URN',     placeholder: 'urn:li:organization:123456', hint: 'Your Company Page ID as a URN — the number is in your company page URL' },
      { key: 'accessToken',    label: 'OAuth Access Token',   placeholder: 'AQV...',                   hint: 'Generated via LinkedIn OAuth 2.0 — expires after 60 days, refresh needed' },
    ],
    guide: [
      ['Create a LinkedIn Developer App', 'Go to linkedin.com/developers → Create App → associate it with your LinkedIn Company Page.'],
      ['Request the right permissions', 'Under Products, request "Share on LinkedIn" and "Marketing Developer Platform" access.'],
      ['Copy Client ID & Secret', 'In your app settings → Auth tab, copy the Client ID and Primary Client Secret.'],
      ['Get your Organization URN', 'Format: urn:li:organization:XXXXXXX — the number is the numeric ID in your Company Page URL.'],
      ['Run OAuth and get Access Token', 'Use LinkedIn\'s OAuth 2.0 flow with scopes r_organization_social + w_organization_social to generate an access token.'],
    ],
    docsUrl: 'https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api',
  },
]

function loadPlatformConfig(lsKey) {
  try { return JSON.parse(localStorage.getItem(lsKey) || '{}') } catch { return {} }
}

function PlatformCard({ platform }) {
  const [config, setConfig] = useState(() => loadPlatformConfig(platform.lsKey))
  const [guideOpen, setGuideOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const isConfigured = platform.fields.every(f => !!config[f.key]?.trim())
  const set = (k, v) => setConfig(p => ({ ...p, [k]: v }))

  const handleSave = () => {
    localStorage.setItem(platform.lsKey, JSON.stringify(config))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-4">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
        <div className={`w-9 h-9 rounded-xl ${platform.twBg} flex items-center justify-center flex-shrink-0`}>
          <Link2 size={16} className={platform.twIcon} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">{platform.name}</h2>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
              <Zap size={9} /> Coming soon
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{platform.description}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${
          isConfigured ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-500 bg-slate-50 border-slate-200'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-slate-300'}`} />
          {isConfigured ? 'Credentials saved' : 'Not configured'}
        </span>
      </div>
      <div className="p-6 space-y-4">
        {/* Collapsible guide */}
        <div className={`border rounded-xl overflow-hidden ${platform.twBorder}`}>
          <button onClick={() => setGuideOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors">
            <span className="text-sm font-semibold text-slate-700">How to get your {platform.name} API credentials</span>
            {guideOpen ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
          </button>
          {guideOpen && (
            <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
              {platform.guide.map(([title, desc], i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
              <a href={platform.docsUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:underline mt-1">
                {platform.name} API docs <ExternalLink size={11} />
              </a>
            </div>
          )}
        </div>

        {/* Credential fields */}
        <div className="space-y-4">
          {platform.fields.map(({ key, label, placeholder, hint }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
              <div className="relative">
                <Key size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={config[key] || ''} onChange={e => set(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </div>
              {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }}>
            {saved ? <><CheckCircle size={14} /> Saved!</> : <><Settings size={14} /> Save Credentials</>}
          </button>
          <p className="text-xs text-slate-400">Credentials stored locally — auto-publish wires in automatically once the integration goes live.</p>
        </div>
      </div>
    </div>
  )
}

function DemoResetButton() {
  const [confirm, setConfirm] = useState(false)
  const handleReset = () => {
    const preserved = {}
    ;['asbury_emailjs_config', 'asbury_cloudinary_config'].forEach(k => {
      const v = localStorage.getItem(k)
      if (v) preserved[k] = v
    })
    Object.keys(localStorage).filter(k => k.startsWith('asbury_')).forEach(k => localStorage.removeItem(k))
    Object.entries(preserved).forEach(([k, v]) => localStorage.setItem(k, v))
    window.location.href = '/login'
  }
  if (confirm) return (
    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
      <div className="flex-1 text-sm font-medium text-red-800">This will delete all users, posts, and presets. Continue?</div>
      <button onClick={() => setConfirm(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-white transition-colors">Cancel</button>
      <button onClick={handleReset} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors">Reset Now</button>
    </div>
  )
  return (
    <button onClick={() => setConfirm(true)}
      className="flex items-center gap-2 px-5 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors">
      <RotateCcw size={14} />
      Reset to Demo Defaults
    </button>
  )
}

const LS_KEY = 'asbury_emailjs_config'
const CL_KEY = 'asbury_cloudinary_config'

function loadConfig() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}

function saveConfig(cfg) {
  localStorage.setItem(LS_KEY, JSON.stringify(cfg))
}

function loadCloudinary() {
  try { return JSON.parse(localStorage.getItem(CL_KEY) || '{}') } catch { return {} }
}

async function testCloudinary(cfg) {
  const fd = new FormData()
  fd.append('file', 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==')
  fd.append('upload_preset', cfg.uploadPreset)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/upload`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error(await res.text())
}

async function sendTestEmail(cfg, fromUser) {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id:  cfg.serviceId,
      template_id: cfg.templateId,
      user_id:     cfg.publicKey,
      template_params: {
        to_email:    fromUser.email,
        to_name:     fromUser.name,
        subject:     'Asbury Social Hub — Email Test',
        message:     'This is a test notification from Asbury Social Hub. Your EmailJS configuration is working correctly!',
        from_name:   'Asbury Social Hub',
      },
    }),
  })
  if (!res.ok) throw new Error(await res.text())
}

function GuideSection() {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-700">How to set up EmailJS (step-by-step)</span>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          {[
            ['Create an account', 'Go to emailjs.com and sign up for a free account (200 emails/month free).'],
            ['Add an Email Service', 'In the dashboard, go to Email Services → Add New Service. Connect your Gmail, Outlook, or SMTP provider.'],
            ['Create an Email Template', 'Go to Email Templates → Create New Template. Use variables like {{to_name}}, {{subject}}, {{message}}, {{from_name}} in your template body.'],
            ['Get your credentials', 'From Email Services, copy your Service ID. From your template, copy the Template ID. From Account → API Keys, copy your Public Key.'],
            ['Paste below & test', 'Enter all three values in the form below and click Send Test Email to confirm it works.'],
          ].map(([title, desc], i) => (
            <div key={i} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
          <a href="https://www.emailjs.com" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:underline mt-1">
            Open EmailJS <ExternalLink size={11} />
          </a>
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const { currentUser } = useAuth()
  const [cfg, setCfg] = useState(loadConfig)
  const [saved, setSaved]     = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [log, setLog]         = useState(getNotificationLog)

  const [cl, setCl]             = useState(loadCloudinary)
  const [clSaved, setClSaved]   = useState(false)
  const [clTesting, setClTesting] = useState(false)
  const [clResult, setClResult] = useState(null)
  const clConfigured = !!(cl.cloudName && cl.uploadPreset)

  const isConfigured = !!(cfg.serviceId && cfg.templateId && cfg.publicKey)

  const set = (k, v) => setCfg(prev => ({ ...prev, [k]: v }))

  const handleSave = () => {
    saveConfig(cfg)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = async () => {
    if (!isConfigured) return
    setTesting(true)
    setTestResult(null)
    try {
      await sendTestEmail(cfg, currentUser)
      setTestResult({ ok: true, msg: `Test email sent to ${currentUser.email}` })
    } catch (err) {
      setTestResult({ ok: false, msg: err.message || 'Send failed' })
    }
    setTesting(false)
  }

  const handleClearLog = () => {
    clearNotificationLog()
    setLog([])
  }

  const handleClSave = () => {
    localStorage.setItem(CL_KEY, JSON.stringify(cl))
    setClSaved(true)
    setTimeout(() => setClSaved(false), 2000)
  }

  const handleClTest = async () => {
    setClTesting(true)
    setClResult(null)
    try {
      await testCloudinary(cl)
      setClResult({ ok: true, msg: 'Cloudinary connection successful!' })
    } catch (e) {
      setClResult({ ok: false, msg: e.message || 'Connection failed — check your credentials.' })
    }
    setClTesting(false)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-400 mt-1 text-sm">Configure email notifications and integrations</p>
      </div>

      {/* EmailJS config */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Mail size={16} className="text-indigo-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-slate-900">Email Notifications (EmailJS)</h2>
            <p className="text-xs text-slate-400 mt-0.5">Send real email alerts without a backend server</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
            isConfigured
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              : 'text-slate-500 bg-slate-50 border-slate-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-slate-300'}`} />
            {isConfigured ? 'Configured' : 'Not configured'}
          </span>
        </div>
        <div className="p-6 space-y-5">
          <GuideSection />
          <div className="space-y-4">
            {[
              { key: 'serviceId',  label: 'Service ID',  placeholder: 'service_xxxxxxx' },
              { key: 'templateId', label: 'Template ID', placeholder: 'template_xxxxxxx' },
              { key: 'publicKey',  label: 'Public Key',  placeholder: 'Your EmailJS public key' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  {label}
                </label>
                <div className="relative">
                  <Key size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={cfg[key] || ''}
                    onChange={e => set(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
            ))}
          </div>

          {testResult && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border ${
              testResult.ok
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                : 'text-red-700 bg-red-50 border-red-200'
            }`}>
              {testResult.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {testResult.msg}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }}
            >
              {saved ? <><CheckCircle size={14} /> Saved!</> : <><Settings size={14} /> Save Configuration</>}
            </button>
            <button
              onClick={handleTest}
              disabled={!isConfigured || testing}
              className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {testing
                ? <><span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /> Sending…</>
                : <><Send size={14} /> Send Test Email</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* Cloudinary */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center">
            <Cloud size={16} className="text-sky-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-slate-900">File Uploads (Cloudinary)</h2>
            <p className="text-xs text-slate-400 mt-0.5">Host images and videos for admin review and previews</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
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
              <li>In your dashboard, go to <strong>Settings → Upload</strong></li>
              <li>Click <strong>Add upload preset</strong> → set Signing Mode to <strong>Unsigned</strong> → Save</li>
              <li>Copy your <strong>Cloud Name</strong> (top of dashboard) and the <strong>Upload Preset name</strong> below</li>
            </ol>
          </div>
          {[
            { key: 'cloudName',    label: 'Cloud Name',     placeholder: 'my-cloud-name' },
            { key: 'uploadPreset', label: 'Upload Preset',  placeholder: 'my-unsigned-preset' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
              <div className="relative">
                <Key size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={cl[key] || ''} onChange={e => setCl(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </div>
            </div>
          ))}
          {clResult && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border ${clResult.ok ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
              {clResult.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {clResult.msg}
            </div>
          )}
          <div className="flex items-center gap-3 pt-1">
            <button onClick={handleClSave}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }}>
              {clSaved ? <><CheckCircle size={14} /> Saved!</> : <><Settings size={14} /> Save</>}
            </button>
            <button onClick={handleClTest} disabled={!clConfigured || clTesting}
              className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-40">
              {clTesting ? <><span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /> Testing…</> : <><Image size={14} /> Test Connection</>}
            </button>
          </div>
        </div>
      </div>

      {/* Platform Integrations */}
      <div className="mb-2">
        <h2 className="text-base font-bold text-slate-900">Social Media Platform Integrations</h2>
        <p className="text-xs text-slate-400 mt-0.5">Save your API credentials now — auto-publishing activates once each integration goes live.</p>
      </div>
      <div className="mb-6">
        {PLATFORM_INTEGRATIONS.map(platform => (
          <PlatformCard key={platform.id} platform={platform} />
        ))}
      </div>

      {/* Danger Zone — Reset Demo Data */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden mb-6">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-red-50">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
            <RotateCcw size={16} className="text-red-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-slate-900">Reset Demo Data</h2>
            <p className="text-xs text-slate-400 mt-0.5">Wipe all users and posts, restore default seed data, and log out</p>
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4">
            Use this to restore the platform to its original demo state — all posts, user edits, and hashtag presets will be cleared.
            Your integration settings (EmailJS, Cloudinary) will be preserved.
          </p>
          <DemoResetButton />
        </div>
      </div>

      {/* Notification log */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
              <Clock size={15} className="text-slate-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Notification Log</h2>
              <p className="text-xs text-slate-400 mt-0.5">All email events — sent or logged only</p>
            </div>
          </div>
          {log.length > 0 && (
            <button onClick={handleClearLog} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors">
              <Trash2 size={13} /> Clear log
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
                  entry.sent
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-slate-500 bg-slate-50 border-slate-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${entry.sent ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                  {entry.sent ? 'Sent' : 'Logged'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{entry.type}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{entry.to}</p>
                </div>
                <p className="text-xs text-slate-400 flex-shrink-0">
                  {new Date(entry.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
