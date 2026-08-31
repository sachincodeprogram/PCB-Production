const mongoose = require('mongoose');
const Order = require('../models/Order');
const Stage = require('../models/Stage');

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const createOrder = async (req, res) => {
  try {
    const { companyName, pcbName, pcbType, quantity, orderDate, dispatchDate } = req.body;

    const errors = [];

    if (!isNonEmptyString(companyName)) errors.push('companyName is required');
    if (!isNonEmptyString(pcbName)) errors.push('pcbName is required');
    if (!isNonEmptyString(pcbType)) errors.push('pcbType is required');

    if (quantity === undefined || quantity === null || quantity === '') {
      errors.push('quantity is required');
    } else if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
      errors.push('quantity must be a positive number');
    }

    let parsedOrderDate;
    if (!orderDate) {
      errors.push('orderDate is required');
    } else {
      parsedOrderDate = new Date(orderDate);
      if (Number.isNaN(parsedOrderDate.getTime())) errors.push('orderDate is not a valid date');
    }

    let parsedDispatchDate;
    if (!dispatchDate) {
      errors.push('dispatchDate is required');
    } else {
      parsedDispatchDate = new Date(dispatchDate);
      if (Number.isNaN(parsedDispatchDate.getTime())) errors.push('dispatchDate is not a valid date');
    }

    if (
      parsedOrderDate &&
      parsedDispatchDate &&
      !Number.isNaN(parsedOrderDate.getTime()) &&
      !Number.isNaN(parsedDispatchDate.getTime()) &&
      parsedDispatchDate < parsedOrderDate
    ) {
      errors.push('dispatchDate cannot be before orderDate');
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const firstStage = await Stage.findOne({ stageNumber: 1 });
    if (!firstStage) {
      return res.status(500).json({
        message: 'Stage 1 is not configured. Please seed/create stages before booking orders.',
      });
    }

    const numericQuantity = Number(quantity);

    const order = await Order.create({
      companyName: companyName.trim(),
      pcbName: pcbName.trim(),
      pcbType: pcbType.trim(),
      quantity: numericQuantity,
      orderDate: parsedOrderDate,
      dispatchDate: parsedDispatchDate,
      currentStage: 1,
      currentStageName: firstStage.stageName,
      status: 'in-progress',
      stageHistory: [
        {
          stageNumber: 1,
          stageName: firstStage.stageName,
          receivedDate: new Date(),
          receivedQuantity: numericQuantity,
          updatedBy: req.user.name,
        },
      ],
    });

    res.status(201).json(order);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Duplicate order identifier, please retry' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getOrders = async (req, res) => {
  try {
    const { search, status } = req.query;

    if (status && !['in-progress', 'completed'].includes(status)) {
      return res.status(400).json({
        message: 'Invalid status filter',
        errors: ["status must be one of: 'in-progress', 'completed'"],
      });
    }

    const searchFilter = {};
    if (search && search.trim().length > 0) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      searchFilter.$or = [{ orderUniqueId: regex }, { companyName: regex }, { pcbName: regex }];
    }

    const [total, inProgress, completed] = await Promise.all([
      Order.countDocuments(searchFilter),
      Order.countDocuments({ ...searchFilter, status: 'in-progress' }),
      Order.countDocuments({ ...searchFilter, status: 'completed' }),
    ]);

    const listFilter = { ...searchFilter };
    if (status) listFilter.status = status;

    const orders = await Order.find(listFilter).sort({ createdAt: -1 });

    res.json({
      counts: { total, 'in-progress': inProgress, completed },
      orders,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid order id' });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createOrder, getOrders, getOrderById };
