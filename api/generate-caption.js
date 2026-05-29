// Required Vercel env var: ANTHROPIC_API_KEY
// Set in: Vercel Dashboard → Project Settings → Environment Variables

const PLATFORM_RULES = {
  instagram: {
    name: 'Instagram',
    softLimit: 125,
    guidance: 'Hook in the first 125 chars (visible before "more"). Conversational, emoji-forward tone. Strong opening line that stops the scroll. End with a CTA.',
    hashtagNote: 'Include 8–15 hashtags. Mix broad (#Honda) with local (#CollegeParkGA) and niche (#HondaCRV). Separate from caption with a line break.',
  },
  facebook: {
    name: 'Facebook',
    softLimit: 480,
    guidance: 'Conversational and community-focused. Under 480 chars avoids "See More" truncation. Tell a short story or share a value. CTAs like "Stop by today" work well.',
    hashtagNote: 'Use 2–5 hashtags max. Facebook deprioritizes hashtag-heavy posts.',
  },
  tiktok: {
    name: 'TikTok',
    softLimit: 150,
    guidance: 'Punchy, under 150 chars. First line is the hook — it appears on screen. Use trending language and action-driving openers (POV:, Tell me you...). Authenticity over polish.',
    hashtagNote: 'Include 3–5 hashtags. Mix trending (#CarTok #DealerLife) with specific relevant tags.',
  },
  linkedin: {
    name: 'LinkedIn',
    softLimit: 700,
    guidance: 'Professional but warm. Lead with an insight or human moment. Short paragraphs. Avoid excessive emojis. Focus on team, values, or industry angle.',
    hashtagNote: 'Use 3–5 professional hashtags like #AutomotiveIndustry #CustomerExperience.',
  },
  x: {
    name: 'X (Twitter)',
    softLimit: 240,
    guidance: 'Under 280 chars total. Punchy and opinionated. Hook immediately.',
    hashtagNote: 'Max 2 hashtags.',
  },
}

const CONTENT_TYPE_CONTEXT = {
  reel:            'a short-form vertical video Reel',
  video:           'a video post',
  single_image:    'a single image post',
  carousel:        'a multi-image carousel post',
  stories:         'an Instagram Story (24-hour ephemeral)',
  text_post:       'a text-only post',
  text_caption:    'a text caption post',
  text_update:     'a quick text update',
  event_promotion: 'an event promotion post',
  trending_sounds: 'a TikTok with trending audio',
}

// Derive a full-size Cloudinary poster frame for videos so Claude can see it
function getVisionUrl(fileUrl, fileType) {
  if (!fileUrl || !fileUrl.includes('/upload/')) return null
  if (fileType?.startsWith('image/')) return fileUrl  // original image
  if (fileType?.startsWith('video/')) {
    // Get a poster frame at 2s, large enough for good analysis
    return fileUrl
      .replace('/upload/', '/upload/so_2.0,w_1280,c_limit/')
      .replace(/\.(mp4|mov|webm|avi|mkv)$/i, '.jpg')
  }
  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'Caption AI not configured — add ANTHROPIC_API_KEY in Vercel → Project Settings → Environment Variables.',
    })
  }

  const body = req.body || {}
  const dealershipName     = String(body.dealershipName     || 'Asbury Automotive dealership').slice(0, 100)
  const dealershipLocation = String(body.dealershipLocation || '').slice(0, 100)
  const dealershipBrand    = String(body.dealershipBrand    || 'automotive').slice(0, 50)
  const platformId         = String(body.platform           || 'instagram').slice(0, 30)
  const contentTypeId      = String(body.contentType        || '').slice(0, 50)
  const fileUrl            = String(body.fileUrl            || '').slice(0, 500)
  const fileType           = String(body.fileType           || '').slice(0, 100)
  const altText            = String(body.altText            || '').slice(0, 300)
  const contentPillar      = String(body.contentPillar      || '').slice(0, 50)
  const postingReason      = String(body.postingReason      || '').slice(0, 100)
  const context            = String(body.context            || '').slice(0, 600)

  const platform    = PLATFORM_RULES[platformId] || PLATFORM_RULES.instagram
  const contentDesc = CONTENT_TYPE_CONTEXT[contentTypeId] || 'social media post'
  const visionUrl   = getVisionUrl(fileUrl, fileType)
  const hasVision   = !!visionUrl

  const textPrompt = `You are an expert automotive social media copywriter.
${hasVision
  ? `You have been shown the actual image/video content above. Base the captions on what you literally see in it — specific details, visual elements, setting, vehicles, people, mood, action. Do NOT invent things that are not visible.`
  : altText
    ? `You do not have the image, but the uploader described it as: "${altText}". Base captions on this description.`
    : `No image was provided. Write general captions appropriate to the dealership and platform.`
}

DEALERSHIP:
- Name: ${dealershipName}
- Location: ${dealershipLocation || 'USA'}
- Brand: ${dealershipBrand}

POST DETAILS:
- Platform: ${platform.name}
- Format: ${contentDesc}
${contentPillar ? `- Content pillar: ${contentPillar}` : ''}
${postingReason ? `- Goal: ${postingReason}` : ''}
${context ? `- Extra context from uploader: ${context}` : ''}

PLATFORM RULES for ${platform.name}:
- ${platform.guidance}
- Hashtags: ${platform.hashtagNote}
- Soft character limit: ${platform.softLimit} chars

WRITE 3 DISTINCT CAPTIONS:
1. Emotional / community angle — focus on feeling, story, or local connection
2. Offer / value angle — highlight the deal, urgency, or vehicle benefit
3. Curiosity / hook angle — open loop, surprising fact, or bold statement

Rules:
- Base captions on what is actually shown in the content, not generic dealership filler
- Each ends with a specific CTA (book a test drive, DM us, visit this weekend, etc.)
- Hashtags go at the END separated by a blank line
- Do NOT use "At ${dealershipName}, we..." openings
- Make each option distinctly different in angle and tone

Return ONLY a valid JSON array of exactly 3 strings. No markdown, no explanation.
Each string is the complete caption including hashtags.
Example: ["Caption...\\n\\n#tag1 #tag2", "Caption two...", "Caption three..."]`

  try {
    // Build the message — vision if we have an image/poster URL, text-only otherwise
    const userMessage = hasVision
      ? {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: visionUrl },
            },
            { type: 'text', text: textPrompt },
          ],
        }
      : { role: 'user', content: textPrompt }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-opus-4-5',  // vision-capable model
        max_tokens: 1200,
        messages:   [userMessage],
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
    return res.status(200).json({
      captions: captions.slice(0, 3),
      visionUsed: hasVision,
    })
  } catch (err) {
    console.error('Caption generation error:', err)
    return res.status(500).json({ error: 'Caption generation failed. Please try again.' })
  }
}
