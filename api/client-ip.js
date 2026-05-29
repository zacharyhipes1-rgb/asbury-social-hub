// Returns the caller's IP address from Vercel/edge request headers.
// Used by AuthContext to gate session restore to the original login IP.
export default function handler(req, res) {
  const forwarded = req.headers['x-forwarded-for']
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : req.socket?.remoteAddress || 'unknown'
  res.status(200).json({ ip })
}
