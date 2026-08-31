const express = require('express');
const { createOrder, getOrders, getOrderById } = require('../controllers/orderController');
const protect = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

router.use(protect, roleCheck('admin', 'manager'));

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/:id', getOrderById);

module.exports = router;
