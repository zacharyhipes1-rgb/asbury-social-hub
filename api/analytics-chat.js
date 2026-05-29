// Required Vercel env var: ANTHROPIC_API_KEY
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'AI not configured — add ANTHROPIC_API_KEY in Vercel settings.' })
  }

  const { messages, context } = req.body || {}
  if (!messages?.length) return res.status(400).json({ error: 'No messages provided' })

  const systemPrompt = `You are a friendly, sharp social media advisor for Asbury Automotive's dealership group. You speak like a knowledgeable colleague — warm, direct, and practical. No corporate fluff.

CURRENT PAGE: ${context?.currentPage || 'Asbury Social Hub'}
${context?.currentDealer ? `CURRENTLY VIEWING: ${context.currentDealer}` : ''}

PLATFORM DATA:
- Total posts across all dealerships: ${context?.totalPosts ?? 0}
- Pending approval: ${context?.totalPending ?? 0}
- Overall approval rate: ${context?.overallRate != null ? context.overallRate + '%' : 'No data yet'}
- Platform breakdown: ${context?.platforms ? Object.entries(context.platforms || {}).map(([k,v]) => `${k}: ${v}`).join(', ') : 'No data'}

DEALERSHIP BREAKDOWN:
${Array.isArray(context?.dealers) ? context.dealers.join('\n') : 'No dealership data yet'}

TONE AND FORMAT RULES — follow these strictly:
- Write like a smart human colleague, not a report generator
- No markdown whatsoever: no asterisks, no hashtags, no bold, no bullet dashes, no headers
- Use plain numbered lists only when genuinely listing 3+ things
- Short paragraphs — 2-4 sentences max each
- Get to the point fast — don't restate what was asked
- If data is thin or sample-only, say so plainly and still give useful direction
- Industry benchmarks come from your training — always say so if you cite them
- When the user is viewing a specific dealership and asks a general question, assume they mean that dealership
- If asked about a dealership with no data, acknowledge it and suggest what to do first`

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
        max_tokens: 800,
        system:     systemPrompt,
        messages:   messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
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
