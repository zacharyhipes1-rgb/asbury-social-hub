import { useState } from 'react'
import { Settings, Mail, Key, Send, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Trash2, Clock, ExternalLink, Cloud, Image } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getNotificationLog, clearNotificationLog } from '../services/emailService'

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
            <p className="text-xs text-slate-400 mt-0.5">Host images and videos so Chad can view uploaded content</p>
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
