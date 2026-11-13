import { z } from 'zod'

const nullableConcentration = z.number().finite().min(0).nullable()
const airQualityResponseSchema = z.object({
  current: z.object({
    time: z.string().min(1),
    us_aqi: nullableConcentration,
    european_aqi: nullableConcentration,
    pm2_5: nullableConcentration,
    pm10: nullableConcentration,
  }),
})

export function buildOpenMeteoAirQualityUrl(location) {
  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality')
  url.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'us_aqi,european_aqi,pm2_5,pm10',
    timezone: 'Asia/Kolkata',
  }).toString()
  return url
}

export class OpenMeteoAirQualityError extends Error {
  constructor(message, { status = null, url, cause } = {}) {
    super(message, { cause })
    this.name = 'OpenMeteoAirQualityError'
    this.status = status
    this.url = url
  }
}

export async function fetchOpenMeteoAirQuality(location, {
  fetchImpl = globalThis.fetch,
  timeoutMs = 8000,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.')

  const url = buildOpenMeteoAirQualityUrl(location)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(new Error('Open-Meteo air-quality request timed out.')), timeoutMs)
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      throw new OpenMeteoAirQualityError(`Open-Meteo air quality returned HTTP ${response.status}.`, {
        status: response.status,
        url: url.toString(),
      })
    }

    let payload
    try {
      payload = await response.json()
    } catch (error) {
      throw new OpenMeteoAirQualityError('Open-Meteo air quality returned invalid JSON.', {
        status: response.status,
        url: url.toString(),
        cause: error,
      })
    }

    let current
    try {
      current = airQualityResponseSchema.parse(payload).current
    } catch (error) {
      throw new OpenMeteoAirQualityError('Open-Meteo returned invalid air-quality data.', {
        status: response.status,
        url: url.toString(),
        cause: error,
      })
    }

    return {
      status: current.us_aqi === null && current.european_aqi === null ? 'partial' : 'available',
      usAqi: current.us_aqi,
      europeanAqi: current.european_aqi,
      pm25: current.pm2_5,
      pm10: current.pm10,
      time: current.time,
      source: 'Open-Meteo Air Quality',
      sourceUrl: url.toString(),
    }
  } catch (error) {
    if (error instanceof OpenMeteoAirQualityError) throw error
    throw new OpenMeteoAirQualityError(
      controller.signal.aborted ? 'Open-Meteo air-quality request timed out.' : error.message || 'Open-Meteo air-quality request failed.',
      { url: url.toString(), cause: error },
    )
  } finally {
    clearTimeout(timeout)
  }
}
