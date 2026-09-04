const express = require('express');
const { getMyOrders, completeStage, getCompletedOrders } = require('../controllers/teamController');
const protect = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

router.use(protect, roleCheck('team'));

router.get('/my-orders', getMyOrders);
router.get('/completed-orders', getCompletedOrders);
router.post('/complete/:orderId', completeStage);

module.exports = router;
