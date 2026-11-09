import mongoose from 'mongoose'

const reportSchema = new mongoose.Schema({
  text: { type: String, required: true, maxlength: 2000 },
  location: { type: String, default: '' },
  category: { type: String, default: 'Unknown' },
  status: { type: String, enum: ['Pending', 'Reviewed'], default: 'Pending' },
  source: { type: String, default: 'Citizen report' },
}, { timestamps: true })

export default mongoose.model('Report', reportSchema)