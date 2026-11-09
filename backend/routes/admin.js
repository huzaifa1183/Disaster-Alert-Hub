import { Router } from 'express'
import { listAlerts, listReports, listUsers, removeUser, updateAlert, updateUserRole } from '../services/repository.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { z } from 'zod'

const router = Router()
router.use(requireAuth, requireAdmin)

router.get('/dashboard', async (_req, res, next) => {
  try {
    const [alerts, reports] = await Promise.all([listAlerts(), listReports()])
    res.json({ totalAlerts: alerts.length, activeAlerts: alerts.length, verifiedAlerts: alerts.filter((alert) => alert.verificationStatus === 'Verified').length, pendingReports: reports.filter((report) => report.status === 'Pending').length, criticalAlerts: alerts.filter((alert) => alert.severity === 'CRITICAL').length })
  } catch (error) { next(error) }
})
router.get('/users', async (_req, res, next) => {
  try { res.json(await listUsers()) } catch (error) { next(error) }
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
    const alert = await updateAlert(req.params.id, { verificationStatus: req.body.verified ? 'Verified' : 'Unverified' })
    if (!alert) return res.status(404).json({ error: 'Alert not found.' })
    req.app.get('io').emit('alert:updated', alert)
    res.json(alert)
  } catch (error) { next(error) }
})

export default router