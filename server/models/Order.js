const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

const ORDERS_PER_LETTER = 999;

async function generateOrderUniqueId() {
  const counter = await Counter.findByIdAndUpdate(
    'orderUniqueId',
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const seq = counter.seq;
  const letterIndex = Math.floor((seq - 1) / ORDERS_PER_LETTER);
  const numberInLetter = ((seq - 1) % ORDERS_PER_LETTER) + 1;
  const letter = String.fromCharCode('A'.charCodeAt(0) + letterIndex);
  const paddedNumber = String(numberInLetter).padStart(3, '0');

  return `PCB-${letter}${paddedNumber}`;
}

const stageHistorySchema = new mongoose.Schema(
  {
    stageNumber: {
      type: Number,
      required: true,
    },
    stageName: {
      type: String,
      required: true,
    },
    receivedDate: {
      type: Date,
    },
    receivedQuantity: {
      type: Number,
    },
    completedQuantity: {
      type: Number,
    },
    completedDate: {
      type: Date,
    },
    updatedBy: {
      type: String,
      trim: true,
    },
  },
  { _id: false, timestamps: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderUniqueId: {
      type: String,
      unique: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    pcbName: {
      type: String,
      required: true,
      trim: true,
    },
    pcbType: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    orderDate: {
      type: Date,
      required: true,
    },
    dispatchDate: {
      type: Date,
    },
    currentStage: {
      type: Number,
      default: 1,
    },
    currentStageName: {
      type: String,
    },
    status: {
      type: String,
      enum: ['in-progress', 'completed'],
      default: 'in-progress',
    },
    stageHistory: {
      type: [stageHistorySchema],
      default: [],
    },
  },
  { timestamps: true }
);

orderSchema.pre('save', async function (next) {
  if (this.isNew && !this.orderUniqueId) {
    this.orderUniqueId = await generateOrderUniqueId();
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
