import assert from 'node:assert/strict'
import test from 'node:test'
import { answerChat } from './chatService.js'
import { SACHET_ALERTS_API_URL, SachetSourceError } from './sources/sachet.js'

const alert = {
  id: 'IN-12345_1',
  alertId: 'IN-12345_1',
  type: 'Heavy Rain',
  disasterType: 'Heavy Rain',
  severity: 'HIGH',
  title: 'Heavy rain warning for Mumbai',
  description: 'Heavy rainfall may occur in Mumbai district.',
  state: 'Maharashtra',
  district: 'Mumbai',
  city: '',
  source: 'Maharashtra SDMA',
  source_url: 'https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=12345',
  sourceUrl: 'https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=12345',
  issued_at: '2026-11-12T10:00:00+05:30',
  timestamp: '2026-11-12T10:00:00+05:30',
  expires_at: '2026-11-13T10:00:00+05:30',
  verification_status: 'Verified',
  verificationStatus: 'Verified',
  safetyInstructions: ['Follow local authority instructions.'],
}

function getFeed(alerts = [alert], status = 'connected') {
  return async () => ({ alerts, status, warning: '' })
}

test('answers active-alert questions from live feed records and includes source links', async () => {
  const result = await answerChat({ message: 'What alerts are active?', language: 'en' }, { getFeed: getFeed() })

  assert.match(result.reply, /1 current, unexpired public CAP alert/)
  assert.match(result.reply, /Heavy rain warning for Mumbai/)
  assert.match(result.reply, /2026-11-12T10:00:00\+05:30/)
  assert.deepEqual(result.sources, [{
    name: 'Maharashtra SDMA',
    url: alert.sourceUrl,
    timestamp: alert.timestamp,
  }])
})

test('maps localized quick prompts to the same live alert query', async () => {
  const result = await answerChat({ message: 'अभी कौन से अलर्ट सक्रिय हैं?', language: 'auto' }, { getFeed: getFeed() })

  assert.match(result.reply, /Heavy rain warning for Mumbai/)
  assert.equal(result.sources[0].url, alert.sourceUrl)
})

test('answers specific alert questions with CAP details and source instructions', async () => {
  const result = await answerChat({
    message: 'Explain this alert',
    alertId: alert.alertId,
  }, { getFeed: getFeed() })

  assert.match(result.reply, /Severity: HIGH/)
  assert.match(result.reply, /Instructions in the official record:\n• Follow local authority instructions\./)
  assert.equal(result.sources[0].url, alert.sourceUrl)
})

test('location searches distinguish no matching alert from no risk', async () => {
  const result = await answerChat({ message: 'Show alerts near Delhi' }, { getFeed: getFeed() })

  assert.match(result.reply, /couldn't find a current SACHET\/NDMA CAP alert matching Delhi/)
  assert.match(result.reply, /does not confirm that the area is safe/)
})

test('marks answers based on cached feed snapshots as stale', async () => {
  const result = await answerChat({ message: 'How severe is the current alert?' }, {
    getFeed: async () => ({ alerts: [alert], status: 'stale' }),
  })

  assert.match(result.reply, /highest listed CAP severity is HIGH/)
  assert.match(result.reply, /using a cached snapshot/)
})

test('returns a clear response when the live alert feed is unavailable', async () => {
  const result = await answerChat({ message: 'What alerts are active?' }, {
    getFeed: async () => { throw new SachetSourceError('SACHET unavailable', { status: 503, url: SACHET_ALERTS_API_URL }) },
  })

  assert.match(result.reply, /can't retrieve the live SACHET\/NDMA alert feed/)
  assert.equal(result.sources[0].url, 'https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml')
})
