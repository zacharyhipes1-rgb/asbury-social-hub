// GA4 analytics helper
// Measurement ID set via VITE_GA4_ID env var (e.g. G-XXXXXXXXXX)
// No-ops silently if GA4 is not configured.

// Env var takes priority; hardcoded ID is the reliable fallback (GA4 IDs are public)
const GA_ID = import.meta.env.VITE_GA4_ID || 'G-0TJ9Z37WZW'

// Inject gtag script from JS so import.meta.env substitution is guaranteed
function initGA() {
  if (!GA_ID || !GA_ID.startsWith('G-') || typeof window === 'undefined') return
  if (window.__ga_initialized) return
  window.__ga_initialized = true

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  function gtag() { window.dataLayer.push(arguments) }
  window.gtag = gtag
  gtag('js', new Date())
  gtag('config', GA_ID, { send_page_view: false })
}

initGA()

export function isAnalyticsEnabled() {
  return !!(GA_ID && GA_ID.startsWith('G-') && typeof window !== 'undefined' && window.gtag)
}

// Track a page view — call this on every route change
export function trackPageView(path, title) {
  if (!isAnalyticsEnabled()) return
  window.gtag('config', GA_ID, {
    page_path:  path  || window.location.pathname,
    page_title: title || document.title,
  })
}

// Track a custom event
export function trackEvent(eventName, params = {}) {
  if (!isAnalyticsEnabled()) return
  window.gtag('event', eventName, params)
}

// Convenience events used across the app
export const Events = {
  // Auth
  LOGIN:            (method = 'email') => trackEvent('login',            { method }),
  SIGN_UP:          (method = 'email') => trackEvent('sign_up',          { method }),
  LOGOUT:                               () => trackEvent('logout'),
  PASSWORD_RESET:                       () => trackEvent('password_reset'),

  // Content
  UPLOAD_START:     (platform)         => trackEvent('upload_start',     { platform }),
  UPLOAD_COMPLETE:  (platform, dealer) => trackEvent('upload_complete',  { platform, dealership: dealer }),
  CAPTION_GENERATE: (platform)         => trackEvent('caption_generate', { platform }),
  CAPTION_USE:      (platform)         => trackEvent('caption_use',      { platform }),

  // Assets
  ASSET_UPLOAD:     (type)             => trackEvent('asset_upload',     { file_type: type }),
  ASSET_VIEW:                           () => trackEvent('asset_view'),

  // Tools
  QR_GENERATE:                          () => trackEvent('qr_generate'),
  QR_SCAN:                              () => trackEvent('qr_scan'),
}
