const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    // Short public code shown to users so they can tell the admin which device to approve.
    deviceId: {
      type: String,
      required: true,
      unique: true,
    },
    // SHA-256 thumbprint of the device public key (RFC 7638). The private key never leaves the browser.
    keyThumbprint: {
      type: String,
      required: true,
      unique: true,
    },
    publicKey: {
      type: Object,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'blocked'],
      default: 'pending',
    },
    label: {
      type: String,
      trim: true,
      default: '',
    },
    userAgent: String,
    lastIp: String,
    lastUsedAt: Date,
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Device', deviceSchema);
