const Setting = require('../models/Setting')

async function getOrCreateSettings() {
  const settings = await Setting.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: { key: 'default', teaPrice: 0, snackPrice: 0 } },
    { upsert: true, new: true }
  )

  return settings
}

module.exports = {
  getOrCreateSettings,
}