const express = require('express')
const Entry = require('../models/Entry')
const { requireAuth, requireRole } = require('../middleware/auth')
const { getDayRange, getMonthRange, normalizeEntryPayload } = require('../utils/entries')

const router = express.Router()

router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    const filters = {}

    if (req.user.role === 'employee') {
      filters.userId = req.user._id
    }

    if (req.query.employeeId && req.user.role === 'vendor') {
      filters.userId = req.query.employeeId
    }

    if (req.query.month) {
      const { start, end } = getMonthRange(req.query.month)
      filters.date = { $gte: start, $lt: end }
    }

    if (req.query.date) {
      const { start, end } = getDayRange(req.query.date)
      filters.date = { $gte: start, $lt: end }
    }

    const entries = await Entry.find(filters)
      .populate('userId', 'name email role')
      .sort({ date: -1, createdAt: -1 })

    res.json({ entries })
  } catch (error) {
    next(error)
  }
})

router.post('/', requireRole('employee'), async (req, res, next) => {
  try {
    const payload = normalizeEntryPayload(req.body)
    const entry = await Entry.create({
      ...payload,
      userId: req.user._id,
    })

    const populatedEntry = await entry.populate('userId', 'name email role')

    res.status(201).json({ message: 'Entry saved successfully.', entry: populatedEntry })
  } catch (error) {
    next(error)
  }
})

router.put('/:id', requireRole('employee'), async (req, res, next) => {
  try {
    const payload = normalizeEntryPayload(req.body)
    const entry = await Entry.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, payload, {
      new: true,
      runValidators: true,
    }).populate('userId', 'name email role')

    if (!entry) {
      return res.status(404).json({ message: 'Entry not found.' })
    }

    res.json({ message: 'Entry updated successfully.', entry })
  } catch (error) {
    next(error)
  }
})

module.exports = router