import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  if (!process.env.JWT_SECRET) return res.status(503).json({ error: 'Authentication is unavailable until JWT_SECRET is configured.' })
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Authentication required.' })
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Session expired. Please sign in again.' })
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' })
  next()
}