const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is not set')

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'unauthorized' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.userId   = decoded.userId
    req.dbUserId = decoded.dbUserId ?? 1
    req.email    = decoded.email    || null
    req.prismaId = decoded.prismaId || null
    next()
  } catch {
    res.status(401).json({ error: 'invalid token' })
  }
}

module.exports = { requireAuth, JWT_SECRET }
