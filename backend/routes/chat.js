import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { answerChat } from '../services/chatService.js'
import { chatLanguageByCode } from '../../shared/chatLanguages.js'

const router = Router()
const chatLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Chat limit reached. Please try again shortly.' } })
const chatInput = z.object({
  message: z.string().trim().min(1).max(1000),
  conversationId: z.string().regex(/^[A-Za-z0-9_-]{8,80}$/),
  alertId: z.string().max(40).optional(),
  language: z.string().refine((value) => value === 'auto' || Boolean(chatLanguageByCode[value])).optional(),
})

router.post('/', chatLimiter, async (req, res, next) => {
  try {
    const parsed = chatInput.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Enter a message and valid conversation ID.' })
    res.json(await answerChat(parsed.data))
  } catch (error) { next(error) }
})

export default router