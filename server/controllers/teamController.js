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
      const completedSoFar = entry?.completedQuantity || 0;
      const defectSoFar = entry?.defectQuantity || 0;
      const pendingQuantity = entry ? entry.receivedQuantity - completedSoFar - defectSoFar : null;
      return {
        orderId: order._id,
        orderUniqueId: order.orderUniqueId,
        pcbName: order.pcbName,
        pcbType: order.pcbType,
        companyName: order.companyName,
        receivedDate: entry ? entry.receivedDate : null,
        receivedQuantity: entry ? entry.receivedQuantity : null,
        completedQuantitySoFar: completedSoFar,
        defectQuantitySoFar: defectSoFar,
        pendingQuantity,
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getCompletedOrders = async (req, res) => {
  try {
    const assignedStage = req.user.assignedStage;

    if (assignedStage === undefined || assignedStage === null) {
      return res.status(400).json({ message: 'No stage assigned to this user' });
    }

    const { search, from, to } = req.query;

    const filter = {
      stageHistory: { $elemMatch: { stageNumber: assignedStage, completedDate: { $ne: null } } },
    };

    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ orderUniqueId: regex }, { companyName: regex }, { pcbName: regex }];
    }

    const orders = await Order.find(filter).sort({ updatedAt: -1 });

    let fromDate = null;
    if (from) {
      fromDate = new Date(from);
      if (Number.isNaN(fromDate.getTime())) fromDate = null;
    }
    let toDate = null;
    if (to) {
      toDate = new Date(to);
      if (!Number.isNaN(toDate.getTime())) toDate.setHours(23, 59, 59, 999);
      else toDate = null;
    }

    const result = orders
      .map((order) => {
        const entry = order.stageHistory.find((h) => h.stageNumber === assignedStage && h.completedDate);
        if (!entry) return null;
        return {
          orderId: order._id,
          orderUniqueId: order.orderUniqueId,
          pcbName: order.pcbName,
          pcbType: order.pcbType,
          companyName: order.companyName,
          receivedDate: entry.receivedDate,
          receivedQuantity: entry.receivedQuantity,
          completedQuantity: entry.completedQuantity,
          defectQuantity: entry.defectQuantity,
          completedDate: entry.completedDate,
          updatedBy: entry.updatedBy,
          actions: entry.actions || [],
        };
      })
      .filter(Boolean)
      .filter((r) => {
        const d = new Date(r.completedDate);
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const completeStage = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { completedQuantity, defectQuantity } = req.body;

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

    const numericDefectQuantity = Number(defectQuantity);
    if (
      defectQuantity === undefined ||
      defectQuantity === null ||
      defectQuantity === '' ||
      !Number.isFinite(numericDefectQuantity) ||
      numericDefectQuantity < 0
    ) {
      return res.status(400).json({ message: 'defectQuantity is required and must be a non-negative number' });
    }

    // This submission adds to whatever the team has already logged for this stage entry —
    // an order stays at the current stage until its pending quantity reaches zero.
    const priorCompleted = currentEntry.completedQuantity || 0;
    const priorDefect = currentEntry.defectQuantity || 0;
    const remainingBeforeSubmission = currentEntry.receivedQuantity - priorCompleted - priorDefect;

    if (numericCompletedQuantity + numericDefectQuantity > remainingBeforeSubmission) {
      return res.status(400).json({
        message: `completedQuantity + defectQuantity cannot exceed the remaining pending quantity (${remainingBeforeSubmission})`,
      });
    }

    const newCompletedTotal = priorCompleted + numericCompletedQuantity;
    const newDefectTotal = priorDefect + numericDefectQuantity;
    const newPendingQuantity = currentEntry.receivedQuantity - newCompletedTotal - newDefectTotal;

    currentEntry.completedQuantity = newCompletedTotal;
    currentEntry.defectQuantity = newDefectTotal;
    currentEntry.pendingQuantity = newPendingQuantity;
    currentEntry.updatedBy = req.user.name;
    currentEntry.actions.push({
      completedQuantity: numericCompletedQuantity,
      defectQuantity: numericDefectQuantity,
      pendingQuantityAfter: newPendingQuantity,
      updatedBy: req.user.name,
      actionDate: new Date(),
    });

    if (newPendingQuantity > 0) {
      // Still work remaining at this stage — keep the order in this team's queue.
      await order.save();
      return res.json(order);
    }

    currentEntry.completedDate = new Date();

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
        receivedQuantity: newCompletedTotal,
      });
    }

    await order.save();

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getMyOrders, completeStage, getCompletedOrders };
