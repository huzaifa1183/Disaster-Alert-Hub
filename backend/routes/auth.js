import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { addUser, findUser } from '../services/repository.js'

const router = Router()
const credentials = z.object({ email: z.string().email().max(200), password: z.string().min(8).max(128) })

router.post('/login', async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) return res.status(503).json({ error: 'Authentication is unavailable until JWT_SECRET is configured.' })
    const parsed = credentials.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email and password (at least 8 characters).' })
    const user = await findUser(parsed.data.email)
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' })
    const token = jwt.sign({ sub: user._id, email: user.email, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '8h' })
    res.json({ token, user: { name: user.name, email: user.email, role: user.role } })
  } catch (error) { next(error) }
})

router.post('/register', async (req, res, next) => {
  try {
    const parsed = credentials.extend({ name: z.string().min(2).max(100) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Enter your name, a valid email and a password of at least 8 characters.' })
    if (await findUser(parsed.data.email)) return res.status(409).json({ error: 'An account with that email already exists.' })
    const user = await addUser({ ...parsed.data, email: parsed.data.email.toLowerCase(), passwordHash: await bcrypt.hash(parsed.data.password, 12), role: 'user' })
    res.status(201).json({ success: true, user: { name: user.name, email: user.email, role: user.role } })
  } catch (error) { next(error) }
})

export default router