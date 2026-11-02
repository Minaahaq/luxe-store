const express = require('express');
const router = express.Router();
const couponController = require('../controllers/coupon.controller');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Public — العميل يتحقق من الكوبون قبل الطلب
router.post('/validate', verifyToken, couponController.validate);

// Admin only
router.post('/', verifyToken, isAdmin, couponController.create);
router.get('/', verifyToken, isAdmin, couponController.getAll);
router.get('/:code', verifyToken, isAdmin, couponController.getByCode);
router.patch('/:code', verifyToken, isAdmin, couponController.update);
router.delete('/:code', verifyToken, isAdmin, couponController.remove);

module.exports = router;
