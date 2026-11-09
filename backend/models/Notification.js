import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['critical-alert', 'report', 'system'], default: 'system' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  alertId: { type: String, default: '' },
  read: { type: Boolean, default: false },
}, { timestamps: true })

export default mongoose.model('Notification', notificationSchema)