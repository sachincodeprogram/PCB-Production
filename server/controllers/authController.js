const User = require('../models/User');
const Device = require('../models/Device');
const generateToken = require('../utils/generateToken');
const {
  isDeviceApprovalEnabled,
  createChallenge,
  verifyDeviceProof,
  generateDeviceCode,
} = require('../utils/deviceProof');

const getDeviceChallenge = (req, res) => {
  res.json({ challenge: createChallenge() });
};

// Finds the device for a verified key, registering it as pending if it is new.
const findOrRegisterDevice = async (verified, user) => {
  const existing = await Device.findOne({ keyThumbprint: verified.keyThumbprint });
  if (existing) return existing;

  // Every new device starts pending, including admin devices. Only the owner approval panel can approve.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await Device.create({
        deviceId: generateDeviceCode(),
        keyThumbprint: verified.keyThumbprint,
        publicKey: verified.publicKey,
        status: 'pending',
        requestedBy: user._id,
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      // Same key registered concurrently: use that record. Otherwise the code collided; retry.
      const raced = await Device.findOne({ keyThumbprint: verified.keyThumbprint });
      if (raced) return raced;
    }
  }
  throw new Error('Could not register device');
};

const login = async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({ message: 'userId and password are required' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'This account has been deactivated' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    let device;
    if (isDeviceApprovalEnabled()) {
      const verified = verifyDeviceProof(req.body.device);
      if (!verified) {
        return res.status(400).json({
          code: 'DEVICE_PROOF_INVALID',
          message: 'Device verification failed. Please refresh the page and try again.',
        });
      }

      device = await findOrRegisterDevice(verified, user);
      device.lastIp = req.ip;
      device.userAgent = req.get('user-agent');
      device.lastUser = user._id;
      device.lastUsedAt = new Date();
      await device.save();

      if (device.status === 'pending') {
        return res.status(403).json({
          code: 'DEVICE_PENDING',
          deviceId: device.deviceId,
          message: 'This device is waiting for admin approval.',
        });
      }
      if (device.status === 'blocked') {
        return res.status(403).json({
          code: 'DEVICE_BLOCKED',
          deviceId: device.deviceId,
          message: 'This device has been blocked by the admin.',
        });
      }
    }

    const token = generateToken(user, device?._id);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        userId: user.userId,
        role: user.role,
        assignedStage: user.assignedStage,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { login, getMe, getDeviceChallenge };
