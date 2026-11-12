import mongoose from 'mongoose'
import Alert from '../models/Alert.js'
import User from '../models/User.js'
import Report from '../models/Report.js'
import Disaster from '../models/Disaster.js'
import Notification from '../models/Notification.js'
import ChatSession from '../models/ChatSession.js'

const memory = {
  alerts: [],
  users: [],
  reports: [],
  disasters: [],
  notifications: [],
  chatSessions: new Map(),
}

export const useMockData = process.env.USE_MOCK_DATA === 'true'
export const isMongoConnected = () => mongoose.connection.readyState === 1

export async function initializeMockData() {
  if (!useMockData) return
  const { demoAlerts, demoCategories } = await import('../../mock/demoAlerts.js')
  memory.alerts = demoAlerts.map((alert) => ({ ...alert, _id: alert.alertId }))
  memory.disasters = demoCategories.map((name) => ({ _id: name, name, description: '', active: true }))

  if (isMongoConnected()) {
    if (await Alert.countDocuments() === 0) await Alert.insertMany(demoAlerts)
    if (await Disaster.countDocuments() === 0) await Disaster.insertMany(demoCategories.map((name) => ({ name })))
  }
}

export async function listAlerts() {
  if (!useMockData) return []
  return isMongoConnected() ? Alert.find().sort({ timestamp: -1 }).lean() : [...memory.alerts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}

export async function findAlert(id) {
  if (!useMockData) return null
  return isMongoConnected() ? Alert.findOne({ $or: [{ alertId: id }, { _id: mongoose.isValidObjectId(id) ? id : null }] }).lean() : memory.alerts.find((alert) => alert.alertId === id || alert._id === id)
}

export async function createAlert(value) {
  if (!useMockData) throw new Error('Alert administration is disabled because official SACHET/NDMA alerts are read-only.')
  if (isMongoConnected()) return (await Alert.create(value)).toObject()
  const alert = { ...value, _id: value.alertId, timestamp: value.timestamp || new Date().toISOString() }
  memory.alerts.unshift(alert)
  return alert
}

export async function updateAlert(id, value) {
  if (!useMockData) throw new Error('Alert administration is disabled because official SACHET/NDMA alerts are read-only.')
  if (isMongoConnected()) return Alert.findOneAndUpdate({ $or: [{ alertId: id }, { _id: mongoose.isValidObjectId(id) ? id : null }] }, value, { new: true, runValidators: true }).lean()
  const index = memory.alerts.findIndex((alert) => alert.alertId === id || alert._id === id)
  if (index < 0) return null
  memory.alerts[index] = { ...memory.alerts[index], ...value }
  return memory.alerts[index]
}

export async function removeAlert(id) {
  if (!useMockData) throw new Error('Alert administration is disabled because official SACHET/NDMA alerts are read-only.')
  if (isMongoConnected()) return Alert.findOneAndDelete({ $or: [{ alertId: id }, { _id: mongoose.isValidObjectId(id) ? id : null }] }).lean()
  const index = memory.alerts.findIndex((alert) => alert.alertId === id || alert._id === id)
  return index < 0 ? null : memory.alerts.splice(index, 1)[0]
}

export async function findUser(email) {
  return isMongoConnected() ? User.findOne({ email: email.toLowerCase() }) : memory.users.find((user) => user.email === email.toLowerCase())
}

export async function listUsers() {
  return isMongoConnected() ? User.find().select('-passwordHash').lean() : memory.users.map(({ passwordHash, ...user }) => user)
}

export async function updateUserRole(id, role) {
  if (isMongoConnected()) return User.findByIdAndUpdate(id, { role }, { new: true, runValidators: true }).select('-passwordHash').lean()
  const user = memory.users.find((item) => item._id === id)
  if (!user) return null
  user.role = role
  const { passwordHash, ...safeUser } = user
  return safeUser
}

export async function removeUser(id) {
  if (isMongoConnected()) return User.findByIdAndDelete(id).select('-passwordHash').lean()
  const index = memory.users.findIndex((item) => item._id === id)
  if (index < 0) return null
  const [user] = memory.users.splice(index, 1)
  const { passwordHash, ...safeUser } = user
  return safeUser
}

export async function addUser(user) {
  if (isMongoConnected()) return User.create(user)
  memory.users.push({ ...user, _id: crypto.randomUUID() })
  return memory.users.at(-1)
}

export async function listReports() {
  return isMongoConnected() ? Report.find().sort({ createdAt: -1 }).lean() : [...memory.reports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function addReport(report) {
  if (isMongoConnected()) return (await Report.create(report)).toObject()
  const saved = { ...report, _id: crypto.randomUUID(), createdAt: new Date().toISOString() }
  memory.reports.unshift(saved)
  return saved
}

export async function listDisasters() {
  if (!useMockData) return []
  return isMongoConnected() ? Disaster.find().sort({ name: 1 }).lean() : [...memory.disasters].sort((a, b) => a.name.localeCompare(b.name))
}

export async function createDisaster(value) {
  if (!useMockData) throw new Error('Category administration is disabled for the live SACHET/NDMA feed.')
  if (isMongoConnected()) return (await Disaster.create(value)).toObject()
  const saved = { ...value, _id: value.name }
  memory.disasters.push(saved)
  return saved
}

export async function updateDisaster(id, value) {
  if (!useMockData) throw new Error('Category administration is disabled for the live SACHET/NDMA feed.')
  if (isMongoConnected()) return Disaster.findOneAndUpdate({ $or: [{ _id: id }, { name: id }] }, value, { new: true, runValidators: true }).lean()
  const index = memory.disasters.findIndex((item) => item._id === id || item.name === id)
  if (index < 0) return null
  memory.disasters[index] = { ...memory.disasters[index], ...value }
  memory.disasters[index]._id = memory.disasters[index].name
  return memory.disasters[index]
}

export async function removeDisaster(id) {
  if (!useMockData) throw new Error('Category administration is disabled for the live SACHET/NDMA feed.')
  if (isMongoConnected()) return Disaster.findOneAndDelete({ $or: [{ _id: id }, { name: id }] }).lean()
  const index = memory.disasters.findIndex((item) => item._id === id || item.name === id)
  return index < 0 ? null : memory.disasters.splice(index, 1)[0]
}

export async function createNotification(value) {
  if (isMongoConnected()) return (await Notification.create(value)).toObject()
  const saved = { ...value, _id: crypto.randomUUID(), createdAt: new Date().toISOString(), read: false }
  memory.notifications.unshift(saved)
  return saved
}

export async function listNotifications() {
  return isMongoConnected()
    ? Notification.find(useMockData ? {} : { type: 'report' }).sort({ createdAt: -1 }).limit(30).lean()
    : memory.notifications.filter((item) => useMockData || item.type === 'report').slice(0, 30)
}

export async function getChatMessages(sessionId) {
  if (isMongoConnected()) {
    const session = await ChatSession.findOne({ sessionId }).lean()
    return session?.messages || []
  }
  return memory.chatSessions.get(sessionId)?.messages || []
}

export async function saveChatMessages(sessionId, messages, userId = null) {
  const boundedMessages = messages.slice(-24)
  if (isMongoConnected()) {
    return ChatSession.findOneAndUpdate(
      { sessionId },
      { $set: { messages: boundedMessages, userId }, $setOnInsert: { sessionId } },
      { upsert: true, new: true, runValidators: true },
    ).lean()
  }
  const previous = memory.chatSessions.get(sessionId)
  const session = { sessionId, userId, messages: boundedMessages, createdAt: previous?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() }
  memory.chatSessions.set(sessionId, session)
  return session
}