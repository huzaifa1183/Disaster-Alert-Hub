import { Router } from 'express'
import { z } from 'zod'
import { createDisaster, listDisasters, removeDisaster, updateDisaster, useMockData } from '../services/repository.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'

const router = Router()
const categoryInput = z.object({ name: z.string().min(2).max(60), description: z.string().max(400).optional().default(''), active: z.boolean().optional().default(true) })

router.get('/', async (_req, res, next) => {
  try { res.json(await listDisasters()) } catch (error) { next(error) }
})
router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!useMockData) return res.status(503).json({ error: 'No official alert feed connected. Category administration is disabled.' })
    const parsed = categoryInput.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Enter a category name between 2 and 60 characters.' })
    if ((await listDisasters()).some((item) => item.name.toLowerCase() === parsed.data.name.toLowerCase())) return res.status(409).json({ error: 'That category already exists.' })
    res.status(201).json(await createDisaster(parsed.data))
  } catch (error) { next(error) }
})
router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!useMockData) return res.status(503).json({ error: 'No official alert feed connected. Category administration is disabled.' })
    const parsed = categoryInput.partial().safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Please check the category fields.' })
    const category = await updateDisaster(req.params.id, parsed.data)
    if (!category) return res.status(404).json({ error: 'Category not found.' })
    res.json(category)
  } catch (error) { next(error) }
})
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!useMockData) return res.status(503).json({ error: 'No official alert feed connected. Category administration is disabled.' })
    const category = await removeDisaster(req.params.id)
    if (!category) return res.status(404).json({ error: 'Category not found.' })
    res.json({ success: true })
  } catch (error) { next(error) }
})

export default router