export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { url } = req.body || {}
  const strategy = ['mobile', 'desktop'].includes(req.body?.strategy) ? req.body.strategy : 'mobile'
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'URL is required' })

  let targetUrl = url.trim().slice(0, 2048)
  if (!targetUrl.startsWith('http')) targetUrl = `https://${targetUrl}`

  try {
    const key = process.env.GOOGLE_PAGESPEED_API_KEY ? `&key=${process.env.GOOGLE_PAGESPEED_API_KEY}` : ''
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&strategy=${strategy}${key}`
    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(60000),
    })
    const data = await response.json()
    if (data.error) {
      const msg = data.error.message || 'PageSpeed API error'
      const friendly = msg.includes('Quota exceeded')
        ? 'Daily API quota exceeded. Add a GOOGLE_PAGESPEED_API_KEY in Vercel to get a higher limit — the key is free.'
        : msg
      return res.status(400).json({ error: friendly })
    }
    return res.status(200).json(data)
  } catch (err) {
    const msg = err.name === 'TimeoutError' ? 'Request timed out — PageSpeed tests can take up to 60s' : err.message
    return res.status(500).json({ error: msg })
  }
}
