const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Device = require('../models/Device');

const USER_FIELDS = 'name userId role';
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const failedLogins = new Map();

const isOwnerConfigured = () =>
  Boolean(process.env.OWNER_USERNAME && process.env.OWNER_PASSWORD && process.env.OWNER_JWT_SECRET);

// Compares hashes so the check takes the same time whatever the input length.
const safeEqual = (a, b) => {
  const hash = (value) => crypto.createHash('sha256').update(String(value)).digest();
  return crypto.timingSafeEqual(hash(a), hash(b));
};

const ownerLogin = (req, res) => {
  if (!isOwnerConfigured()) {
    return res.status(503).json({ message: 'Owner access is not configured on the server' });
  }

  const now = Date.now();
  const record = failedLogins.get(req.ip);
  if (record && record.count >= MAX_FAILED_LOGINS && now - record.first < LOCKOUT_MS) {
    return res.status(429).json({ message: 'Too many failed attempts. Try again in 15 minutes.' });
  }

  const { username, password } = req.body;
  const usernameOk = safeEqual(username || '', process.env.OWNER_USERNAME);
  const passwordOk = safeEqual(password || '', process.env.OWNER_PASSWORD);
  if (!usernameOk || !passwordOk) {
    const fresh = !record || now - record.first >= LOCKOUT_MS;
    failedLogins.set(req.ip, fresh ? { count: 1, first: now } : { ...record, count: record.count + 1 });
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  failedLogins.delete(req.ip);
  const token = jwt.sign({ role: 'owner' }, process.env.OWNER_JWT_SECRET, { expiresIn: '4h' });
  res.json({ token });
};

const findDevice = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: 'Invalid device id' });
    return null;
  }
  const device = await Device.findById(id);
  if (!device) {
    res.status(404).json({ message: 'Device not found' });
    return null;
  }
  return device;
};

const serialize = async (device) => {
  await device.populate([
    { path: 'requestedBy', select: USER_FIELDS },
    { path: 'lastUser', select: USER_FIELDS },
  ]);
  const result = device.toObject();
  delete result.publicKey;
  delete result.keyThumbprint;
  return result;
};

const getDevices = async (req, res) => {
  try {
    const devices = await Device.find()
      .select('-publicKey -keyThumbprint')
      .populate('requestedBy', USER_FIELDS)
      .populate('lastUser', USER_FIELDS)
      .sort({ createdAt: -1 });
    res.json(devices);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const setStatus = (status) => async (req, res) => {
  try {
    const device = await findDevice(req, res);
    if (!device) return;

    device.status = status;
    if (status === 'approved') device.approvedAt = new Date();
    await device.save();

    res.json(await serialize(device));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Revoking deletes the registration. The browser must register again and wait for approval.
const revokeDevice = async (req, res) => {
  try {
    const device = await findDevice(req, res);
    if (!device) return;

    await device.deleteOne();
    res.json({ message: 'Device revoked' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateDevice = async (req, res) => {
  try {
    const device = await findDevice(req, res);
    if (!device) return;

    const { label } = req.body;
    if (typeof label !== 'string' || label.length > 60) {
      return res.status(400).json({ message: 'label must be text of at most 60 characters' });
    }

    device.label = label.trim();
    await device.save();

    res.json(await serialize(device));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  ownerLogin,
  getDevices,
  approveDevice: setStatus('approved'),
  blockDevice: setStatus('blocked'),
  revokeDevice,
  updateDevice,
};
