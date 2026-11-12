import assert from 'node:assert/strict'
import test from 'node:test'
import { createSachetAlertCache } from '../sachetAlertCache.js'
import {
  SACHET_ALERTS_API_URL,
  SACHET_RSS_URL,
  fetchSachetAlerts,
  SachetSourceError,
} from './sachet.js'

const now = Date.parse('2026-01-01T00:00:00.000Z')

function alertRecord(identifier) {
  return {
    identifier,
    area_description: 'Mumbai City',
    centroid: '72.8777,19.0760',
    disaster_type: 'Heavy Rain',
    alert_source: 'Example SDMA',
    warning_message: 'Official rainfall warning.',
  }
}

function capXml(identifier, expires, severity = 'Severe') {
  return `<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
    <identifier>${identifier}</identifier><sent>2025-12-31T23:00:00Z</sent>
    <status>Actual</status><msgType>Alert</msgType><scope>Public</scope>
    <info><language>en-IN</language><category>Met</category><event>Heavy Rain</event>
      <severity>${severity}</severity><headline>Heavy rain warning</headline>
      <description>Official rainfall warning.</description><expires>${expires}</expires>
      <area><areaDesc>Mumbai City</areaDesc></area><instruction>Follow local authority guidance.</instruction>
    </info>
  </alert>`
}

function mockFetch({ records = [alertRecord('active-1')], capRecords, apiStatus = 200 } = {}) {
  const rss = `<rss version="2.0"><channel>${records.map((record) => `<item><guid>${record.identifier}</guid><link>https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=${record.identifier}</link></item>`).join('')}</channel></rss>`
  const caps = capRecords || new Map([['active-1', capXml('active-1', '2026-01-02T00:00:00Z')]])
  return async (url) => {
    const parsedUrl = new URL(url)
    if (parsedUrl.href === SACHET_ALERTS_API_URL) {
      return apiStatus === 200
        ? { ok: true, status: 200, text: async () => JSON.stringify(records) }
        : { ok: false, status: apiStatus, text: async () => '' }
    }
    if (parsedUrl.href === SACHET_RSS_URL) return { ok: true, status: 200, text: async () => rss }
    const identifier = parsedUrl.searchParams.get('identifier')
    return { ok: true, status: 200, text: async () => caps.get(identifier) }
  }
}

test('normalizes official CAP alerts and excludes expired records', async () => {
  const records = [alertRecord('active-1'), alertRecord('expired-1')]
  const fetchImpl = mockFetch({
    records,
    capRecords: new Map([
      ['active-1', capXml('active-1', '2026-01-02T00:00:00Z')],
      ['expired-1', capXml('expired-1', '2025-12-31T23:59:59Z')],
    ]),
  })

  const alerts = await fetchSachetAlerts({ fetchImpl, now: () => now, maxAttempts: 1 })

  assert.equal(alerts.length, 1)
  assert.equal(alerts[0].alertId, 'active-1')
  assert.equal(alerts[0].severity, 'HIGH')
  assert.equal(alerts[0].verificationStatus, 'Verified')
  assert.equal(alerts[0].timestamp, '2025-12-31T23:00:00Z')
  assert.equal(alerts[0].sourceUrl, 'https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=active-1')
  assert.equal(alerts[0].latitude, 19.076)
  assert.equal(alerts[0].longitude, 72.8777)
  assert.equal(alerts[0].safetyInstructions[0], 'Follow local authority guidance.')
})

test('maps CAP Unknown severity without assigning another level', async () => {
  const fetchImpl = mockFetch({
    capRecords: new Map([['active-1', capXml('active-1', '2026-01-02T00:00:00Z', 'Unknown')]]),
  })

  const [alert] = await fetchSachetAlerts({ fetchImpl, now: () => now, maxAttempts: 1 })

  assert.equal(alert.severity, 'UNKNOWN')
})

test('preserves the last official snapshot when a refresh fails', async () => {
  let time = now
  let calls = 0
  const cache = createSachetAlertCache({
    ttlMs: 100,
    now: () => time,
    fetchAlerts: async () => {
      calls += 1
      if (calls > 1) throw new SachetSourceError('SACHET unavailable', { status: 503, url: SACHET_ALERTS_API_URL })
      return [{
        alertId: 'active-1',
        issued_at: '2025-12-31T23:00:00Z',
        expires_at: '2026-01-02T00:00:00Z',
      }]
    },
    onError: () => {},
  })

  assert.equal((await cache.get()).status, 'connected')
  time += 101
  const stale = await cache.get()

  assert.equal(stale.status, 'stale')
  assert.equal(stale.alerts.length, 1)
  assert.match(stale.warning, /last successful feed snapshot/)
  assert.equal((await cache.get()).status, 'stale')
  assert.equal(calls, 2)
})

test('reports upstream status and exact URL after retries', async () => {
  let attempts = 0
  const failingFetch = mockFetch({ apiStatus: 503 })
  await assert.rejects(() => fetchSachetAlerts({
    fetchImpl: async (url) => {
      if (new URL(url).href === SACHET_ALERTS_API_URL) attempts += 1
      return failingFetch(url)
    },
    maxAttempts: 2,
    retryBaseMs: 1,
    sleep: async () => {},
  }), (error) => {
    assert.ok(error instanceof SachetSourceError)
    assert.equal(error.status, 503)
    assert.equal(error.url, SACHET_ALERTS_API_URL)
    return true
  })
  assert.equal(attempts, 2)
})
