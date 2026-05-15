export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { url } = req.body || {}
  if (!url) return res.status(400).json({ error: 'URL is required' })

  let targetUrl = url.trim()
  if (!targetUrl.startsWith('http')) targetUrl = `https://${targetUrl}`

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AsburySocialBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    })

    const html = await response.text()

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : null

    const metas = []
    const metaRegex = /<meta\s([^>]+?)(?:\s*\/?>)/gi
    let match
    while ((match = metaRegex.exec(html)) !== null) {
      const attrStr = match[1]
      const attrs = {}
      const attrRegex = /(\w[\w-]*)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g
      let a
      while ((a = attrRegex.exec(attrStr)) !== null) {
        if (a[1] && a[1] !== 'meta') attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? ''
      }
      if (attrs.content !== undefined || attrs.name || attrs.property) metas.push(attrs)
    }

    const jsonLdBlocks = []
    const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    while ((match = jsonLdRegex.exec(html)) !== null) {
      try { jsonLdBlocks.push(JSON.parse(match[1].trim())) } catch {}
    }

    return res.status(200).json({ title, metas, jsonLdBlocks, finalUrl: response.url, statusCode: response.status })
  } catch (err) {
    const msg = err.name === 'TimeoutError' ? 'Request timed out (10s)' : err.message
    return res.status(500).json({ error: msg })
  }
}
