export async function answerChat({ language = 'en' } = {}) {
  if (process.env.USE_MOCK_DATA === 'true') {
    const { answerChat: answerMockChat } = await import('../../mock/chatService.js')
    return answerMockChat({ language })
  }

  return {
    reply: 'This assistant does not access or summarize the live SACHET/NDMA alert feed. Check the alert register and linked official records for current alerts, and follow government warnings in an emergency.',
    timestamp: new Date().toISOString(),
    sources: [],
    language: language === 'auto' ? 'en' : language,
  }
}
