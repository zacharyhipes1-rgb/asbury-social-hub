// Required Vercel env var: STABILITY_API_KEY
// Get your key at: platform.stability.ai → API Keys
// Cost: ~$0.03 per image (Stable Image Core model)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!process.env.STABILITY_API_KEY) {
    return res.status(500).json({
      error: 'Image generation not configured — add STABILITY_API_KEY in Vercel → Project Settings → Environment Variables.',
    })
  }

  const {
    prompt,
    negativePrompt = '',
    aspectRatio    = '1:1',
    style          = 'photographic',
  } = req.body || {}

  if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt is required.' })

  // Enhance prompt for automotive social media context
  const enhancedPrompt = `${prompt.trim()}, professional automotive marketing photography, high quality, sharp focus, well-lit, social media ready`
  const enhancedNegative = `${negativePrompt} blurry, low quality, watermark, text overlay, logo, distorted, ugly, bad anatomy, amateur`

  try {
    const form = new FormData()
    form.append('prompt',          enhancedPrompt)
    form.append('negative_prompt', enhancedNegative)
    form.append('aspect_ratio',    aspectRatio)
    form.append('output_format',   'jpeg')
    form.append('style_preset',    style)

    const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
      method:  'POST',
      headers: {
        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        Accept:        'image/*',
      },
      body: form,
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Stability AI error:', response.status, errText)
      if (response.status === 402) return res.status(402).json({ error: 'Stability AI credits exhausted. Top up at platform.stability.ai.' })
      if (response.status === 403) return res.status(403).json({ error: 'Invalid Stability API key. Check STABILITY_API_KEY in Vercel settings.' })
      throw new Error(`Stability AI ${response.status}: ${errText.slice(0, 200)}`)
    }

    // Return image as base64 data URL so the client can preview + upload to Cloudinary
    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    return res.status(200).json({
      dataUrl:     `data:image/jpeg;base64,${base64}`,
      aspectRatio,
    })
  } catch (err) {
    console.error('Image generation error:', err)
    return res.status(500).json({ error: err.message || 'Image generation failed. Please try again.' })
  }
}
