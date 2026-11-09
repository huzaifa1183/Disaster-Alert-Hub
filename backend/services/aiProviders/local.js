export async function generateLocal({ messages }) {
  const endpoint = process.env.AI_BASE_URL || 'http://localhost:11434/api/chat'
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.AI_MODEL || 'llama3.2', messages, stream: false }),
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) throw new Error(`Local model returned ${response.status}`)
  const payload = await response.json()
  return payload.message?.content?.trim() || ''
}