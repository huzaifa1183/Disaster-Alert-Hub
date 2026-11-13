import { z } from 'zod'
import { normalizedWeatherSchema } from '../../schemas/normalized.js'

const finiteNumber = z.number().finite()

const openMeteoResponseSchema = z.object({
  timezone: z.string().min(1),
  current: z.object({
    time: z.string().min(1),
    temperature_2m: finiteNumber,
    relative_humidity_2m: z.number().min(0).max(100),
    precipitation: z.number().min(0),
    wind_speed_10m: z.number().min(0),
    weather_code: z.number().int().min(0).max(99),
  }),
  daily: z.object({
    time: z.array(z.string().min(1)),
    weather_code: z.array(z.number().int().min(0).max(99)),
    temperature_2m_max: z.array(finiteNumber),
    temperature_2m_min: z.array(finiteNumber),
    precipitation_probability_max: z.array(z.number().min(0).max(100)),
    precipitation_sum: z.array(z.number().min(0)),
  }),
})

const conditionByCode = new Map([
  [0, 'Clear sky'],
  [1, 'Mainly clear'],
  [2, 'Partly cloudy'],
  [3, 'Overcast'],
  [45, 'Fog'],
  [48, 'Depositing rime fog'],
  [51, 'Light drizzle'],
  [53, 'Moderate drizzle'],
  [55, 'Dense drizzle'],
  [56, 'Light freezing drizzle'],
  [57, 'Dense freezing drizzle'],
  [61, 'Slight rain'],
  [63, 'Moderate rain'],
  [65, 'Heavy rain'],
  [66, 'Light freezing rain'],
  [67, 'Heavy freezing rain'],
  [71, 'Slight snow'],
  [73, 'Moderate snow'],
  [75, 'Heavy snow'],
  [77, 'Snow grains'],
  [80, 'Slight rain showers'],
  [81, 'Moderate rain showers'],
  [82, 'Violent rain showers'],
  [85, 'Slight snow showers'],
  [86, 'Heavy snow showers'],
  [95, 'Thunderstorm'],
  [96, 'Thunderstorm with slight hail'],
  [99, 'Thunderstorm with heavy hail'],
])

function weatherCondition(code) {
  return conditionByCode.get(code) || 'Unknown conditions'
}

export function buildOpenMeteoUrl(location) {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum',
    forecast_days: '7',
    timezone: 'Asia/Kolkata',
  }).toString()
  return url
}

export function normalizeOpenMeteoResponse(payload, location, sourceUrl) {
  const response = openMeteoResponseSchema.parse(payload)
  const forecastLength = response.daily.time.length
  const dailyFields = [
    response.daily.weather_code,
    response.daily.temperature_2m_max,
    response.daily.temperature_2m_min,
    response.daily.precipitation_probability_max,
    response.daily.precipitation_sum,
  ]
  if (!forecastLength || dailyFields.some((values) => values.length !== forecastLength)) {
    throw new TypeError('Open-Meteo returned incomplete daily forecast data.')
  }

  const normalized = {
    location: {
      id: location.id,
      city: location.city,
      district: location.district,
      state: location.state,
      latitude: location.latitude,
      longitude: location.longitude,
    },
    timezone: response.timezone,
    current: {
      time: response.current.time,
      temperatureC: response.current.temperature_2m,
      relativeHumidityPercent: response.current.relative_humidity_2m,
      precipitationMm: response.current.precipitation,
      weatherCode: response.current.weather_code,
      condition: weatherCondition(response.current.weather_code),
      windSpeedKmh: response.current.wind_speed_10m,
    },
    dailyForecast: response.daily.time.map((date, index) => ({
      date,
      weatherCode: response.daily.weather_code[index],
      condition: weatherCondition(response.daily.weather_code[index]),
      maximumTemperatureC: response.daily.temperature_2m_max[index],
      minimumTemperatureC: response.daily.temperature_2m_min[index],
      precipitationProbabilityPercent: response.daily.precipitation_probability_max[index],
      precipitationMm: response.daily.precipitation_sum[index],
    })),
    source: 'Open-Meteo',
    sourceUrl,
  }

  return normalizedWeatherSchema.parse(normalized)
}

export class OpenMeteoError extends Error {
  constructor(message, { status = null, url, cause } = {}) {
    super(message, { cause })
    this.name = 'OpenMeteoError'
    this.status = status
    this.url = url
  }
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function requestOpenMeteo(location, {
  fetchImpl = globalThis.fetch,
  timeoutMs = 8000,
  maxAttempts = 3,
  retryBaseMs = 250,
  sleep = wait,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.')
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) throw new RangeError('maxAttempts must be a positive integer.')

  const url = buildOpenMeteoUrl(location)
  let lastError

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(new Error('Open-Meteo request timed out.')), timeoutMs)

    try {
      const response = await fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500
        const error = new OpenMeteoError(`Open-Meteo returned HTTP ${response.status}.`, { status: response.status, url: url.toString() })
        if (!retryable || attempt === maxAttempts) throw error
        lastError = error
      } else {
        let payload
        try {
          payload = await response.json()
        } catch (error) {
          throw new OpenMeteoError('Open-Meteo returned invalid JSON.', { status: response.status, url: url.toString(), cause: error })
        }
        return { payload, status: response.status, url: url.toString() }
      }
    } catch (error) {
      if (error instanceof z.ZodError || (error instanceof OpenMeteoError && error.status && error.status < 500 && error.status !== 429)) {
        throw error
      }
      if (error instanceof OpenMeteoError && error.message === 'Open-Meteo returned invalid JSON.') throw error
      lastError = error instanceof OpenMeteoError
        ? error
        : new OpenMeteoError(controller.signal.aborted ? 'Open-Meteo request timed out.' : error.message || 'Open-Meteo request failed.', { url: url.toString(), cause: error })
      if (attempt === maxAttempts) throw lastError
    } finally {
      clearTimeout(timeout)
    }

    await sleep(retryBaseMs * (2 ** (attempt - 1)))
  }

  throw lastError || new OpenMeteoError('Open-Meteo request failed.', { url: url.toString() })
}

export async function fetchOpenMeteoRaw(location, options) {
  const { payload } = await requestOpenMeteo(location, options)
  return payload
}

export async function fetchOpenMeteoWeather(location, options) {
  const { payload, status, url } = await requestOpenMeteo(location, options)
  try {
    return normalizeOpenMeteoResponse(payload, location, url)
  } catch (error) {
    throw new OpenMeteoError(error.message || 'Open-Meteo response validation failed.', { status, url, cause: error })
  }
}
