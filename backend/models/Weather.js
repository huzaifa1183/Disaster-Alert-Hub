import mongoose from 'mongoose'

const weatherSchema = new mongoose.Schema({
  city: { type: String, required: true },
  temperature: Number,
  humidity: Number,
  windSpeed: Number,
  rainfall: Number,
  condition: String,
  visibility: Number,
  source: { type: String, required: true },
  observedAt: { type: Date, required: true },
}, { timestamps: true, collection: 'weather' })

export default mongoose.model('Weather', weatherSchema)