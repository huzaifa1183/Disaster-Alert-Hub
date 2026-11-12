export async function answerChat({ language = 'en' } = {}) {
  if (process.env.USE_MOCK_DATA === 'true') {
    const { answerChat: answerMockChat } = await import('../../mock/chatService.js')
    return answerMockChat({ language })
  }

  return {
    reply: 'No official alert feed is connected. Live alert and weather information is unavailable.',
    timestamp: new Date().toISOString(),
    sources: [],
    language: language === 'auto' ? 'en' : language,
  }
}
