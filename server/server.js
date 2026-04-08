require('dotenv').config()

const express = require('express')
const cors = require('cors')
const connectDB = require('./config/db')
const authRoutes = require('./routes/authRoutes')
const { protect, authorize } = require('./middleware/authMiddleware')
const entriesRouter = require('./src/routes/entries')
const settingsRouter = require('./src/routes/settings')
const summaryRouter = require('./src/routes/summary')

const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Auth API is running',
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/entries', entriesRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/summary', summaryRouter)

app.get('/api/vendor-dashboard', protect, authorize('vendor'), (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Welcome to Vendor Dashboard',
    redirectPath: '/vendor-dashboard',
  })
})

app.get('/api/employee-dashboard', protect, authorize('employee'), (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Welcome to Employee Dashboard',
    redirectPath: '/employee-dashboard',
  })
})

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: 'Route not found',
  })
})

app.use((err, req, res, next) => {
  console.error('Error:', err.message)
  const status = err.statusCode || 500
  const message = err.message || 'Internal server error'
  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
})

connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`)
  })
})