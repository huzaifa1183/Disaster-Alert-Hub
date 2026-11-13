import assert from 'node:assert/strict'
import test from 'node:test'
import { buildOpenMeteoGeocodingUrl, searchOpenMeteoLocations } from './openMeteoGeocoding.js'

test('builds a bounded India-only place search URL', () => {
  const url = buildOpenMeteoGeocodingUrl('Khopoli')

  assert.equal(url.origin + url.pathname, 'https://geocoding-api.open-meteo.com/v1/search')
  assert.equal(url.searchParams.get('name'), 'Khopoli')
  assert.equal(url.searchParams.get('count'), '10')
  assert.equal(url.searchParams.get('countryCode'), 'IN')
})

test('returns Indian places with coordinates and readable administrative names', async () => {
  const result = await searchOpenMeteoLocations('Khopoli', {
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          { id: 101, name: 'Khopoli', latitude: 18.79, longitude: 73.34, country_code: 'IN', admin1: 'Maharashtra', admin2: 'Raigad' },
          { id: 202, name: 'Khopoli', latitude: 50, longitude: 10, country_code: 'DE' },
        ],
      }),
    }),
  })

  assert.deepEqual(result, [{
    id: 'open-meteo-101',
    city: 'Khopoli',
    district: 'Raigad',
    state: 'Maharashtra',
    latitude: 18.79,
    longitude: 73.34,
    countryCode: 'IN',
  }])
})

test('returns an empty result list when the geocoder finds no places', async () => {
  const result = await searchOpenMeteoLocations('NoSuchPlace', {
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({}) }),
  })

  assert.deepEqual(result, [])
})

test('rejects short place searches before making a network request', async () => {
  let requested = false
  await assert.rejects(() => searchOpenMeteoLocations(' ', {
    fetchImpl: async () => { requested = true },
  }))
  assert.equal(requested, false)
})
