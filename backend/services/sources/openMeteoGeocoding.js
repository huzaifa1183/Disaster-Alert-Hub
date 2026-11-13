import { z } from 'zod'

const querySchema = z.string().trim().min(2).max(80)
const geocodingResponseSchema = z.object({
  results: z.array(z.object({
    id: z.number().int(),
    name: z.string().trim().min(1),
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    country_code: z.string().nullish(),
    admin1: z.string().trim().nullish(),
    admin2: z.string().trim().nullish(),
    admin3: z.string().trim().nullish(),
  })).optional().default([]),
})

export function buildOpenMeteoGeocodingUrl(query) {
  const name = querySchema.parse(query)
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.search = new URLSearchParams({
    name,
    count: '10',
    language: 'en',
    format: 'json',
    countryCode: 'IN',
  }).toString()
  return url
}

export class OpenMeteoGeocodingError extends Error {
  constructor(message, { status = null, url, cause } = {}) {
    super(message, { cause })
    this.name = 'OpenMeteoGeocodingError'
    this.status = status
    this.url = url
  }
}

export async function searchOpenMeteoLocations(query, {
  fetchImpl = globalThis.fetch,
  timeoutMs = 8000,
} = {}) {
  const url = buildOpenMeteoGeocodingUrl(query)
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(new Error('Open-Meteo place search timed out.')), timeoutMs)
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      throw new OpenMeteoGeocodingError(`Open-Meteo geocoding returned HTTP ${response.status}.`, {
        status: response.status,
        url: url.toString(),
      })
    }

    let payload
    try {
      payload = await response.json()
    } catch (error) {
      throw new OpenMeteoGeocodingError('Open-Meteo geocoding returned invalid JSON.', {
        status: response.status,
        url: url.toString(),
        cause: error,
      })
    }

    let results
    try {
      results = geocodingResponseSchema.parse(payload).results
    } catch (error) {
      throw new OpenMeteoGeocodingError('Open-Meteo geocoding returned invalid place data.', {
        status: response.status,
        url: url.toString(),
        cause: error,
      })
    }

    return results
      .filter((place) => place.country_code?.toUpperCase() === 'IN')
      .map((place) => ({
        id: `open-meteo-${place.id}`,
        city: place.name,
        district: place.admin2 || place.admin3 || place.admin1 || place.name,
        state: place.admin1 || 'India',
        latitude: place.latitude,
        longitude: place.longitude,
        countryCode: 'IN',
      }))
  } catch (error) {
    if (error instanceof OpenMeteoGeocodingError) throw error
    throw new OpenMeteoGeocodingError(
      controller.signal.aborted ? 'Open-Meteo place search timed out.' : error.message || 'Open-Meteo place search failed.',
      { url: url.toString(), cause: error },
    )
  } finally {
    clearTimeout(timeout)
  }
}
