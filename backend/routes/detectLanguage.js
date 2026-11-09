import { Router } from 'express'
import { z } from 'zod'
import { detectLanguage } from '../services/languageDetection.js'

const router = Router()
router.post('/', (req, res) => {
  const parsed = z.object({ text: z.string().trim().min(1).max(1000) }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Enter text to detect its language.' })
  res.json(detectLanguage(parsed.data.text))
})

export default router