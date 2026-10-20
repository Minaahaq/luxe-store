const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyAdmin } = require('../middleware/auth');

// Stats
router.get('/stats', verifyAdmin, adminController.getStats);

// Products
router.post('/products', verifyAdmin, adminController.addProduct);
router.put('/products/:id', verifyAdmin, adminController.updateProduct);
router.delete('/products/:id', verifyAdmin, adminController.deleteProduct);

// Orders
router.get('/orders', verifyAdmin, adminController.getAllOrders);
router.put('/orders/:id/status', verifyAdmin, adminController.updateOrderStatus);

// Users
router.get('/users', verifyAdmin, adminController.getAllUsers);
router.put('/users/:uid/role', verifyAdmin, adminController.updateUserRole);

module.exports = router;
