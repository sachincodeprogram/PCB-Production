const mongoose = require('mongoose');
const Order = require('../models/Order');
const Stage = require('../models/Stage');

const findCurrentStageEntry = (order) => {
  for (let i = order.stageHistory.length - 1; i >= 0; i--) {
    if (order.stageHistory[i].stageNumber === order.currentStage) {
      return order.stageHistory[i];
    }
  }
  return null;
};

const getMyOrders = async (req, res) => {
  try {
    const assignedStage = req.user.assignedStage;

    if (assignedStage === undefined || assignedStage === null) {
      return res.status(400).json({ message: 'No stage assigned to this user' });
    }

    const orders = await Order.find({
      currentStage: assignedStage,
      status: 'in-progress',
    }).sort({ createdAt: -1 });

    const result = orders.map((order) => {
      const entry = findCurrentStageEntry(order);
      return {
        orderId: order._id,
        orderUniqueId: order.orderUniqueId,
        pcbName: order.pcbName,
        pcbType: order.pcbType,
        companyName: order.companyName,
        receivedDate: entry ? entry.receivedDate : null,
        receivedQuantity: entry ? entry.receivedQuantity : null,
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const completeStage = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { completedQuantity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: 'Invalid order id' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'in-progress') {
      return res.status(400).json({ message: 'This order is already completed' });
    }

    if (order.currentStage !== req.user.assignedStage) {
      return res.status(403).json({
        message: 'Forbidden: this order is not currently at your assigned stage',
      });
    }

    const currentEntry = findCurrentStageEntry(order);
    if (!currentEntry) {
      return res.status(500).json({
        message: 'Data inconsistency: no stageHistory entry found for the current stage',
      });
    }

    const numericCompletedQuantity = Number(completedQuantity);
    if (
      completedQuantity === undefined ||
      completedQuantity === null ||
      completedQuantity === '' ||
      !Number.isFinite(numericCompletedQuantity) ||
      numericCompletedQuantity < 0
    ) {
      return res.status(400).json({ message: 'completedQuantity is required and must be a non-negative number' });
    }
    if (numericCompletedQuantity > currentEntry.receivedQuantity) {
      return res.status(400).json({ message: 'completedQuantity cannot exceed receivedQuantity' });
    }

    currentEntry.completedQuantity = numericCompletedQuantity;
    currentEntry.completedDate = new Date();
    currentEntry.updatedBy = req.user.name;

    const nextStage = await Stage.findOne({ stageNumber: { $gt: order.currentStage } }).sort({
      stageNumber: 1,
    });

    if (!nextStage) {
      order.status = 'completed';
    } else {
      order.currentStage = nextStage.stageNumber;
      order.currentStageName = nextStage.stageName;
      order.stageHistory.push({
        stageNumber: nextStage.stageNumber,
        stageName: nextStage.stageName,
        receivedDate: new Date(),
        receivedQuantity: numericCompletedQuantity,
      });
    }

    await order.save();

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getMyOrders, completeStage };
