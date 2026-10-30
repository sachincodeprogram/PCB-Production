// Emergency recovery when no admin can reach an approved device.
// Usage: npm run approve-device -- DEV-XXXXXX
require('dotenv').config();
const mongoose = require('mongoose');
const Device = require('../models/Device');

const run = async () => {
  const code = (process.argv[2] || '').trim().toUpperCase();
  if (!code) {
    console.log('Usage: npm run approve-device -- DEV-XXXXXX');
    const pending = await Device.find({ status: { $ne: 'approved' } }).sort({ createdAt: -1 }).limit(20);
    pending.forEach((d) => console.log(`${d.deviceId}  ${d.status}  ${d.lastIp || ''}  ${d.userAgent || ''}`));
    return;
  }

  const device = await Device.findOne({ deviceId: code });
  if (!device) {
    console.log(`Device ${code} not found`);
    process.exitCode = 1;
    return;
  }

  device.status = 'approved';
  device.approvedAt = new Date();
  await device.save();
  console.log(`Device ${code} approved`);
};

mongoose
  .connect(process.env.MONGO_URI)
  .then(run)
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
