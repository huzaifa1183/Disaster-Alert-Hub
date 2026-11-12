import assert from 'node:assert/strict'
import test from 'node:test'
import { weatherLocations } from '../../config/weatherLocations.js'
import { normalizedAlertSchema } from '../../schemas/normalized.js'
import { buildOpenMeteoUrl, fetchOpenMeteoRaw, fetchOpenMeteoWeather, normalizeOpenMeteoResponse } from './openMeteo.js'

const location = weatherLocations.find((item) => item.id === 'mumbai')
const sourceUrl = buildOpenMeteoUrl(location).toString()

function sampleResponse() {
  return {
    timezone: 'Asia/Kolkata',
    current: {
      time: '2026-11-12T17:30',
      temperature_2m: 29.4,
      relative_humidity_2m: 73,
      precipitation: 0.4,
      wind_speed_10m: 14.2,
      weather_code: 61,
    },
  }
}

test('requests only the required current fields and Indian timezone', () => {
  const url = buildOpenMeteoUrl(location)
  assert.equal(url.origin + url.pathname, 'https://api.open-meteo.com/v1/forecast')
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code',
    timezone: 'Asia/Kolkata',
  })
})

test('normalizes the returned current values and preserves the API timestamp', () => {
  const weather = normalizeOpenMeteoResponse(sampleResponse(), location, sourceUrl)

  assert.equal(weather.location.city, 'Mumbai')
  assert.equal(weather.current.temperatureC, 29.4)
  assert.equal(weather.current.condition, 'Slight rain')
  assert.equal(weather.current.time, sampleResponse().current.time)
  assert.equal(weather.current.windSpeedKmh, 14.2)
  assert.equal(weather.sourceUrl, sourceUrl)
  assert.equal(weather.source, 'Open-Meteo')
})

test('rejects malformed upstream current data', () => {
  const response = sampleResponse()
  delete response.current.wind_speed_10m

  assert.throws(() => normalizeOpenMeteoResponse(response, location, sourceUrl))
})

test('fetches through the adapter and retries a transient upstream response with backoff', async () => {
  const delays = []
  const requestedUrls = []
  let attempts = 0
  const weather = await fetchOpenMeteoWeather(location, {
    fetchImpl: async (url) => {
      requestedUrls.push(new URL(url))
      attempts += 1
      return attempts === 1
        ? { ok: false, status: 503 }
        : { ok: true, status: 200, json: async () => sampleResponse() }
    },
    retryBaseMs: 20,
    sleep: async (milliseconds) => delays.push(milliseconds),
  })

  assert.equal(attempts, 2)
  assert.deepEqual(delays, [20])
  assert.equal(requestedUrls[0].hostname, 'api.open-meteo.com')
  assert.equal(requestedUrls[0].searchParams.get('latitude'), String(location.latitude))
  assert.equal(requestedUrls[0].searchParams.get('timezone'), 'Asia/Kolkata')
  assert.equal(weather.current.temperatureC, 29.4)
})

test('raw fetch returns the untouched upstream object', async () => {
  const payload = sampleResponse()
  const result = await fetchOpenMeteoRaw(location, {
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => payload }),
  })
  assert.strictEqual(result, payload)
})

test('fails after the configured attempts without making a real network call', async () => {
  let attempts = 0
  await assert.rejects(() => fetchOpenMeteoWeather(location, {
    fetchImpl: async () => {
      attempts += 1
      return { ok: false, status: 503 }
    },
    maxAttempts: 2,
    retryBaseMs: 0,
    sleep: async () => {},
  }), (error) => {
    assert.match(error.message, /HTTP 503/)
    assert.equal(error.status, 503)
    assert.equal(error.url, sourceUrl)
    return true
  })
  assert.equal(attempts, 2)
})

test('normalized alert schema enforces the shared verification contract', () => {
  const alert = {
    id: 'official-1',
    type: 'Heavy Rain',
    severity: 'HIGH',
    location: { state: 'Maharashtra', district: 'Mumbai City', lat: 19.076, lon: 72.8777 },
    title: 'Heavy rainfall warning',
    description: 'Rainfall warning from an official source.',
    issued_at: '2026-11-12T10:00:00Z',
    expires_at: null,
    source: 'Example official agency',
    source_url: 'https://example.gov.in/warnings/1',
    verification_status: 'Unconfirmed',
    confidence: 0.5,
    ai_summary: null,
    last_updated: '2026-11-12T12:00:00.000Z',
  }

  assert.deepEqual(normalizedAlertSchema.parse(alert), alert)
  assert.throws(() => normalizedAlertSchema.parse({ ...alert, verification_status: 'Pending' }))
})
