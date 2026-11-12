import { Router } from 'express'
import { listAlerts, listReports, addReport, listNotifications, createNotification } from '../services/repository.js'
import { z } from 'zod'
import { findWeatherLocation, weatherLocations } from '../config/weatherLocations.js'
import { fetchOpenMeteoWeather } from '../services/sources/openMeteo.js'

const router = Router()
router.get('/weather/locations', (_req, res) => {
  res.json(weatherLocations)
})
router.get('/weather', async (req, res) => {
  const parsed = z.string().trim().min(1).max(80).optional().safeParse(req.query.city)
  if (!parsed.success) return res.status(400).json({ error: 'City must be a configured location name or ID.' })
  const location = findWeatherLocation(parsed.data)
  if (!location) return res.status(404).json({ error: 'Weather is available only for configured locations.' })
  if ((process.env.OPEN_METEO_ENABLED || 'true').toLowerCase() === 'false') {
    return res.status(503).json({ error: 'Open-Meteo weather is currently disabled.' })
  }

  const configuredTimeout = Number(process.env.OPEN_METEO_TIMEOUT_MS)
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 8000
  try {
    res.json(await fetchOpenMeteoWeather(location, { timeoutMs }))
  } catch (error) {
    console.error(`Open-Meteo request failed for ${location.id}:`, error)
    res.status(502).json({ error: 'Weather data is temporarily unavailable from Open-Meteo.' })
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
    const notification = await createNotification({ type: 'report', title: 'New demo report', message: `${report.location || 'A community member'} submitted a report.`, alertId: '' })
    req.app.get('io').emit('report:created', report)
    req.app.get('io').emit('notification:created', notification)
    res.status(201).json(report)
  } catch (error) { next(error) }
})

export default router