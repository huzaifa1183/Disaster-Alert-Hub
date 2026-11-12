import mongoose from 'mongoose'

const alertSchema = new mongoose.Schema({
  alertId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  disasterType: { type: String, required: true },
  severity: { type: String, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], required: true },
  state: { type: String, required: true },
  district: { type: String, required: true },
  city: { type: String, default: '' },
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  description: { type: String, required: true, maxlength: 2000 },
  source: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  verificationStatus: { type: String, enum: ['Verified', 'Unconfirmed', 'Conflicting'], default: 'Unconfirmed' },
  confidenceScore: { type: Number, min: 0, max: 1, default: 0.5 },
  affectedArea: { type: String, default: '' },
  safetyInstructions: { type: [String], default: [] },
}, { timestamps: true })

export default mongoose.model('Alert', alertSchema)