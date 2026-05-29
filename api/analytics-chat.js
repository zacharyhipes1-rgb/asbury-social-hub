// Required Vercel env var: ANTHROPIC_API_KEY
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'AI not configured — add ANTHROPIC_API_KEY in Vercel settings.' })
  }

  const { messages, context } = req.body || {}
  if (!messages?.length) return res.status(400).json({ error: 'No messages provided' })

  const systemPrompt = `You are an expert social media analytics advisor for automotive dealerships. You have deep knowledge of social media marketing for car dealerships, industry benchmarks, and content strategy.

You are analyzing data for ${context?.dealershipName || 'a dealership'} (${context?.location || ''}, ${context?.brand || ''} dealership).

CURRENT ANALYTICS DATA:
- Total posts submitted: ${context?.total ?? 0}
- Published posts: ${context?.published ?? 0}
- Pending review: ${context?.pending ?? 0}
- Flagged/revision requested: ${context?.flagged ?? 0}
- Approval rate: ${context?.approvalRate != null ? context.approvalRate + '%' : 'No data'}
- Avg. review time: ${context?.avgReviewHrs != null ? (context.avgReviewHrs < 24 ? context.avgReviewHrs + ' hours' : Math.round(context.avgReviewHrs / 24) + ' days') : 'No data'}
- Posts this week: ${context?.thisWeek ?? 0}
- Platform mix: ${context?.platformMix ? JSON.stringify(context.platformMix) : 'No data'}
- Est. impressions: ${context?.impressions ?? 'Sample data only'}
- Est. reach: ${context?.reach ?? 'Sample data only'}
- Est. engagement rate: ${context?.engRate ?? 'Sample data only'}
- Est. clicks: ${context?.clicks ?? 'Sample data only'}
- Content pillars used: ${context?.pillars?.join(', ') || 'Not tracked'}
- Date range: ${context?.range || '30 days'}

IMPORTANT GUIDELINES:
- Be direct and specific — give actionable recommendations, not vague advice
- When you cite industry benchmarks, clearly state they are industry averages based on your training data (not live data)
- If you don't know something with confidence, say so
- Keep responses concise — 3–5 short paragraphs max unless the user asks for more detail
- Focus on what they can actually do tomorrow to improve, not theoretical advice
- Note: engagement data shown is estimated/sample data — actual platform analytics require direct API connections`

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
