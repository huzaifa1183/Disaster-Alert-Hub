export async function generateOpenAI({ messages }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.AI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.AI_MODEL || 'gpt-4o-mini', messages, temperature: 0.2, max_tokens: 350 }),
    signal: AbortSignal.timeout(12000),
  })
  if (!response.ok) throw new Error(`OpenAI provider returned ${response.status}`)
  const payload = await response.json()
  return payload.choices?.[0]?.message?.content?.trim() || ''
}