import 'dotenv/config'
import http from 'node:http'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { Server } from 'socket.io'
import Alert from './models/Alert.js'
import User from './models/User.js'
import Report from './models/Report.js'
import Disaster from './models/Disaster.js'
import Location from './models/Location.js'
import Weather from './models/Weather.js'
import Notification from './models/Notification.js'
import ChatSession from './models/ChatSession.js'
import alertsRouter from './routes/alerts.js'
import authRouter from './routes/auth.js'
import dataRouter from './routes/data.js'
import adminRouter from './routes/admin.js'
import disastersRouter from './routes/disasters.js'
import chatRouter from './routes/chat.js'
import detectLanguageRouter from './routes/detectLanguage.js'
import { addUser, findUser, initializeMockData, isMongoConnected, useMockData } from './services/repository.js'
import { sachetAlertCache, startSachetAlertScheduler } from './services/sachetAlertCache.js'

const app = express()
const server = http.createServer(app)
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim())
const io = new Server(server, { cors: { origin: allowedOrigins, methods: ['GET', 'POST', 'PUT', 'DELETE'] } })
app.set('io', io)

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({ origin: allowedOrigins }))
app.use(express.json({ limit: '32kb' }))
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }))
app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  mode: isMongoConnected() ? 'mongodb' : 'memory',
  mockDataEnabled: useMockData,
  officialAlertFeed: useMockData ? 'mock' : sachetAlertCache.status().status,
  latestAlertIssuedAt: sachetAlertCache.status().latestAlertIssuedAt,
}))
app.use('/api/alerts', alertsRouter)
app.use('/api/auth', authRouter)
app.use('/api/admin', adminRouter)
app.use('/api/disasters', disastersRouter)
app.use('/api/chat', chatRouter)
app.use('/api/detect-language', detectLanguageRouter)
app.use('/api', dataRouter)
app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }))
app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: 'Unexpected server error.' })
})

io.on('connection', (socket) => {
  socket.emit('connection:ready', { connectedAt: new Date().toISOString(), mode: isMongoConnected() ? 'mongodb' : 'memory' })
})

async function start() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI)
      await Promise.all([Alert, User, Report, Disaster, Location, Weather, Notification, ChatSession].map((model) => model.createCollection().catch(() => undefined)))
      console.log('MongoDB connected.')
    } catch (error) {
      console.error('MongoDB connection failed; continuing without database persistence:', error.message)
    }
  } else {
    console.log('MONGODB_URI not set; using in-memory storage.')
  }

  await initializeMockData()

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  if (email || password) {
    if (!email || !password) throw new Error('Set both ADMIN_EMAIL and ADMIN_PASSWORD to configure an administrator.')
    if (!(await findUser(email))) {
      await addUser({ name: process.env.ADMIN_NAME?.trim() || email, email, role: 'admin', passwordHash: await bcrypt.hash(password, 12) })
    }
  }

  const port = Number(process.env.PORT || 4000)
  server.listen(port, '0.0.0.0', () => console.log(`Disaster Alert Hub API listening on http://localhost:${port}`))
  if (!useMockData) startSachetAlertScheduler()
}

start()