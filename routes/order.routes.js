const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { verifyToken } = require('../middleware/auth');

router.post('/', verifyToken, orderController.create);
router.get('/my', verifyToken, orderController.getMyOrders);
router.get('/track/:trackingId', orderController.track);
router.get('/:id', verifyToken, orderController.getById);
router.post('/:id/cancel', verifyToken, orderController.cancel);

module.exports = router;
