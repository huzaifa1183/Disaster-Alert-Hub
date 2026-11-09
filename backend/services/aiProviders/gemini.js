export async function generateGemini({ messages }) {
  const model = process.env.AI_MODEL || 'gemini-2.0-flash'
  const contents = messages.filter((item) => item.role !== 'system').map((item) => ({ role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: item.content }] }))
  const systemInstruction = messages.find((item) => item.role === 'system')?.content
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.AI_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: systemInstruction || '' }] }, contents, generationConfig: { temperature: 0.2, maxOutputTokens: 350 } }),
    signal: AbortSignal.timeout(12000),
  })
  if (!response.ok) throw new Error(`Gemini provider returned ${response.status}`)
  const payload = await response.json()
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || ''
}