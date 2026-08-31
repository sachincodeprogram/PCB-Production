const mongoose = require('mongoose');
const User = require('../models/User');
const Stage = require('../models/Stage');

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const createUser = async (req, res) => {
  try {
    const { name, userId, password, role, assignedStage } = req.body;

    const errors = [];
    if (!isNonEmptyString(name)) errors.push('name is required');
    if (!isNonEmptyString(userId)) errors.push('userId is required');
    if (!isNonEmptyString(password)) errors.push('password is required');
    if (!['admin', 'manager', 'team'].includes(role)) {
      errors.push('role must be one of: admin, manager, team');
    }

    let stageNumber;
    if (role === 'team') {
      if (assignedStage === undefined || assignedStage === null || assignedStage === '') {
        errors.push('assignedStage is required for team role');
      } else if (!Number.isInteger(Number(assignedStage))) {
        errors.push('assignedStage must be a number');
      } else {
        stageNumber = Number(assignedStage);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    if (role === 'team') {
      const stage = await Stage.findOne({ stageNumber });
      if (!stage) {
        return res.status(400).json({ message: `Stage ${stageNumber} does not exist` });
      }
    }

    const existing = await User.findOne({ userId: userId.trim() });
    if (existing) {
      return res.status(409).json({ message: 'A user with this userId already exists' });
    }

    const user = await User.create({
      name: name.trim(),
      userId: userId.trim(),
      password,
      role,
      assignedStage: role === 'team' ? stageNumber : undefined,
      isActive: true,
    });

    const result = user.toObject();
    delete result.password;

    res.status(201).json(result);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A user with this userId already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, password, role, assignedStage } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const errors = [];
    const nextRole = role !== undefined ? role : user.role;
    if (role !== undefined && !['admin', 'manager', 'team'].includes(role)) {
      errors.push('role must be one of: admin, manager, team');
    }

    let stageNumber = user.assignedStage;
    if (nextRole === 'team') {
      const source = assignedStage !== undefined ? assignedStage : user.assignedStage;
      if (source === undefined || source === null || source === '') {
        errors.push('assignedStage is required for team role');
      } else if (!Number.isInteger(Number(source))) {
        errors.push('assignedStage must be a number');
      } else {
        stageNumber = Number(source);
      }
    }

    if (name !== undefined && !isNonEmptyString(name)) errors.push('name must not be empty');
    if (password !== undefined && !isNonEmptyString(password)) errors.push('password must not be empty');

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    if (nextRole === 'team') {
      const stage = await Stage.findOne({ stageNumber });
      if (!stage) {
        return res.status(400).json({ message: `Stage ${stageNumber} does not exist` });
      }
    }

    if (name !== undefined) user.name = name.trim();
    if (password) user.password = password;
    if (role !== undefined) user.role = role;
    user.assignedStage = nextRole === 'team' ? stageNumber : undefined;

    await user.save();

    const result = user.toObject();
    delete result.password;

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const toggleUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    const result = user.toObject();
    delete result.password;

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createUser, getUsers, updateUser, toggleUser };
