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
    drinkType: payload.drinkType === 'coffee' || payload.drinkType === 'both' ? payload.drinkType : 'tea',
    coffeeCups: toNumber(payload.coffeeCups),
    teaPrice: toNumber(payload.teaPrice),
    coffeePrice: toNumber(payload.coffeePrice),
    snacksPrice: toNumber(payload.snacksPrice),
    others: {
      description: String(payload.others?.description || '').trim(),
      quantity: toNumber(payload.others?.quantity),
      cost: toNumber(payload.others?.cost),
    },
    discount,
  }
}

function drinkQuantities(entry) {
  if (entry?.drinkType === 'coffee') {
    const cups = (entry.coffeeCups || 0) || ((entry.morningTea || 0) + (entry.eveningTea || 0))
    return { teaCups: 0, coffeeCups: cups }
  }

  if (entry?.drinkType === 'both') {
    return { teaCups: entry.morningTea || 0, coffeeCups: entry.coffeeCups || 0 }
  }

  return {
    teaCups: (entry?.morningTea || 0) + (entry?.eveningTea || 0),
    coffeeCups: entry?.coffeeCups || 0,
  }
}

function calculateEntryCost(entry, settings) {
  const { teaCups, coffeeCups } = drinkQuantities(entry)
  const teaRate = Number(entry.teaPrice) > 0 ? Number(entry.teaPrice) : (settings.teaPrice || 0)
  const coffeeRate = Number(entry.coffeePrice) > 0
    ? Number(entry.coffeePrice)
    : (entry.drinkType === 'coffee' && Number(entry.teaPrice) > 0 ? Number(entry.teaPrice) : 0)
  const snackRate = entry.snacksPrice == null ? (settings.snackPrice || 0) : (Number(entry.snacksPrice) || 0)
  const otherCost = entry.others?.cost || 0

  return teaCups * teaRate + coffeeCups * coffeeRate + (entry.snacks || 0) * snackRate + otherCost
}

module.exports = {
  calculateEntryCost,
  getDayRange,
  getMonthRange,
  normalizeEntryPayload,
}