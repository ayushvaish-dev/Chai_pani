const express = require('express')
const { Parser } = require('json2csv')
const Entry = require('../models/Entry')
const Supply = require('../models/Supply')
const { requireAuth } = require('../middleware/auth')
const { calculateEntryCost, getMonthRange } = require('../utils/entries')
const { getOrCreateSettings } = require('../utils/settings')

const router = express.Router()

function buildMonthlySummary(entries, settings, role) {
  const groupedEntries = new Map()

  for (const entry of entries) {
    const employeeName = entry.userId?.name || 'Unknown'
    const employeeKey = String(entry.userId?._id || employeeName)
    const current = groupedEntries.get(employeeKey) || {
      userId: entry.userId?._id,
      employeeName,
      totalTea: 0,
      totalSnacks: 0,
      otherQuantity: 0,
      otherCost: 0,
      estimatedCost: 0,
    }

    current.totalTea += (entry.drinkType === 'coffee'
      ? ((entry.coffeeCups || 0) || ((entry.morningTea || 0) + (entry.eveningTea || 0)))
      : (entry.morningTea || 0) + (entry.eveningTea || 0) + (entry.coffeeCups || 0))
  current.totalSnacks += entry.snacks || 0
    current.otherQuantity += entry.others?.quantity || 0
    current.otherCost += entry.others?.cost || 0
    current.estimatedCost += calculateEntryCost(entry, settings)

    groupedEntries.set(employeeKey, current)
  }

  const employees = Array.from(groupedEntries.values()).sort((left, right) =>
    left.employeeName.localeCompare(right.employeeName),
  )

  const totals = employees.reduce(
    (accumulator, item) => {
      accumulator.totalTea += item.totalTea
      accumulator.totalSnacks += item.totalSnacks
      accumulator.otherQuantity += item.otherQuantity
      accumulator.otherCost += item.otherCost
      accumulator.estimatedCost += item.estimatedCost
      return accumulator
    },
    {
      totalTea: 0,
      totalSnacks: 0,
      otherQuantity: 0,
      otherCost: 0,
      estimatedCost: 0,
    },
  )

  if (role === 'employee') {
    return {
      employees: employees.slice(0, 1),
      totals,
    }
  }

  return { employees, totals }
}

router.get('/monthly', requireAuth, async (req, res, next) => {
  try {
    const selectedMonth = req.query.month || new Date().toISOString().slice(0, 7)
    const { start, end } = getMonthRange(selectedMonth)
    const filters = { date: { $gte: start, $lt: end } }

    if (req.user.role === 'employee') {
      filters.userId = req.user._id
    }

    const [entries, settings] = await Promise.all([
      Entry.find(filters).populate('userId', 'name').sort({ date: 1 }),
      getOrCreateSettings(),
    ])

    const supplies = await Supply.find({ date: { $gte: start, $lt: end } }).sort({ date: 1 })

    const summary = buildMonthlySummary(entries, settings, req.user.role)
    const totalTeaSupplied = supplies.reduce((accumulator, item) => accumulator + (item.teaSupplied || 0), 0)

    res.json({
      month: selectedMonth,
      settings,
      summary,
      supplySummary: {
        totalTeaSupplied,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.get('/monthly.csv', requireAuth, async (req, res, next) => {
  try {
    const selectedMonth = req.query.month || new Date().toISOString().slice(0, 7)
    const { start, end } = getMonthRange(selectedMonth)
    const filters = { date: { $gte: start, $lt: end } }

    if (req.user.role === 'employee') {
      filters.userId = req.user._id
    }

    const [entries, settings] = await Promise.all([
      Entry.find(filters).populate('userId', 'name').sort({ date: 1 }),
      getOrCreateSettings(),
    ])

    const { employees } = buildMonthlySummary(entries, settings, req.user.role)
    const parser = new Parser({
      fields: [
        { label: 'Employee Name', value: 'employeeName' },
        { label: 'Total Tea Cups', value: 'totalTea' },
        { label: 'Total Snacks', value: 'totalSnacks' },
        { label: 'Other Quantity', value: 'otherQuantity' },
        { label: 'Other Cost', value: 'otherCost' },
        { label: 'Estimated Monthly Cost', value: 'estimatedCost' },
      ],
    })

    const csv = parser.parse(employees)

    res.header('Content-Type', 'text/csv')
    res.attachment(`chai-hisaab-${selectedMonth}.csv`)
    res.send(csv)
  } catch (error) {
    next(error)
  }
})

module.exports = router