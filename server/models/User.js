const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    passwordResetToken: {
      type: String,
    },
    passwordResetExpiresAt: {
      type: Date,
    },
    role: {
      type: String,
      enum: ['vendor', 'employee'],
      default: 'employee',
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.models.User || mongoose.model('User', userSchema)