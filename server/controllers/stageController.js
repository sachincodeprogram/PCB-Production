const mongoose = require('mongoose');
const Stage = require('../models/Stage');
const Order = require('../models/Order');

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

module.exports = { getStages, createStage, updateStage, deleteStage };
