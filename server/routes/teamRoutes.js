const express = require('express');
const { getMyOrders, completeStage } = require('../controllers/teamController');
const protect = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

router.use(protect, roleCheck('team'));

router.get('/my-orders', getMyOrders);
router.post('/complete/:orderId', completeStage);

module.exports = router;
