import { z } from 'zod'

const nonEmptyString = z.string().trim().min(1)
const finiteNumber = z.number().finite()
const dateTime = z.string().datetime({ offset: true })

export const normalizedAlertSchema = z.object({
  id: nonEmptyString,
  type: nonEmptyString,
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']),
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

export const normalizedWeatherSchema = z.object({
  location: weatherLocationSchema,
  timezone: nonEmptyString,
  current: z.object({
    time: nonEmptyString,
    temperatureC: finiteNumber,
    relativeHumidityPercent: finiteNumber.min(0).max(100),
    precipitationMm: finiteNumber.min(0),
    weatherCode: z.number().int().min(0).max(99),
    condition: nonEmptyString,
    windSpeedKmh: finiteNumber.min(0),
  }),
  dailyForecast: z.array(z.object({
    date: nonEmptyString,
    weatherCode: z.number().int().min(0).max(99),
    condition: nonEmptyString,
    maximumTemperatureC: finiteNumber,
    minimumTemperatureC: finiteNumber,
    precipitationProbabilityPercent: finiteNumber.min(0).max(100),
    precipitationMm: finiteNumber.min(0),
  })).min(1),
  source: nonEmptyString,
  sourceUrl: z.string().url(),
})

/** @typedef {z.infer<typeof normalizedWeatherSchema>} NormalizedWeather */
