import { Router } from 'express'
import { clearReports, listAlerts, listReports, listUsers, removeUser, updateAlert, updateReport, updateUserRole, useMockData } from '../services/repository.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { z } from 'zod'
import { sachetAlertCache } from '../services/sachetAlertCache.js'

const router = Router()
router.use(requireAuth, requireAdmin)
const reportUpdateInput = z.object({
  text: z.string().trim().min(10).max(2000).optional(),
  location: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  status: z.enum(['Pending', 'Verified', 'Rejected', 'Reviewed']).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one report field to update.' })

router.get('/dashboard', async (_req, res, next) => {
  try {
    const [alerts, reports] = await Promise.all([
      useMockData ? listAlerts() : sachetAlertCache.get().then((feed) => feed.alerts),
      listReports(),
    ])
    res.json({ totalAlerts: alerts.length, activeAlerts: alerts.length, verifiedAlerts: alerts.filter((alert) => alert.verificationStatus === 'Verified').length, pendingReports: reports.filter((report) => report.status === 'Pending').length, criticalAlerts: alerts.filter((alert) => alert.severity === 'CRITICAL').length })
  } catch (error) { next(error) }
})
router.get('/users', async (_req, res, next) => {
  try { res.json(await listUsers()) } catch (error) { next(error) }
})
router.get('/reports', async (_req, res, next) => {
  try { res.json(await listReports()) } catch (error) { next(error) }
})
router.put('/reports/:id', async (req, res, next) => {
  try {
    const parsed = reportUpdateInput.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Please check the report fields.', details: parsed.error.flatten() })
    const report = await updateReport(req.params.id, parsed.data)
    if (!report) return res.status(404).json({ error: 'Report not found.' })
    req.app.get('io')?.emit('community:reports-updated')
    res.json(report)
  } catch (error) { next(error) }
})
router.delete('/reports', async (req, res, next) => {
  try {
    const result = await clearReports()
    req.app.get('io')?.emit('community:reports-updated')
    res.json({ success: true, ...result })
  }
  catch (error) { next(error) }
})
router.put('/users/:id/role', async (req, res, next) => {
  try {
    const parsed = z.object({ role: z.enum(['admin', 'user']) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Role must be admin or user.' })
    if (req.params.id === req.user.sub && parsed.data.role !== 'admin') return res.status(400).json({ error: 'You cannot remove your own admin access.' })
    const user = await updateUserRole(req.params.id, parsed.data.role)
    if (!user) return res.status(404).json({ error: 'User not found.' })
    res.json(user)
  } catch (error) { next(error) }
})
router.delete('/users/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.user.sub) return res.status(400).json({ error: 'You cannot delete your own account.' })
    const user = await removeUser(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found.' })
    res.json({ success: true })
  } catch (error) { next(error) }
})
router.put('/alerts/:id/verify', async (req, res, next) => {
  try {
    if (!useMockData) return res.status(503).json({ error: 'Official SACHET/NDMA alerts are read-only and cannot be manually verified.' })
    const alert = await updateAlert(req.params.id, { verificationStatus: req.body.verified ? 'Verified' : 'Unconfirmed' })
    if (!alert) return res.status(404).json({ error: 'Alert not found.' })
    req.app.get('io').emit('alert:updated', alert)
    res.json(alert)
  } catch (error) { next(error) }
})

export default router