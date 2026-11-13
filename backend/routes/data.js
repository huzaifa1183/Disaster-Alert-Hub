import { Router } from 'express'
import { listAlerts, listVerifiedReports, addReport, useMockData } from '../services/repository.js'
import { z } from 'zod'
import { findWeatherLocation, weatherLocations } from '../config/weatherLocations.js'
import { buildOpenMeteoUrl, fetchOpenMeteoRaw, fetchOpenMeteoWeather } from '../services/sources/openMeteo.js'
import { OpenMeteoGeocodingError, searchOpenMeteoLocations } from '../services/sources/openMeteoGeocoding.js'
import { buildOpenMeteoAirQualityUrl, fetchOpenMeteoAirQuality, OpenMeteoAirQualityError } from '../services/sources/openMeteoAirQuality.js'
import { sachetAlertCache } from '../services/sachetAlertCache.js'

const router = Router()
const liveUnavailable = { error: 'Live data unavailable', source: 'Open-Meteo' }

function getWeatherRequestOptions() {
  const configuredTimeout = Number(process.env.OPEN_METEO_TIMEOUT_MS)
  return { timeoutMs: Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 8000 }
}

function logWeatherError(error, location) {
  console.error(JSON.stringify({
    source: 'Open-Meteo',
    city: location.id,
    status: error.status ?? null,
    url: error.url || buildOpenMeteoUrl(location).toString(),
    message: error.message || 'Open-Meteo request failed.',
  }))
}

function logAirQualityError(error, location) {
  console.error(JSON.stringify({
    source: 'Open-Meteo Air Quality',
    place: location.id,
    status: error.status ?? null,
    url: error.url || buildOpenMeteoAirQualityUrl(location).toString(),
    message: error.message || 'Open-Meteo air-quality request failed.',
  }))
}

async function getAirQualityOrUnavailable(location) {
  try {
    return await fetchOpenMeteoAirQuality(location, getWeatherRequestOptions())
  } catch (error) {
    if (!(error instanceof OpenMeteoAirQualityError)) throw error
    logAirQualityError(error, location)
    return {
      status: 'unavailable',
      message: 'Air-quality estimates are unavailable right now.',
      source: 'Open-Meteo Air Quality',
      sourceUrl: error.url || buildOpenMeteoAirQualityUrl(location).toString(),
    }
  }
}

const geocodedLocationSchema = z.object({
  id: z.string().trim().min(1).max(50),
  city: z.string().trim().min(1).max(100),
  district: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  latitude: z.coerce.number().min(6).max(38),
  longitude: z.coerce.number().min(68).max(98),
  countryCode: z.literal('IN'),
})

router.get('/weather/locations', (_req, res) => {
  res.json(weatherLocations)
})

router.get('/weather/search', async (req, res, next) => {
  const parsed = z.string().trim().min(2).max(80).safeParse(req.query.q)
  if (!parsed.success) return res.status(400).json({ error: 'Search for an Indian place using at least 2 characters.' })
  if ((process.env.OPEN_METEO_ENABLED || 'true').toLowerCase() === 'false') {
    return res.status(503).json(liveUnavailable)
  }
  try {
    return res.json(await searchOpenMeteoLocations(parsed.data, getWeatherRequestOptions()))
  } catch (error) {
    if (!(error instanceof OpenMeteoGeocodingError)) return next(error)
    console.error(JSON.stringify({
      source: 'Open-Meteo geocoding',
      status: error.status ?? null,
      url: error.url || 'https://geocoding-api.open-meteo.com/v1/search',
      message: error.message || 'Open-Meteo place search failed.',
    }))
    return res.status(502).json({ error: 'Indian place search is unavailable right now.', source: 'Open-Meteo' })
  }
})

function validateWeatherLocation(req, res) {
  const parsedCoordinates = geocodedLocationSchema.safeParse(req.query)
  if (parsedCoordinates.success) return parsedCoordinates.data

  const parsed = z.string().trim().min(1).max(80).optional().safeParse(req.query.city)
  if (!parsed.success) {
    res.status(400).json({ error: 'Provide a configured city or an Indian place selected from search.' })
    return null
  }
  const location = findWeatherLocation(parsed.data)
  if (!location) {
    res.status(404).json({ error: 'Weather is available only for configured locations or Indian places found through search.' })
    return null
  }
  if ((process.env.OPEN_METEO_ENABLED || 'true').toLowerCase() === 'false') {
    res.status(503).json(liveUnavailable)
    return null
  }
  return location
}

router.get('/weather', async (req, res) => {
  const location = validateWeatherLocation(req, res)
  if (!location) return
  try {
    const [weather, airQuality] = await Promise.all([
      fetchOpenMeteoWeather(location, getWeatherRequestOptions()),
      getAirQualityOrUnavailable(location),
    ])
    res.json({ ...weather, airQuality })
  } catch (error) {
    logWeatherError(error, location)
    res.status(502).json(liveUnavailable)
  }
})

router.get('/debug/raw/:city', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') return res.status(404).json({ error: 'Not found.' })
  const location = findWeatherLocation(req.params.city)
  if (!location) return res.status(404).json({ error: 'Weather is available only for configured locations.' })
  if ((process.env.OPEN_METEO_ENABLED || 'true').toLowerCase() === 'false') {
    return res.status(503).json(liveUnavailable)
  }
  try {
    res.json(await fetchOpenMeteoRaw(location, getWeatherRequestOptions()))
  } catch (error) {
    logWeatherError(error, location)
    res.status(502).json(liveUnavailable)
  }
})

router.get('/locations', async (_req, res, next) => {
  try {
    const alerts = await listAlerts()
    res.json([...new Map(alerts.map((alert) => [alert.state, { state: alert.state, city: alert.city, district: alert.district, latitude: alert.latitude, longitude: alert.longitude }])).values()])
  } catch (error) { next(error) }
})
router.get('/reports', async (_req, res, next) => {
  try { res.json(await listVerifiedReports()) } catch (error) { next(error) }
})
router.get('/notifications', async (_req, res, next) => {
  if (useMockData) return res.json([])
  try {
    const feed = await sachetAlertCache.get()
    res.json(feed.alerts.slice(0, 30).map((alert) => ({
      _id: `sachet-${alert.alertId}`,
      type: 'official-alert',
      title: alert.title,
      message: [alert.severity, alert.city || alert.district, alert.state].filter(Boolean).join(' · '),
      alertId: alert.alertId,
      createdAt: alert.issued_at || alert.timestamp,
      source: 'SACHET/NDMA CAP',
    })))
  } catch {
    res.status(502).json({ error: 'SACHET/NDMA notification feed is unavailable.', source: 'SACHET/NDMA' })
  }
})
router.post('/reports', async (req, res, next) => {
  try {
    const parsed = z.object({ text: z.string().min(10).max(2000), location: z.string().max(120).optional().default(''), category: z.string().max(80).optional().default('Unknown') }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Report must contain at least 10 characters.' })
    const report = await addReport(parsed.data)
    res.status(201).json(report)
  } catch (error) { next(error) }
})

export default router