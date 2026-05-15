// Required Vercel env var: ANTHROPIC_API_KEY
// Set this in Vercel Dashboard → Project Settings → Environment Variables

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { dealership, platform, contentType, context } = req.body || {}

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Caption AI is not configured. Add ANTHROPIC_API_KEY in Vercel settings.' })
  }

  const prompt = `You are a social media copywriter for an automotive dealership.

Dealership: ${dealership || 'an Asbury Automotive dealership'}
Platform: ${platform || 'Instagram'}
Content format: ${contentType || 'promotional post'}
Context from the uploader: ${context || '(no additional context provided)'}

Write exactly 3 caption options for this post. Each option should:
- Feel native to ${platform}
- Be direct and compelling for a car dealership audience
- End with a clear call to action
- Stay under 150 words

Return ONLY a valid JSON array of 3 strings. No explanation, no markdown, no extra text. Example format:
["Caption one here.", "Caption two here.", "Caption three here."]`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic error:', response.status, errText)
      throw new Error(`Anthropic API returned ${response.status}`)
    }

    const data = await response.json()
    const text = data.content?.[0]?.text?.trim() || '[]'

    let captions
    try {
      captions = JSON.parse(text)
    } catch {
      const match = text.match(/\[[\s\S]*\]/)
      captions = match ? JSON.parse(match[0]) : []
    }

    if (!Array.isArray(captions)) captions = []

    return res.status(200).json({ captions: captions.slice(0, 3) })
  } catch (err) {
    console.error('Caption generation error:', err)
    return res.status(500).json({ error: 'Failed to generate captions. Please try again.' })
  }
}
