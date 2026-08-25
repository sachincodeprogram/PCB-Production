const mongoose = require('mongoose');

const stageSchema = new mongoose.Schema(
  {
    stageNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    stageName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Stage', stageSchema);
