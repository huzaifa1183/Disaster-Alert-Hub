import assert from 'node:assert/strict'
import test from 'node:test'
import { weatherLocations } from '../../config/weatherLocations.js'
import { normalizedAlertSchema } from '../../schemas/normalized.js'
import { fetchOpenMeteoWeather, normalizeOpenMeteoResponse } from './openMeteo.js'

const location = weatherLocations.find((item) => item.id === 'mumbai')
const retrievalTime = '2026-11-12T12:00:00.000Z'
const sourceUrl = 'https://api.open-meteo.com/v1/forecast?latitude=19.076&longitude=72.8777'

function sampleResponse() {
  return {
    timezone: 'Asia/Kolkata',
    current: {
      time: '2026-11-12T17:30',
      temperature_2m: 29.4,
      relative_humidity_2m: 73,
      apparent_temperature: 33.1,
      precipitation: 0.4,
      rain: 0.4,
      showers: 0,
      weather_code: 61,
      is_day: 1,
      wind_speed_10m: 14.2,
      wind_direction_10m: 245,
      wind_gusts_10m: 22.8,
    },
    hourly: {
      time: ['2026-11-12T17:00', '2026-11-12T18:00'],
      temperature_2m: [29.4, 28.7],
      precipitation_probability: [60, 70],
      precipitation: [0.4, 1.2],
      rain: [0.4, 1.2],
      weather_code: [61, 63],
      wind_speed_10m: [14.2, 13.8],
    },
    daily: {
      time: ['2026-11-12', '2026-11-13'],
      weather_code: [61, 3],
      temperature_2m_max: [31.2, 30.4],
      temperature_2m_min: [25.1, 24.7],
      precipitation_sum: [8.4, 0],
      rain_sum: [8.4, 0],
      wind_speed_10m_max: [23.5, 18.1],
      sunrise: ['2026-11-12T06:42', '2026-11-13T06:42'],
      sunset: ['2026-11-12T18:01', '2026-11-13T18:01'],
    },
  }
}

test('normalizes Open-Meteo current conditions and forecasts', () => {
  const weather = normalizeOpenMeteoResponse(sampleResponse(), location, sourceUrl, retrievalTime)

  assert.equal(weather.location.city, 'Mumbai')
  assert.equal(weather.current.temperatureC, 29.4)
  assert.equal(weather.current.condition, 'Slight rain')
  assert.equal(weather.current.isDay, true)
  assert.equal(weather.hourlyForecast[1].precipitationProbabilityPercent, 70)
  assert.equal(weather.dailyForecast[0].rainMm, 8.4)
  assert.equal(weather.sourceUrl, sourceUrl)
  assert.equal(weather.retrievedAt, retrievalTime)
})

test('rejects malformed or misaligned upstream forecast data', () => {
  const response = sampleResponse()
  response.hourly.wind_speed_10m.pop()

  assert.throws(() => normalizeOpenMeteoResponse(response, location, sourceUrl), /Hourly values must align/)
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
  assert.equal(weather.current.temperatureC, 29.4)
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
  }), /HTTP 503/)
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
    last_updated: retrievalTime,
  }

  assert.deepEqual(normalizedAlertSchema.parse(alert), alert)
  assert.throws(() => normalizedAlertSchema.parse({ ...alert, verification_status: 'Pending' }))
})
