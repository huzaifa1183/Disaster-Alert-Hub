import { Router } from 'express'
import { listAlerts, listReports, addReport, listNotifications, createNotification } from '../services/repository.js'
import { z } from 'zod'
import { findWeatherLocation, weatherLocations } from '../config/weatherLocations.js'
import { buildOpenMeteoUrl, fetchOpenMeteoRaw, fetchOpenMeteoWeather } from '../services/sources/openMeteo.js'

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

router.get('/weather/locations', (_req, res) => {
  res.json(weatherLocations)
})

async function validateWeatherLocation(req, res) {
  const parsed = z.string().trim().min(1).max(80).optional().safeParse(req.query.city)
  if (!parsed.success) {
    res.status(400).json({ error: 'City must be a configured location name or ID.' })
    return null
  }
  const location = findWeatherLocation(parsed.data)
  if (!location) {
    res.status(404).json({ error: 'Weather is available only for configured locations.' })
    return null
  }
  if ((process.env.OPEN_METEO_ENABLED || 'true').toLowerCase() === 'false') {
    res.status(503).json(liveUnavailable)
    return null
  }
  return location
}

router.get('/weather', async (req, res) => {
  const location = await validateWeatherLocation(req, res)
  if (!location) return
  try {
    res.json(await fetchOpenMeteoWeather(location, getWeatherRequestOptions()))
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
  try { res.json(await listReports()) } catch (error) { next(error) }
})
router.get('/notifications', async (_req, res, next) => {
  try { res.json(await listNotifications()) } catch (error) { next(error) }
})
router.post('/reports', async (req, res, next) => {
  try {
    const parsed = z.object({ text: z.string().min(10).max(2000), location: z.string().max(120).optional().default(''), category: z.string().max(80).optional().default('Unknown') }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Report must contain at least 10 characters.' })
    const report = await addReport(parsed.data)
    const notification = await createNotification({ type: 'report', title: 'New community report', message: `${report.location || 'A community member'} submitted a report.`, alertId: '' })
    req.app.get('io').emit('report:created', report)
    req.app.get('io').emit('notification:created', notification)
    res.status(201).json(report)
  } catch (error) { next(error) }
})

export default router