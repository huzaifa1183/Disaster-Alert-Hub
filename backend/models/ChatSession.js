import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true, maxlength: 3000 },
  timestamp: { type: Date, default: Date.now },
}, { _id: false })

const chatSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, default: null },
  messages: { type: [messageSchema], default: [] },
}, { timestamps: true, collection: 'chatSessions' })

export default mongoose.model('ChatSession', chatSessionSchema)