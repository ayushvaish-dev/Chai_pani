function toNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return 0
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : 0
}

function getMonthRange(month) {
  const [year, monthValue] = String(month).split('-').map(Number)

  if (!year || !monthValue) {
    throw new Error('Month must be in YYYY-MM format.')
  }

  const start = new Date(year, monthValue - 1, 1)
  const end = new Date(year, monthValue, 1)

  return { start, end }
}

function getDayRange(value) {
  const start = new Date(value)

  if (Number.isNaN(start.getTime())) {
    throw new Error('Date must be a valid ISO date string.')
  }

  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return { start, end }
}

function normalizeEntryPayload(payload) {
  const date = payload.date ? new Date(payload.date) : null

  if (!date || Number.isNaN(date.getTime())) {
    throw new Error('A valid date is required.')
  }

  const discount = payload.discount?.type && payload.discount?.amount > 0
    ? {
      type: payload.discount.type,
      amount: toNumber(payload.discount.amount),
    }
    : { type: null, amount: 0 }

  return {
    date,
    morningTea: toNumber(payload.morningTea),
    snacks: toNumber(payload.snacks),
    eveningTea: toNumber(payload.eveningTea),
    teaPrice: toNumber(payload.teaPrice),
    snacksPrice: toNumber(payload.snacksPrice),
    others: {
      description: String(payload.others?.description || '').trim(),
      quantity: toNumber(payload.others?.quantity),
      cost: toNumber(payload.others?.cost),
    },
    discount,
  }
}

function calculateEntryCost(entry, settings) {
  const totalTea = (entry.morningTea || 0) + (entry.eveningTea || 0)
  const totalSnacks = entry.snacks || 0
  const otherCost = entry.others?.cost || 0

  return totalTea * (settings.teaPrice || 0) + totalSnacks * (settings.snackPrice || 0) + otherCost
}

module.exports = {
  calculateEntryCost,
  getDayRange,
  getMonthRange,
  normalizeEntryPayload,
}