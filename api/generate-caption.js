// Required Vercel env var: ANTHROPIC_API_KEY
// Set in: Vercel Dashboard → Project Settings → Environment Variables

const PLATFORM_RULES = {
  instagram: {
    name: 'Instagram',
    charLimit: 2200,
    softLimit: 125,
    guidance: 'Hook in the first 125 chars (visible before "more"). Conversational, emoji-forward, storytelling tone. End with a CTA. Use line breaks for readability.',
    hashtagNote: 'Include 8–15 highly relevant hashtags. Mix broad (#Honda) with local (#CollegeParkGA) and niche (#HondaCRV).',
  },
  facebook: {
    name: 'Facebook',
    charLimit: 63206,
    softLimit: 480,
    guidance: 'Conversational and community-focused. Under 480 chars avoids "See More" truncation in feed. Can tell a story. Emojis optional but effective. CTAs like "Stop by today" work well.',
    hashtagNote: 'Use 2–5 hashtags max. Facebook deprioritizes hashtag-heavy posts.',
  },
  tiktok: {
    name: 'TikTok',
    charLimit: 2200,
    softLimit: 150,
    guidance: 'Punchy, under 150 chars. Hook must be in the first line. Trending language, Gen Z-friendly tone. Use "POV:", "Tell me you...", or action-driving openers. Authenticity over polish.',
    hashtagNote: 'Include 3–5 hashtags. Mix trending (#CarTok #DealerLife) with relevant specific tags.',
  },
  linkedin: {
    name: 'LinkedIn',
    charLimit: 3000,
    softLimit: 700,
    guidance: 'Professional but warm. Lead with insight or a surprising fact. 700+ chars can perform well. Use short paragraphs. Avoid excessive emojis. Focus on team, values, or industry context.',
    hashtagNote: 'Use 3–5 professional hashtags like #AutomotiveIndustry #CustomerExperience.',
  },
  x: {
    name: 'X (Twitter)',
    charLimit: 280,
    softLimit: 240,
    guidance: 'Under 280 chars total including any link. Punchy, opinionated, or timely. Threads work for longer stories. Hook immediately.',
    hashtagNote: 'Max 2 hashtags. Keep it tight.',
  },
}

const CONTENT_TYPE_CONTEXT = {
  reel:            'a short-form vertical video (Reel)',
  video:           'a video post',
  single_image:    'a single image post',
  carousel:        'a multi-image carousel post',
  stories:         'an Instagram Story (ephemeral, 24-hour)',
  text_post:       'a text-only post (no image)',
  text_caption:    'a text-based caption',
  text_update:     'a quick text update',
  event_promotion: 'an event promotion post',
  trending_sounds: 'a TikTok video using trending audio',
}

const TIMEZONE_FOR_DEALERSHIP = {
  GA: 'Eastern',
  FL: 'Eastern',
  OH: 'Eastern',
  TX: 'Central',
  MO: 'Central',
  AZ: 'Mountain',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'Caption AI is not configured. Add ANTHROPIC_API_KEY in Vercel → Project Settings → Environment Variables.',
    })
  }

  const body = req.body || {}
  const dealershipName     = String(body.dealershipName     || 'Asbury Automotive dealership').slice(0, 100)
  const dealershipLocation = String(body.dealershipLocation || '').slice(0, 100)
  const dealershipBrand    = String(body.dealershipBrand    || 'automotive').slice(0, 50)
  const platformId         = String(body.platform           || 'instagram').slice(0, 30)
  const contentTypeId      = String(body.contentType        || '').slice(0, 50)
  const altText            = String(body.altText            || '').slice(0, 300)
  const contentPillar      = String(body.contentPillar      || '').slice(0, 50)
  const postingReason      = String(body.postingReason      || '').slice(0, 100)
  const context            = String(body.context            || '').slice(0, 600)

  const platform    = PLATFORM_RULES[platformId] || PLATFORM_RULES.instagram
  const contentDesc = CONTENT_TYPE_CONTEXT[contentTypeId] || 'social media post'
  const stateCode   = dealershipLocation.match(/,\s*([A-Z]{2})$/)?.[1] || ''
  const timezone    = TIMEZONE_FOR_DEALERSHIP[stateCode] || 'local'

  const prompt = `You are an expert automotive social media copywriter. Write 3 distinct, publish-ready caption options for the following post.

DEALERSHIP CONTEXT:
- Name: ${dealershipName}
- Location: ${dealershipLocation || 'USA'} (${timezone} time)
- Brand: ${dealershipBrand}

POST DETAILS:
- Platform: ${platform.name}
- Format: ${contentDesc}
${contentPillar ? `- Content pillar: ${contentPillar}` : ''}
${postingReason ? `- Goal: ${postingReason}` : ''}
${altText ? `- Image/video shows: ${altText}` : ''}
${context ? `- Additional context from uploader: ${context}` : ''}

PLATFORM REQUIREMENTS for ${platform.name}:
- Character guidance: ${platform.guidance}
- Hashtag strategy: ${platform.hashtagNote}
- Soft limit: ${platform.softLimit} chars (hard max: ${platform.charLimit})

CAPTION QUALITY RULES:
1. Each caption must be DISTINCTLY different in angle/tone (not just paraphrased)
2. Option 1: Emotional / community-focused angle
3. Option 2: Offer / urgency / value-driven angle
4. Option 3: Storytelling or curiosity hook angle
5. Every caption ends with a clear CTA relevant to a dealership (visit us, DM, book a test drive, etc.)
6. Do NOT use generic filler phrases like "At [dealership], we..." or "Come see us!"
7. Include location-specific references where natural (e.g., "${dealershipLocation}")
8. Hashtags go at the END of each caption, separated by a line break

Return ONLY a valid JSON array of exactly 3 strings. No markdown, no explanation, no extra text.
Each string is the complete caption including hashtags.
Example: ["Caption one...\\n\\n#tag1 #tag2", "Caption two...", "Caption three..."]`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':          process.env.ANTHROPIC_API_KEY,
        'anthropic-version':  '2023-06-01',
        'content-type':       'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5',
        max_tokens: 1200,
        messages:   [{ role: 'user', content: prompt }],
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
    return res.status(500).json({ error: 'Caption generation failed. Please try again.' })
  }
}
