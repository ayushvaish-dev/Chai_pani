const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

function createToken(user) {
  return jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

router.post('/signup', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim()
    const email = String(req.body.email || '').trim().toLowerCase()
    const password = String(req.body.password || '')
    const role = req.body.role === 'vendor' ? 'vendor' : 'employee'

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' })
    }

    const existingUser = await User.findOne({ email })

    if (existingUser) {
      return res.status(409).json({ message: 'Email is already registered.' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    })

    const token = createToken(user)

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()
    const password = String(req.body.password || '')

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' })
    }

    const user = await User.findOne({ email })

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    const token = createToken(user)

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user })
})

module.exports = router