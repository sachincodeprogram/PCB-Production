const mongoose = require('mongoose');
const Stage = require('../models/Stage');
const Order = require('../models/Order');
const User = require('../models/User');

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isPositiveInteger = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

const getStages = async (req, res) => {
  try {
    const stages = await Stage.find().sort({ stageNumber: 1 });
    res.json(stages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createStage = async (req, res) => {
  try {
    const { stageNumber, stageName } = req.body;

    const errors = [];
    if (stageNumber === undefined || stageNumber === null || stageNumber === '') {
      errors.push('stageNumber is required');
    } else if (!isPositiveInteger(stageNumber)) {
      errors.push('stageNumber must be a positive integer');
    }
    if (!isNonEmptyString(stageName)) errors.push('stageName is required');

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const existing = await Stage.findOne({ stageNumber: Number(stageNumber) });
    if (existing) {
      return res.status(409).json({ message: `Stage number ${stageNumber} already exists` });
    }

    const stage = await Stage.create({
      stageNumber: Number(stageNumber),
      stageName: stageName.trim(),
    });

    res.status(201).json(stage);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A stage with this stageNumber already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stageNumber, stageName } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid stage id' });
    }

    if (stageNumber === undefined && stageName === undefined) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: ['Provide at least one of stageNumber or stageName to update'],
      });
    }

    const errors = [];
    if (stageNumber !== undefined && !isPositiveInteger(stageNumber)) {
      errors.push('stageNumber must be a positive integer');
    }
    if (stageName !== undefined && !isNonEmptyString(stageName)) {
      errors.push('stageName must be a non-empty string');
    }
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const stage = await Stage.findById(id);
    if (!stage) {
      return res.status(404).json({ message: 'Stage not found' });
    }

    if (stageNumber !== undefined && Number(stageNumber) !== stage.stageNumber) {
      const conflict = await Stage.findOne({ stageNumber: Number(stageNumber), _id: { $ne: id } });
      if (conflict) {
        return res.status(409).json({ message: `Stage number ${stageNumber} already exists` });
      }
      stage.stageNumber = Number(stageNumber);
    }

    if (stageName !== undefined) {
      stage.stageName = stageName.trim();
    }

    await stage.save();

    res.json(stage);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A stage with this stageNumber already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteStage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid stage id' });
    }

    const stage = await Stage.findById(id);
    if (!stage) {
      return res.status(404).json({ message: 'Stage not found' });
    }

    const activeOrderCount = await Order.countDocuments({
      currentStage: stage.stageNumber,
      status: 'in-progress',
    });

    if (activeOrderCount > 0) {
      return res.status(409).json({
        message: `Cannot delete stage: ${activeOrderCount} active order(s) currently on this stage`,
      });
    }

    await stage.deleteOne();

    res.json({ message: 'Stage deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Moves a stage one position up/down in the workflow by swapping its stageNumber with
// its neighbour. stageNumber is the key that users (assignedStage) and orders
// (currentStage, stageHistory) point at, so those references are swapped too — the team
// stays with its stage and history stays attached to the right department.
const moveStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { direction } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid stage id' });
    }
    if (direction !== 'up' && direction !== 'down') {
      return res.status(400).json({ message: "direction must be 'up' or 'down'" });
    }

    const stage = await Stage.findById(id);
    if (!stage) {
      return res.status(404).json({ message: 'Stage not found' });
    }

    const neighbour =
      direction === 'up'
        ? await Stage.findOne({ stageNumber: { $lt: stage.stageNumber } }).sort({ stageNumber: -1 })
        : await Stage.findOne({ stageNumber: { $gt: stage.stageNumber } }).sort({ stageNumber: 1 });

    if (!neighbour) {
      return res.status(400).json({
        message: direction === 'up' ? 'Stage is already first' : 'Stage is already last',
      });
    }

    // Batches in flight are routed by stageNumber order, so re-sequencing mid-production
    // would send work to the wrong department.
    const activeOrderCount = await Order.countDocuments({ status: 'in-progress' });
    if (activeOrderCount > 0) {
      return res.status(409).json({
        message: `Cannot reorder stages: ${activeOrderCount} order(s) are still in progress`,
      });
    }

    const a = stage.stageNumber;
    const b = neighbour.stageNumber;
    const swap = (field) => ({ $cond: [{ $eq: [field, a] }, b, { $cond: [{ $eq: [field, b] }, a, field] }] });

    // stageNumber is unique, so park one stage on a temporary number during the swap.
    const highest = await Stage.findOne().sort({ stageNumber: -1 });
    await Stage.updateOne({ _id: stage._id }, { stageNumber: highest.stageNumber + 1 });
    await Stage.updateOne({ _id: neighbour._id }, { stageNumber: a });
    await Stage.updateOne({ _id: stage._id }, { stageNumber: b });

    await User.updateMany(
      { role: 'team', assignedStage: { $in: [a, b] } },
      [{ $set: { assignedStage: swap('$assignedStage') } }],
      { timestamps: false }
    );

    await Order.updateMany(
      { $or: [{ currentStage: { $in: [a, b] } }, { 'stageHistory.stageNumber': { $in: [a, b] } }] },
      [
        { $set: { currentStage: swap('$currentStage') } },
        {
          $set: {
            stageHistory: {
              $map: {
                input: '$stageHistory',
                as: 'h',
                in: { $mergeObjects: ['$$h', { stageNumber: swap('$$h.stageNumber') }] },
              },
            },
          },
        },
      ],
      { timestamps: false }
    );

    const stages = await Stage.find().sort({ stageNumber: 1 });
    res.json(stages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getStages, createStage, updateStage, deleteStage, moveStage };
