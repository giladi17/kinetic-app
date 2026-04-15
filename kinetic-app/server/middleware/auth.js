const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'kinetic-secret'

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'unauthorized' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.userId   = decoded.userId            // users_auth.id
    req.dbUserId = decoded.dbUserId ?? 1    // users.id — legacy tokens fall back to 1
    next()
  } catch {
    res.status(401).json({ error: 'invalid token' })
  }
}

module.exports = { requireAuth, JWT_SECRET }
