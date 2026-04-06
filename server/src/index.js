require('dotenv').config()

const cors = require('cors')
const express = require('express')
const connectDB = require('./config/db')
const authRouter = require('./routes/auth')
const entriesRouter = require('./routes/entries')
const settingsRouter = require('./routes/settings')
const summaryRouter = require('./routes/summary')
const suppliesRouter = require('./routes/supplies')

const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
app.use('/api/entries', entriesRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/summary', summaryRouter)
app.use('/api/supplies', suppliesRouter)

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' })
})

app.use((error, req, res, next) => {
  const statusCode = error.name === 'ValidationError' ? 400 : 500
  res.status(statusCode).json({
    message: error.message || 'Something went wrong.',
  })
})

async function startServer() {
  try {
    await connectDB()
    app.listen(port, () => {
      console.log(`Server running on port ${port}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error.message)
    process.exit(1)
  }
}

startServer()