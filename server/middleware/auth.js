const jwt = require('jsonwebtoken');
const Device = require('../models/Device');
const { isDeviceApprovalEnabled } = require('../utils/deviceProof');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, invalid or expired token' });
  }

  if (isDeviceApprovalEnabled()) {
    // Re-check on every request so blocking or revoking a device ends its sessions immediately.
    try {
      const device = decoded.did ? await Device.findById(decoded.did).select('status') : null;
      if (!device || device.status !== 'approved') {
        return res
          .status(401)
          .json({ code: 'DEVICE_NOT_APPROVED', message: 'This device is not approved. Please contact the admin.' });
      }
    } catch (error) {
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  req.user = decoded;
  next();
};

module.exports = protect;
