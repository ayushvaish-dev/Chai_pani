const mongoose = require('mongoose')

const supplySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    teaSupplied: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
)

supplySchema.index({ date: -1 })

module.exports = mongoose.model('Supply', supplySchema)