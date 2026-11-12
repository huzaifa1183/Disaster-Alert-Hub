import { z } from 'zod'
import { normalizedWeatherSchema } from '../../schemas/normalized.js'

const finiteNumber = z.number().finite()

const currentResponseSchema = z.object({
  time: z.string().min(1),
  temperature_2m: finiteNumber,
  relative_humidity_2m: z.number().min(0).max(100),
  apparent_temperature: finiteNumber,
  precipitation: z.number().min(0),
  rain: z.number().min(0),
  showers: z.number().min(0),
  weather_code: z.number().int().min(0).max(99),
  is_day: z.union([z.literal(0), z.literal(1)]),
  wind_speed_10m: z.number().min(0),
  wind_direction_10m: z.number().min(0).max(360),
  wind_gusts_10m: z.number().min(0),
})

const hourlyResponseSchema = z.object({
  time: z.array(z.string().min(1)),
  temperature_2m: z.array(finiteNumber),
  precipitation_probability: z.array(z.number().min(0).max(100)),
  precipitation: z.array(z.number().min(0)),
  rain: z.array(z.number().min(0)),
  weather_code: z.array(z.number().int().min(0).max(99)),
  wind_speed_10m: z.array(z.number().min(0)),
}).superRefine((hourly, context) => {
  for (const [key, values] of Object.entries(hourly)) {
    if (values.length !== hourly.time.length) {
      context.addIssue({ code: 'custom', path: [key], message: 'Hourly values must align with the time array.' })
    }
  }
})

const dailyResponseSchema = z.object({
  time: z.array(z.string().min(1)),
  weather_code: z.array(z.number().int().min(0).max(99)),
  temperature_2m_max: z.array(finiteNumber),
  temperature_2m_min: z.array(finiteNumber),
  precipitation_sum: z.array(z.number().min(0)),
  rain_sum: z.array(z.number().min(0)),
  wind_speed_10m_max: z.array(z.number().min(0)),
  sunrise: z.array(z.string().min(1)),
  sunset: z.array(z.string().min(1)),
}).superRefine((daily, context) => {
  for (const [key, values] of Object.entries(daily)) {
    if (values.length !== daily.time.length) {
      context.addIssue({ code: 'custom', path: [key], message: 'Daily values must align with the date array.' })
    }
  }
})

const openMeteoResponseSchema = z.object({
  timezone: z.string().min(1),
  current: currentResponseSchema,
  hourly: hourlyResponseSchema,
  daily: dailyResponseSchema,
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
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,weather_code,is_day,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    hourly: 'temperature_2m,precipitation_probability,precipitation,rain,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,wind_speed_10m_max,sunrise,sunset',
    forecast_days: '5',
    forecast_hours: '24',
    timezone: 'auto',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    precipitation_unit: 'mm',
  }).toString()
  return url
}

export function normalizeOpenMeteoResponse(payload, location, sourceUrl, retrievedAt = new Date().toISOString()) {
  const response = openMeteoResponseSchema.parse(payload)
  const hourlyCount = Math.min(24, response.hourly.time.length)
  const dailyCount = Math.min(5, response.daily.time.length)

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
      apparentTemperatureC: response.current.apparent_temperature,
      relativeHumidityPercent: response.current.relative_humidity_2m,
      precipitationMm: response.current.precipitation,
      rainMm: response.current.rain,
      showersMm: response.current.showers,
      weatherCode: response.current.weather_code,
      condition: weatherCondition(response.current.weather_code),
      isDay: response.current.is_day === 1,
      windSpeedKmh: response.current.wind_speed_10m,
      windDirectionDegrees: response.current.wind_direction_10m,
      windGustsKmh: response.current.wind_gusts_10m,
    },
    hourlyForecast: Array.from({ length: hourlyCount }, (_, index) => ({
      time: response.hourly.time[index],
      temperatureC: response.hourly.temperature_2m[index],
      precipitationProbabilityPercent: response.hourly.precipitation_probability[index],
      precipitationMm: response.hourly.precipitation[index],
      rainMm: response.hourly.rain[index],
      weatherCode: response.hourly.weather_code[index],
      condition: weatherCondition(response.hourly.weather_code[index]),
      windSpeedKmh: response.hourly.wind_speed_10m[index],
    })),
    dailyForecast: Array.from({ length: dailyCount }, (_, index) => ({
      date: response.daily.time[index],
      weatherCode: response.daily.weather_code[index],
      condition: weatherCondition(response.daily.weather_code[index]),
      temperatureMaxC: response.daily.temperature_2m_max[index],
      temperatureMinC: response.daily.temperature_2m_min[index],
      precipitationMm: response.daily.precipitation_sum[index],
      rainMm: response.daily.rain_sum[index],
      windSpeedMaxKmh: response.daily.wind_speed_10m_max[index],
      sunrise: response.daily.sunrise[index],
      sunset: response.daily.sunset[index],
    })),
    source: 'Open-Meteo',
    sourceUrl,
    retrievedAt,
  }

  return normalizedWeatherSchema.parse(normalized)
}

export class OpenMeteoError extends Error {
  constructor(message, { status, cause } = {}) {
    super(message, { cause })
    this.name = 'OpenMeteoError'
    this.status = status
  }
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

export async function fetchOpenMeteoWeather(location, {
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
        const error = new OpenMeteoError(`Open-Meteo returned HTTP ${response.status}.`, { status: response.status })
        if (!retryable || attempt === maxAttempts) throw error
        lastError = error
      } else {
        let payload
        try {
          payload = await response.json()
        } catch (error) {
          throw new OpenMeteoError('Open-Meteo returned invalid JSON.', { cause: error })
        }
        return normalizeOpenMeteoResponse(payload, location, url.toString())
      }
    } catch (error) {
      if (error instanceof z.ZodError || (error instanceof OpenMeteoError && error.status && error.status < 500 && error.status !== 429)) {
        throw error
      }
      if (error instanceof OpenMeteoError && error.message === 'Open-Meteo returned invalid JSON.') throw error
      lastError = error instanceof OpenMeteoError
        ? error
        : new OpenMeteoError(controller.signal.aborted ? 'Open-Meteo request timed out.' : 'Open-Meteo request failed.', { cause: error })
      if (attempt === maxAttempts) throw lastError
    } finally {
      clearTimeout(timeout)
    }

    await sleep(retryBaseMs * (2 ** (attempt - 1)))
  }

  throw lastError || new OpenMeteoError('Open-Meteo request failed.')
}
