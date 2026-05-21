// QR Code scan redirect handler
// Logs the scan in qr_scans, then 302-redirects to the original target URL.
// Falls back to /tools on any error so scanners are never left on a dead page.

const FALLBACK = 'https://asbury-social-hub.vercel.app/tools'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query
  if (!id) return res.redirect(302, FALLBACK)

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('[qr-redirect] Missing Supabase env vars')
    return res.redirect(302, FALLBACK)
  }

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  }

  try {
    // 1. Look up the QR code record
    const lookupRes = await fetch(
      `${supabaseUrl}/rest/v1/qr_codes?id=eq.${encodeURIComponent(id)}&select=target_url&limit=1`,
      { headers, signal: AbortSignal.timeout(5000) }
    )
    const rows = await lookupRes.json()

    if (!Array.isArray(rows) || !rows[0]?.target_url) {
      console.warn('[qr-redirect] QR code not found:', id)
      return res.redirect(302, FALLBACK)
    }

    const targetUrl = rows[0].target_url

    // 2. Log the scan (best-effort — don't block the redirect on failure)
    const userAgent = (req.headers['user-agent'] || '').slice(0, 500)
    fetch(`${supabaseUrl}/rest/v1/qr_scans`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ qr_code_id: id, user_agent: userAgent }),
    }).catch(e => console.error('[qr-redirect] scan log failed:', e.message))

    // 3. Redirect — use 302 so scan counts update on repeat visits
    return res.redirect(302, targetUrl)
  } catch (err) {
    console.error('[qr-redirect] error:', err.message)
    return res.redirect(302, FALLBACK)
  }
}
