import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import Alert from '../models/Alert.js'
import User from '../models/User.js'
import Disaster from '../models/Disaster.js'
import Location from '../models/Location.js'
import Weather from '../models/Weather.js'
import Notification from '../models/Notification.js'
import Report from '../models/Report.js'
import ChatSession from '../models/ChatSession.js'

if (process.env.USE_MOCK_DATA !== 'true') throw new Error('Set USE_MOCK_DATA=true to seed mock records.')
if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI before running the seed script.')
const { demoAlerts, demoCategories } = await import('../../mock/demoAlerts.js')
await mongoose.connect(process.env.MONGODB_URI)
await Promise.all([Alert, User, Report, Disaster, Location, Weather, Notification, ChatSession].map((model) => model.createCollection().catch(() => undefined)))
if (await Alert.countDocuments() === 0) await Alert.insertMany(demoAlerts)
if (await Disaster.countDocuments() === 0) await Disaster.insertMany(demoCategories.map((name) => ({ name })))
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD
if (email || password) {
  if (!email || !password) throw new Error('Set both ADMIN_EMAIL and ADMIN_PASSWORD to configure an administrator.')
  if (!(await User.findOne({ email }))) await User.create({ name: process.env.ADMIN_NAME?.trim() || email, email, role: 'admin', passwordHash: await bcrypt.hash(password, 12) })
}
console.log(`Mock data seeded. Administrator configured: ${Boolean(email)}`)
await mongoose.disconnect()