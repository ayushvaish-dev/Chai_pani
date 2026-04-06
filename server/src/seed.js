require('dotenv').config()

const connectDB = require('./config/db')
const Entry = require('./models/Entry')
const Setting = require('./models/Setting')

function currentMonthDate(day) {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), day)
}

const sampleEntries = [
  {
    employeeName: 'Aman',
    date: currentMonthDate(1),
    morningTea: 2,
    morningSnacks: 1,
    eveningTea: 1,
    eveningSnacks: 0,
    others: { description: 'Biscuits', quantity: 1, cost: 25 },
  },
  {
    employeeName: 'Neha',
    date: currentMonthDate(1),
    morningTea: 1,
    morningSnacks: 0,
    eveningTea: 1,
    eveningSnacks: 1,
    others: { description: '', quantity: 0, cost: 0 },
  },
  {
    employeeName: 'Ravi',
    date: currentMonthDate(2),
    morningTea: 2,
    morningSnacks: 1,
    eveningTea: 2,
    eveningSnacks: 1,
    others: { description: 'Cold drink', quantity: 1, cost: 40 },
  },
  {
    employeeName: 'Priya',
    date: currentMonthDate(3),
    morningTea: 1,
    morningSnacks: 1,
    eveningTea: 1,
    eveningSnacks: 1,
    others: { description: '', quantity: 0, cost: 0 },
  },
  {
    employeeName: 'Aman',
    date: currentMonthDate(4),
    morningTea: 1,
    morningSnacks: 0,
    eveningTea: 2,
    eveningSnacks: 1,
    others: { description: 'Samosa', quantity: 2, cost: 30 },
  },
  {
    employeeName: 'Neha',
    date: currentMonthDate(4),
    morningTea: 2,
    morningSnacks: 1,
    eveningTea: 1,
    eveningSnacks: 0,
    others: { description: 'Juice', quantity: 1, cost: 35 },
  },
]

async function seed() {
  try {
    await connectDB()

    await Setting.findOneAndUpdate(
      { key: 'default' },
      { key: 'default', teaPrice: 0, snackPrice: 0 },
      { upsert: true, new: true },
    )

    await Entry.deleteMany({})
    await Entry.insertMany(sampleEntries)

    console.log('Sample data seeded successfully.')
    process.exit(0)
  } catch (error) {
    console.error('Failed to seed sample data:', error.message)
    process.exit(1)
  }
}

seed()