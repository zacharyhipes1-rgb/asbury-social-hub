// Required Vercel env var (server-side only, no VITE_ prefix):
//   RECAPTCHA_SECRET_KEY  — from console.cloud.google.com → reCAPTCHA → your site → Secret Key

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { token } = req.body || {}
  if (!token) return res.status(400).json({ success: false, error: 'No reCAPTCHA token provided' })

  const secret = process.env.RECAPTCHA_SECRET_KEY
  if (!secret) {
    // No secret configured — skip verification (dev/staging fallback)
    console.warn('RECAPTCHA_SECRET_KEY not set — skipping verification')
    return res.status(200).json({ success: true, skipped: true })
  }

  try {
    const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    })
    const data = await resp.json()
    if (data.success) {
      return res.status(200).json({ success: true })
    }
    return res.status(400).json({ success: false, error: 'reCAPTCHA verification failed. Please try again.' })
  } catch (err) {
    console.error('reCAPTCHA verify error:', err)
    return res.status(500).json({ success: false, error: 'Verification service unavailable.' })
  }
}
