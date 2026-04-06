const express = require('express')
const { requireAuth, requireRole } = require('../middleware/auth')
const { getOrCreateSettings } = require('../utils/settings')

const router = express.Router()

router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings()
    res.json({ settings })
  } catch (error) {
    next(error)
  }
})

router.put('/', requireRole('vendor'), async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings()

    settings.teaPrice = Number(req.body.teaPrice) >= 0 ? Number(req.body.teaPrice) : settings.teaPrice
    settings.snackPrice = Number(req.body.snackPrice) >= 0 ? Number(req.body.snackPrice) : settings.snackPrice

    await settings.save()

    res.json({ message: 'Pricing updated successfully.', settings })
  } catch (error) {
    next(error)
  }
})

module.exports = router