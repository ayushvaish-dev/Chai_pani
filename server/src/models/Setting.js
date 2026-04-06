const mongoose = require('mongoose')

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'default',
    },
    teaPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    snackPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model('Setting', settingSchema)