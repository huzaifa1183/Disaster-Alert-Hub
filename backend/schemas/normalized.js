import { z } from 'zod'

const nonEmptyString = z.string().trim().min(1)
const finiteNumber = z.number().finite()
const dateTime = z.string().datetime({ offset: true })

export const normalizedAlertSchema = z.object({
  id: nonEmptyString,
  type: nonEmptyString,
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  location: z.object({
    state: nonEmptyString,
    district: nonEmptyString,
    lat: finiteNumber.min(-90).max(90),
    lon: finiteNumber.min(-180).max(180),
  }),
  title: nonEmptyString,
  description: nonEmptyString,
  issued_at: dateTime,
  expires_at: dateTime.nullable(),
  source: nonEmptyString,
  source_url: z.string().url(),
  verification_status: z.enum(['Verified', 'Unconfirmed', 'Conflicting']),
  confidence: finiteNumber.min(0).max(1),
  ai_summary: z.string().nullable(),
  last_updated: dateTime,
})

/** @typedef {z.infer<typeof normalizedAlertSchema>} NormalizedAlert */

const weatherLocationSchema = z.object({
  id: nonEmptyString,
  city: nonEmptyString,
  district: nonEmptyString,
  state: nonEmptyString,
  latitude: finiteNumber.min(-90).max(90),
  longitude: finiteNumber.min(-180).max(180),
})

const weatherPointSchema = z.object({
  time: nonEmptyString,
  temperatureC: finiteNumber,
  precipitationProbabilityPercent: finiteNumber.min(0).max(100),
  precipitationMm: finiteNumber.min(0),
  rainMm: finiteNumber.min(0),
  weatherCode: z.number().int().min(0).max(99),
  condition: nonEmptyString,
  windSpeedKmh: finiteNumber.min(0),
})

const dailyForecastSchema = z.object({
  date: nonEmptyString,
  weatherCode: z.number().int().min(0).max(99),
  condition: nonEmptyString,
  temperatureMaxC: finiteNumber,
  temperatureMinC: finiteNumber,
  precipitationMm: finiteNumber.min(0),
  rainMm: finiteNumber.min(0),
  windSpeedMaxKmh: finiteNumber.min(0),
  sunrise: nonEmptyString,
  sunset: nonEmptyString,
})

export const normalizedWeatherSchema = z.object({
  location: weatherLocationSchema,
  timezone: nonEmptyString,
  current: z.object({
    time: nonEmptyString,
    temperatureC: finiteNumber,
    apparentTemperatureC: finiteNumber,
    relativeHumidityPercent: finiteNumber.min(0).max(100),
    precipitationMm: finiteNumber.min(0),
    rainMm: finiteNumber.min(0),
    showersMm: finiteNumber.min(0),
    weatherCode: z.number().int().min(0).max(99),
    condition: nonEmptyString,
    isDay: z.boolean(),
    windSpeedKmh: finiteNumber.min(0),
    windDirectionDegrees: finiteNumber.min(0).max(360),
    windGustsKmh: finiteNumber.min(0),
  }),
  hourlyForecast: z.array(weatherPointSchema),
  dailyForecast: z.array(dailyForecastSchema).min(1),
  source: nonEmptyString,
  sourceUrl: z.string().url(),
  retrievedAt: dateTime,
})

/** @typedef {z.infer<typeof normalizedWeatherSchema>} NormalizedWeather */
