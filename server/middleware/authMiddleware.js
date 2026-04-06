const jwt = require('jsonwebtoken')
const User = require('../models/User')

async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select('-password')

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token user',
      })
    }

    req.user = user
    return next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token is invalid or expired',
    })
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied for this role',
      })
    }

    return next()
  }
}

module.exports = {
  protect,
  authorize,
}