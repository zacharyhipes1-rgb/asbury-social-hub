// GA4 analytics helper
// Measurement ID set via VITE_GA4_ID env var (e.g. G-XXXXXXXXXX)
// No-ops silently if GA4 is not configured or consent not given.

const GA_ID = import.meta.env.VITE_GA4_ID

export function isAnalyticsEnabled() {
  return !!(GA_ID && typeof window !== 'undefined' && window.gtag)
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
