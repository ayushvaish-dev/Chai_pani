const mongoose = require('mongoose')

const otherItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      trim: true,
      default: '',
    },
    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false },
)

const entrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    morningTea: {
      type: Number,
      default: 0,
      min: 0,
    },
    snacks: {
      type: Number,
      default: 0,
      min: 0,
    },
    eveningTea: {
      type: Number,
      default: 0,
      min: 0,
    },
    drinkType: {
      type: String,
      enum: ['tea', 'coffee', 'both'],
      default: 'tea',
    },
    coffeeCups: {
      type: Number,
      default: 0,
      min: 0,
    },
    coffeePrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    others: {
      type: otherItemSchema,
      default: () => ({}),
    },
    teaPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    snacksPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: {
        type: String,
        enum: ['percent', 'rupees'],
        default: null,
      },
      amount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
  },
  {
    timestamps: true,
  },
)

entrySchema.index({ date: -1, userId: 1 })

module.exports = mongoose.model('Entry', entrySchema)