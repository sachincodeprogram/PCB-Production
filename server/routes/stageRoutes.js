const express = require('express');
const { getStages, createStage, updateStage, deleteStage } = require('../controllers/stageController');
const protect = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

router.use(protect);

router.get('/', getStages);
router.post('/', roleCheck('admin'), createStage);
router.put('/:id', roleCheck('admin'), updateStage);
router.delete('/:id', roleCheck('admin'), deleteStage);

module.exports = router;
