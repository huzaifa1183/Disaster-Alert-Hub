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
import { demoAlerts } from '../shared/demoAlerts.js'
import { addUser, findUser } from './services/repository.js'

const demoCategories = ['Flood', 'Heavy Rain', 'Cyclone', 'Thunderstorm', 'Heatwave', 'Lightning', 'Earthquake', 'Landslide', 'Tsunami', 'Strong Winds']

const app = express()
const server = http.createServer(app)
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim())
const io = new Server(server, { cors: { origin: allowedOrigins, methods: ['GET', 'POST', 'PUT', 'DELETE'] } })
app.set('io', io)

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({ origin: allowedOrigins }))
app.use(express.json({ limit: '32kb' }))
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }))
app.get('/api/health', (_req, res) => res.json({ status: 'ok', mode: mongoose.connection.readyState === 1 ? 'mongodb' : 'demo-memory' }))
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
  socket.emit('connection:ready', { connectedAt: new Date().toISOString(), mode: mongoose.connection.readyState === 1 ? 'mongodb' : 'demo-memory' })
})

async function start() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI)
      await Promise.all([Alert, User, Report, Disaster, Location, Weather, Notification, ChatSession].map((model) => model.createCollection().catch(() => undefined)))
      if (await Alert.countDocuments() === 0) await Alert.insertMany(demoAlerts)
      if (await Disaster.countDocuments() === 0) await Disaster.insertMany(demoCategories.map((name) => ({ name })))
      const email = (process.env.ADMIN_EMAIL || 'admin@demo.com').toLowerCase()
      if (!(await User.findOne({ email }))) {
        await User.create({ name: 'Demo Administrator', email, role: 'admin', passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'DemoAdmin123!', 12) })
      }
      console.log('MongoDB connected; demo data seeded if collections were empty.')
    } catch (error) {
      console.error('MongoDB connection failed; continuing in in-memory demo mode:', error.message)
    }
  } else {
    console.log('MONGODB_URI not set; using in-memory demo data.')
  }

  const email = (process.env.ADMIN_EMAIL || 'admin@demo.com').toLowerCase()
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'DemoAdmin123!', 12)
  if (!(await findUser(email))) await addUser({ name: 'Demo Administrator', email, role: 'admin', passwordHash })
  const port = Number(process.env.PORT || 4000)
  server.listen(port, '0.0.0.0', () => console.log(`Disaster Alert Hub API listening on http://localhost:${port}`))
}

start()