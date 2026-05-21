// Cloudinary helpers + file validation shared by FormWizard Step 4 and the
// Asset Library upload modal. Lifted from Step4Upload.jsx so both flows
// enforce the same rules.

const LS_CLOUDINARY_KEY = 'asbury_cloudinary_config'

export function getCloudinaryConfig() {
  try { return JSON.parse(localStorage.getItem(LS_CLOUDINARY_KEY) || '{}') } catch { return {} }
}

export function isCloudinaryConfigured() {
  const cfg = getCloudinaryConfig()
  return !!(cfg.cloudName && cfg.uploadPreset)
}

// Cloudinary supports image/video/raw resource types. Images & video get
// preview transforms; everything else is uploaded as `raw`.
function resourceTypeFor(file) {
  if (file.type?.startsWith('image/')) return 'image'
  if (file.type?.startsWith('video/')) return 'video'
  return 'raw'
}

export async function uploadToCloudinary(file, cfg = getCloudinaryConfig()) {
  if (!cfg.cloudName || !cfg.uploadPreset) {
    throw new Error('Cloudinary not configured. Add cloud name + upload preset in Settings.')
  }
  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', cfg.uploadPreset)
  const resourceType = resourceTypeFor(file)
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cfg.cloudName}/${resourceType}/upload`,
    { method: 'POST', body: fd }
  )
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return { secure_url: data.secure_url, resource_type: resourceType, raw: data }
}

// Derive a 240×240 thumbnail URL from a Cloudinary secure_url.
//   image → c_thumb,w_240,h_240,g_auto inserted after /upload/
//   video → so_2.0,c_thumb,w_240,h_240 (poster frame at 2s) + .jpg
//   raw   → null (caller renders a generic file icon)
export function deriveThumbnailUrl(secureUrl, fileType) {
  if (!secureUrl || typeof secureUrl !== 'string') return null
  if (!secureUrl.includes('/upload/')) return null
  if (fileType?.startsWith('image/')) {
    return secureUrl.replace('/upload/', '/upload/c_thumb,w_240,h_240,g_auto/')
  }
  if (fileType?.startsWith('video/')) {
    return secureUrl
      .replace('/upload/', '/upload/so_2.0,c_thumb,w_240,h_240/')
      .replace(/\.(mp4|mov|webm|avi|mkv)$/i, '.jpg')
  }
  return null
}

// Force-download URL for Cloudinary image/video assets (inserts fl_attachment).
// Raw resources (PDF, ZIP, etc.) do NOT support Cloudinary transformations —
// applying fl_attachment to a /raw/upload/ URL causes ERR_INVALID_RESPONSE.
// For raw files, return the URL unchanged and use a fetch→blob download instead.
export function forceDownloadUrl(src) {
  if (!src || !src.includes('res.cloudinary.com') || !src.includes('/upload/')) return src
  if (src.includes('/raw/upload/')) return src  // transformations invalid on raw resources
  return src.replace('/upload/', '/upload/fl_attachment/')
}

// ── File validation ─────────────────────────────────────────────────────────
export const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
  'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-matroska',
  'application/pdf',
  'application/zip', 'application/x-zip-compressed',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
])

const ALLOWED_EXTENSIONS = /\.(jpe?g|png|gif|webp|heic|heif|mp4|mov|webm|avi|mkv|pdf|zip|pptx?)$/i

const BLOCKED_EXTENSIONS = /\.(svg|html?|xhtml|js|mjs|jsx?|ts|tsx|exe|bat|sh|cmd|app|dmg|msi)$/i

export function validateFile(file) {
  if (!file) return 'No file selected.'
  if (file.size === 0) return 'File is empty.'
  if (file.size > MAX_FILE_SIZE) {
    return `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Max ${MAX_FILE_SIZE / (1024 * 1024)} MB.`
  }
  // Reject explicitly dangerous types first
  if (BLOCKED_EXTENSIONS.test(file.name) || file.type === 'image/svg+xml' || file.type === 'text/html') {
    return 'That file type is not allowed for security reasons.'
  }
  const okMime = ALLOWED_MIME_TYPES.has(file.type)
  const okExt  = ALLOWED_EXTENSIONS.test(file.name)
  if (!okMime && !okExt) {
    return `Unsupported file type${file.type ? ` (${file.type})` : ''}. Allowed: images, video, PDF, ZIP, PowerPoint.`
  }
  return null
}
