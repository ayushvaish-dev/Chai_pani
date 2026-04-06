const jwt = require('jsonwebtoken')
const User = require('../models/User')

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!token) {
      return res.status(401).json({ message: 'Authentication required.' })
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(payload.userId).select('-password')

    if (!user) {
      return res.status(401).json({ message: 'Invalid authentication token.' })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' })
  }
}

function requireRole(...roles) {
  return function checkRole(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied for this role.' })
    }

    next()
  }
}

module.exports = {
  requireAuth,
  requireRole,
}