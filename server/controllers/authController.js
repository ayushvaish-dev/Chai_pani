const bcrypt = require('bcrypt')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { sendPasswordResetEmail } = require('../utils/email')

const PASSWORD_RESET_WINDOW_MS = 60 * 60 * 1000

function buildAuthResponse(user, token, message) {
  const redirectPath = user.role === 'vendor' ? '/vendor-dashboard' : '/employee-dashboard'

  return {
    success: true,
    message,
    token,
    redirectPath,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  }
}

function createToken(user) {
  return jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  })
}

function buildResetToken() {
  const rawToken = crypto.randomBytes(32).toString('hex')
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')

  return {
    rawToken,
    hashedToken,
    expiresAt: new Date(Date.now() + PASSWORD_RESET_WINDOW_MS),
  }
}

function getClientBaseUrl() {
  return String(process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '')
}

function isProduction() {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production'
}

async function register(req, res) {
  try {
    const name = String(req.body.name || '').trim()
    const email = String(req.body.email || '').trim().toLowerCase()
    const password = String(req.body.password || '')
    const role = req.body.role === 'vendor' ? 'vendor' : 'employee'

    if (!name || !email || !password || !req.body.role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required',
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      })
    }

    const existingUser = await User.findOne({ email })

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists',
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    })

    const token = createToken(user)

    return res.status(201).json(buildAuthResponse(user, token, 'User registered successfully'))
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while registering user',
    })
  }
}

async function login(req, res) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()
    const password = String(req.body.password || '')

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      })
    }

    const user = await User.findOne({ email })

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      })
    }

    const token = createToken(user)
    return res.status(200).json(buildAuthResponse(user, token, 'Login successful'))
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while logging in',
    })
  }
}

async function getProfile(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Profile fetched successfully',
    user: req.user,
  })
}

async function forgotPassword(req, res) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      })
    }

    const user = await User.findOne({ email })

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If that email is registered, a password reset link has been sent.',
      })
    }

    const { rawToken, hashedToken, expiresAt } = buildResetToken()
    user.passwordResetToken = hashedToken
    user.passwordResetExpiresAt = expiresAt
    await user.save()

    const resetLink = `${getClientBaseUrl()}/reset-password?token=${rawToken}`

    let deliveryInfo = null

    try {
      deliveryInfo = await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        resetLink,
      })
    } catch (emailError) {
      user.passwordResetToken = undefined
      user.passwordResetExpiresAt = undefined
      await user.save()

      return res.status(500).json({
        success: false,
        message: emailError.message || 'Unable to send password reset email',
      })
    }

    if (!isProduction()) {
      console.log('Password reset email accepted by provider:', {
        email: user.email,
        messageId: deliveryInfo?.messageId,
        accepted: deliveryInfo?.accepted,
        rejected: deliveryInfo?.rejected,
        response: deliveryInfo?.response,
      })
    }

    return res.status(200).json({
      success: true,
      message: 'If that email is registered, a password reset link has been sent.',
      ...(!isProduction() && {
        debugResetLink: resetLink,
        emailDelivery: deliveryInfo,
      }),
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while requesting password reset',
    })
  }
}

async function resetPassword(req, res) {
  try {
    const token = String(req.body.token || '').trim()
    const password = String(req.body.password || '')

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required',
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      })
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiresAt: { $gt: new Date() },
    })

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'This password reset link is invalid or has expired',
      })
    }

    user.password = await bcrypt.hash(password, 10)
    user.passwordResetToken = undefined
    user.passwordResetExpiresAt = undefined
    await user.save()

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully. Please log in with your new password.',
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while resetting password',
    })
  }
}

module.exports = {
  register,
  login,
  getProfile,
  forgotPassword,
  resetPassword,
}