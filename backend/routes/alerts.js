import { Router } from 'express'
import { z } from 'zod'
import { createAlert, createNotification, findAlert, listAlerts, removeAlert, updateAlert, useMockData } from '../services/repository.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { sachetAlertCache } from '../services/sachetAlertCache.js'

const router = Router()
const alertInput = z.object({
  alertId: z.string().min(4).max(40), title: z.string().min(4).max(160),
  disasterType: z.string().min(2), severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  state: z.string().min(2), district: z.string().min(2), city: z.string().optional().default(''),
  latitude: z.coerce.number().min(-90).max(90), longitude: z.coerce.number().min(-180).max(180),
  description: z.string().min(10).max(2000), source: z.string().min(2),
  timestamp: z.coerce.date().optional(), verificationStatus: z.enum(['Verified', 'Unconfirmed', 'Conflicting']).default('Unconfirmed'),
  confidenceScore: z.coerce.number().min(0).max(1).default(0.5), affectedArea: z.string().optional().default(''),
  safetyInstructions: z.array(z.string().max(240)).default([]),
})

router.get('/', async (_req, res) => {
  try {
    if (useMockData) {
      return res.json({ alerts: await listAlerts(), source: 'mock', status: 'mock', latestAlertIssuedAt: null, warning: '' })
    }
    res.json(await sachetAlertCache.get())
  } catch (error) {
    res.status(502).json({ error: error.message || 'SACHET/NDMA alert feed is unavailable.', source: 'SACHET/NDMA' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const alert = useMockData
      ? await findAlert(req.params.id)
      : (await sachetAlertCache.get()).alerts.find((item) => item.alertId === req.params.id || item._id === req.params.id)
    if (!alert) return res.status(404).json({ error: 'Alert not found.' })
    res.json(alert)
  } catch (error) {
    res.status(502).json({ error: error.message || 'SACHET/NDMA alert feed is unavailable.', source: 'SACHET/NDMA' })
  }
})

router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!useMockData) return res.status(503).json({ error: 'Official SACHET/NDMA alerts are read-only. Alert administration is disabled.' })
    const parsed = alertInput.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Please check the alert fields.', details: parsed.error.flatten() })
    if (await findAlert(parsed.data.alertId)) return res.status(409).json({ error: 'Alert ID already exists.' })
    const alert = await createAlert(parsed.data)
    req.app.get('io').emit('alert:created', alert)
    if (alert.severity === 'CRITICAL') {
      const notification = await createNotification({ type: 'critical-alert', title: 'Critical alert created', message: alert.title, alertId: alert.alertId })
      req.app.get('io').emit('notification:created', notification)
    }
    res.status(201).json(alert)
  } catch (error) { next(error) }
})

router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!useMockData) return res.status(503).json({ error: 'Official SACHET/NDMA alerts are read-only. Alert administration is disabled.' })
    const parsed = alertInput.partial().safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Please check the alert fields.', details: parsed.error.flatten() })
    const alert = await updateAlert(req.params.id, parsed.data)
    if (!alert) return res.status(404).json({ error: 'Alert not found.' })
    req.app.get('io').emit('alert:updated', alert)
    res.json(alert)
  } catch (error) { next(error) }
})

router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!useMockData) return res.status(503).json({ error: 'Official SACHET/NDMA alerts are read-only. Alert administration is disabled.' })
    const alert = await removeAlert(req.params.id)
    if (!alert) return res.status(404).json({ error: 'Alert not found.' })
    req.app.get('io').emit('alert:deleted', alert.alertId)
    res.json({ success: true })
  } catch (error) { next(error) }
})

router.put('/:id/verify', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!useMockData) return res.status(503).json({ error: 'Official SACHET/NDMA alerts cannot be manually verified or changed.' })
    const alert = await updateAlert(req.params.id, { verificationStatus: req.body.verified ? 'Verified' : 'Unconfirmed' })
    if (!alert) return res.status(404).json({ error: 'Alert not found.' })
    req.app.get('io').emit('alert:updated', alert)
    res.json(alert)
  } catch (error) { next(error) }
})

export default router