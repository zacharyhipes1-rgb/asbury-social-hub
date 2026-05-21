// PDF proxy — fetches a Cloudinary raw PDF server-side and re-serves it with
// proper Content-Type/CORS headers so Chrome's PDF viewer can render it.
// Only allows URLs from res.cloudinary.com to prevent open-proxy abuse.

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { url, name, dl } = req.query

  // Security: only proxy Cloudinary URLs
  if (
    !url ||
    typeof url !== 'string' ||
    !url.startsWith('https://res.cloudinary.com/')
  ) {
    return res.status(400).json({ error: 'Only Cloudinary URLs are allowed.' })
  }

  try {
    const upstream = await fetch(url, {
      signal: AbortSignal.timeout(20_000),
    })

    if (!upstream.ok) {
      console.error('[pdf-proxy] upstream error:', upstream.status, url)
      return res.status(upstream.status).end()
    }

    const buffer = await upstream.arrayBuffer()

    // Disposition: inline for preview, attachment for download
    const filename = name || url.split('/').pop() || 'document.pdf'
    const disposition =
      dl === '1'
        ? `attachment; filename="${filename.replace(/"/g, '')}"`
        : 'inline'

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', disposition)
    res.setHeader('Content-Length', buffer.byteLength)
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.status(200).send(Buffer.from(buffer))
  } catch (err) {
    console.error('[pdf-proxy] error:', err.message)
    res.status(502).json({ error: 'Failed to fetch PDF.' })
  }
}
