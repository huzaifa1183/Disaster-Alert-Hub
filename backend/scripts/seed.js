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
import { demoAlerts } from '../../shared/demoAlerts.js'

if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI before running the seed script.')
await mongoose.connect(process.env.MONGODB_URI)
await Promise.all([Alert, User, Report, Disaster, Location, Weather, Notification, ChatSession].map((model) => model.createCollection().catch(() => undefined)))
if (await Alert.countDocuments() === 0) await Alert.insertMany(demoAlerts)
if (await Disaster.countDocuments() === 0) await Disaster.insertMany(['Flood', 'Heavy Rain', 'Cyclone', 'Thunderstorm', 'Heatwave', 'Lightning', 'Earthquake', 'Landslide', 'Tsunami', 'Strong Winds'].map((name) => ({ name })))
const email = (process.env.ADMIN_EMAIL || 'admin@demo.com').toLowerCase()
if (!(await User.findOne({ email }))) await User.create({ name: 'Demo Administrator', email, role: 'admin', passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'DemoAdmin123!', 12) })
console.log(`Database seeded with demo alerts. Admin: ${email}`)
await mongoose.disconnect()