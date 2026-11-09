import { Router } from 'express'
import { z } from 'zod'
import { createAlert, createNotification, findAlert, listAlerts, removeAlert, updateAlert } from '../services/repository.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'

const router = Router()
const alertInput = z.object({
  alertId: z.string().min(4).max(40), title: z.string().min(4).max(160),
  disasterType: z.string().min(2), severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  state: z.string().min(2), district: z.string().min(2), city: z.string().optional().default(''),
  latitude: z.coerce.number().min(-90).max(90), longitude: z.coerce.number().min(-180).max(180),
  description: z.string().min(10).max(2000), source: z.string().min(2),
  timestamp: z.coerce.date().optional(), verificationStatus: z.enum(['Verified', 'Pending', 'Unverified']).default('Pending'),
  confidenceScore: z.coerce.number().min(0).max(1).default(0.5), affectedArea: z.string().optional().default(''),
  safetyInstructions: z.array(z.string().max(240)).default([]),
})

router.get('/', async (_req, res, next) => {
  try { res.json(await listAlerts()) } catch (error) { next(error) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const alert = await findAlert(req.params.id)
    if (!alert) return res.status(404).json({ error: 'Alert not found.' })
    res.json(alert)
  } catch (error) { next(error) }
})

router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const parsed = alertInput.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Please check the alert fields.', details: parsed.error.flatten() })
    if (await findAlert(parsed.data.alertId)) return res.status(409).json({ error: 'Alert ID already exists.' })
    const alert = await createAlert(parsed.data)
    req.app.get('io').emit('alert:created', alert)
    if (alert.severity === 'CRITICAL') {
      const notification = await createNotification({ type: 'critical-alert', title: 'Critical demo alert created', message: alert.title, alertId: alert.alertId })
      req.app.get('io').emit('notification:created', notification)
    }
    res.status(201).json(alert)
  } catch (error) { next(error) }
})

router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
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
    const alert = await removeAlert(req.params.id)
    if (!alert) return res.status(404).json({ error: 'Alert not found.' })
    req.app.get('io').emit('alert:deleted', alert.alertId)
    res.json({ success: true })
  } catch (error) { next(error) }
})

router.put('/:id/verify', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const alert = await updateAlert(req.params.id, { verificationStatus: req.body.verified ? 'Verified' : 'Unverified' })
    if (!alert) return res.status(404).json({ error: 'Alert not found.' })
    req.app.get('io').emit('alert:updated', alert)
    res.json(alert)
  } catch (error) { next(error) }
})

export default router