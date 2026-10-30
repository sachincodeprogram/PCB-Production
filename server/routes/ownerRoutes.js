const express = require('express');
const {
  ownerLogin,
  getDevices,
  approveDevice,
  blockDevice,
  revokeDevice,
  updateDevice,
} = require('../controllers/ownerController');
const ownerAuth = require('../middleware/ownerAuth');

const router = express.Router();

router.post('/login', ownerLogin);

router.use(ownerAuth);

router.get('/devices', getDevices);
router.put('/devices/:id', updateDevice);
router.patch('/devices/:id/approve', approveDevice);
router.patch('/devices/:id/block', blockDevice);
router.delete('/devices/:id', revokeDevice);

module.exports = router;
