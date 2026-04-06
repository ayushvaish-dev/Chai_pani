const express = require('express')
const Supply = require('../models/Supply')
const { requireAuth, requireRole } = require('../middleware/auth')
const { getDayRange, getMonthRange } = require('../utils/entries')

const router = express.Router()

router.use(requireAuth, requireRole('vendor'))

router.get('/', async (req, res, next) => {
  try {
    const filters = {}

    if (req.query.month) {
      const { start, end } = getMonthRange(req.query.month)
      filters.date = { $gte: start, $lt: end }
    }

    if (req.query.date) {
      const { start, end } = getDayRange(req.query.date)
      filters.date = { $gte: start, $lt: end }
    }

    const supplies = await Supply.find(filters).sort({ date: -1 })
    res.json({ supplies })
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const date = req.body.date ? new Date(req.body.date) : null
    const teaSupplied = Number(req.body.teaSupplied || 0)

    if (!date || Number.isNaN(date.getTime())) {
      return res.status(400).json({ message: 'Valid supply date is required.' })
    }

    if (!Number.isFinite(teaSupplied) || teaSupplied < 0) {
      return res.status(400).json({ message: 'Tea supplied must be a non-negative number.' })
    }

    const supply = await Supply.create({ date, teaSupplied })
    res.status(201).json({ message: 'Supply record created successfully.', supply })
  } catch (error) {
    next(error)
  }
})

module.exports = router