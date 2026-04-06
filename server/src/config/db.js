const mongoose = require('mongoose')

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI

  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing in the environment configuration.')
  }

  await mongoose.connect(mongoUri)
}

module.exports = connectDB