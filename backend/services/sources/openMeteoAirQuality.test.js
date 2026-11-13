import assert from 'node:assert/strict'
import test from 'node:test'
import { weatherLocations } from '../../config/weatherLocations.js'
import { buildOpenMeteoAirQualityUrl, fetchOpenMeteoAirQuality, OpenMeteoAirQualityError } from './openMeteoAirQuality.js'

const location = weatherLocations.find((item) => item.id === 'mumbai')

function sampleResponse() {
  return {
    current: {
      time: '2026-11-13T21:00',
      us_aqi: 72,
      european_aqi: 31,
      pm2_5: 21.4,
      pm10: 33.2,
    },
  }
}

test('requests current AQI and particulate concentrations from Open-Meteo', () => {
  const url = buildOpenMeteoAirQualityUrl(location)

  assert.equal(url.origin + url.pathname, 'https://air-quality-api.open-meteo.com/v1/air-quality')
  assert.equal(url.searchParams.get('latitude'), String(location.latitude))
  assert.equal(url.searchParams.get('longitude'), String(location.longitude))
  assert.equal(url.searchParams.get('current'), 'us_aqi,european_aqi,pm2_5,pm10')
})

test('normalizes AQI and pollutant values with a source timestamp', async () => {
  const result = await fetchOpenMeteoAirQuality(location, {
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => sampleResponse() }),
  })

  assert.equal(result.status, 'available')
  assert.equal(result.usAqi, 72)
  assert.equal(result.europeanAqi, 31)
  assert.equal(result.pm25, 21.4)
  assert.equal(result.pm10, 33.2)
  assert.equal(result.time, '2026-11-13T21:00')
  assert.equal(result.source, 'Open-Meteo Air Quality')
})

test('marks AQI indices unavailable when only pollutant estimates are returned', async () => {
  const result = await fetchOpenMeteoAirQuality(location, {
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ current: { ...sampleResponse().current, us_aqi: null, european_aqi: null } }),
    }),
  })

  assert.equal(result.status, 'partial')
  assert.equal(result.pm25, 21.4)
})

test('surfaces upstream air-quality failures with their source URL', async () => {
  await assert.rejects(() => fetchOpenMeteoAirQuality(location, {
    fetchImpl: async () => ({ ok: false, status: 503 }),
  }), (error) => {
    assert.ok(error instanceof OpenMeteoAirQualityError)
    assert.equal(error.status, 503)
    assert.match(error.url, /air-quality-api\.open-meteo\.com/)
    return true
  })
})
