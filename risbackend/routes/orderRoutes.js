const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authorize, verifyToken } = require('../middleware/authMiddleware');

router.post('/', verifyToken, authorize(['admin', 'doctor', 'radiologist', 'receptionist']), orderController.createOrder);
router.get('/', verifyToken, authorize(['admin', 'doctor', 'radiologist', 'technician', 'receptionist']), orderController.listOrders);
router.put('/:id/status', verifyToken, authorize(['admin', 'doctor', 'radiologist', 'technician']), orderController.updateStatus);

module.exports = router;
