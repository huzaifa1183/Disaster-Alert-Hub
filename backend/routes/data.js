import { Router } from 'express'
import { listAlerts, listReports, addReport, listNotifications, createNotification } from '../services/repository.js'
import { z } from 'zod'
import { mockWeatherForCity } from '../services/weatherData.js'

const router = Router()
router.get('/weather', (req, res) => {
  res.json(mockWeatherForCity(req.query.city || 'Mumbai'))
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