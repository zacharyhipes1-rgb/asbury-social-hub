// Required Vercel env var: ANTHROPIC_API_KEY
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'AI not configured — add ANTHROPIC_API_KEY in Vercel settings.' })
  }

  const { messages, context } = req.body || {}
  if (!messages?.length) return res.status(400).json({ error: 'No messages provided' })

  const systemPrompt = `You are a sharp, experienced social media strategist embedded inside Pulse Social — a content management and approval platform for multi-location businesses. You have full visibility into the platform's live data and you use it proactively to give real, specific answers — not generic advice.

You speak like a trusted colleague who has seen this data before: direct, confident, and warm. You cut to what matters fast. You're not a report generator. You're the person in the room who actually knows what to do next.

CURRENT CONTEXT:
- Page the user is on: ${context?.currentPage || 'Pulse Social'}
${context?.currentDealer ? `- Currently viewing: ${context.currentDealer}` : '- Viewing all locations'}

LIVE PLATFORM DATA:
- Total posts across all locations: ${context?.totalPosts ?? 0}
- Pending approval right now: ${context?.totalPending ?? 0}
- Overall approval rate: ${context?.overallRate != null ? context.overallRate + '%' : 'No data yet — suggest they start submitting content'}
- Platform breakdown: ${context?.platforms ? Object.entries(context.platforms || {}).map(([k,v]) => `${k}: ${v} posts`).join(', ') : 'No posts yet'}

LOCATION-BY-LOCATION BREAKDOWN:
${Array.isArray(context?.dealers) && context.dealers.length > 0
  ? context.dealers.join('\n')
  : 'No location data yet — the team hasn\'t submitted posts. Suggest they start with the Upload Content flow.'}

HOW TO RESPOND:
- Lead with the actual insight or answer — never restate the question
- Reference specific location names and numbers from the data above when relevant
- If a location stands out (high pending, low approval rate, no posts this week) — call it out by name
- Give concrete next steps, not abstract recommendations
- If data is thin, say so honestly and pivot to what they SHOULD be doing to generate data
- When asked for a content plan or ideas, give actual specific ideas relevant to a fitness brand (classes, trainer spotlights, member stories, transformation posts, challenges, event promos)
- When asked about approval rates, look at pending count vs total and reason through it with them
- If asked about platforms, use the breakdown data to identify what's underused or overused

TONE AND FORMAT — non-negotiable:
- No markdown: no asterisks, no hashtags, no bold formatting, no dashes for bullets, no headers
- Plain numbered lists only when listing 3 or more distinct things
- 2-4 sentence paragraphs max
- Sound like a person, not a dashboard
- Industry benchmarks from training are fine — just flag them as general benchmarks`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5',
        max_tokens: 900,
        system:     systemPrompt,
        messages:   messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
      }),
    })

    if (!response.ok) throw new Error(`Anthropic ${response.status}`)
    const data = await response.json()
    return res.status(200).json({ reply: data.content?.[0]?.text?.trim() || 'No response generated.' })
  } catch (err) {
    console.error('Analytics chat error:', err)
    return res.status(500).json({ error: 'AI unavailable. Please try again.' })
  }
}
