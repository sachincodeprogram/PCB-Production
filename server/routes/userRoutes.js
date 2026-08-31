const express = require('express');
const { createUser, getUsers, updateUser, toggleUser } = require('../controllers/userController');
const protect = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

router.use(protect, roleCheck('admin'));

router.post('/', createUser);
router.get('/', getUsers);
router.put('/:id', updateUser);
router.patch('/:id/toggle', toggleUser);

module.exports = router;
