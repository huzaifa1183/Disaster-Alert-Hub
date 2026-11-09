import mongoose from 'mongoose'

const locationSchema = new mongoose.Schema({
  state: { type: String, required: true },
  district: { type: String, required: true },
  city: { type: String, default: '' },
  latitude: { type: Number, min: -90, max: 90 },
  longitude: { type: Number, min: -180, max: 180 },
}, { timestamps: true })

export default mongoose.model('Location', locationSchema)