const express = require('express');
const router = express.Router();
const couponController = require('../controllers/coupon.controller');
const { verifyToken, isAdmin } = require('../middleware/auth'); // عدّل حسب أسماء عندك

// Public — العميل يتحقق من الكوبون قبل الطلب
router.post('/validate', verifyToken, couponController.validateCoupon);

// Admin only
router.post('/', verifyToken, isAdmin, couponController.createCoupon);
router.get('/', verifyToken, isAdmin, couponController.getAllCoupons);
router.get('/:code', verifyToken, isAdmin, couponController.getCouponByCode);
router.patch('/:code', verifyToken, isAdmin, couponController.updateCoupon);
router.delete('/:code', verifyToken, isAdmin, couponController.deleteCoupon);

module.exports = router;
