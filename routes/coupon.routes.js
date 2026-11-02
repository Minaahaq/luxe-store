const express = require('express');
const router = express.Router();
const couponController = require('../controllers/coupon.controller');
const { verifyToken, verifyAdmin } = require('../middleware/auth');  // ← verifyAdmin مش isAdmin

// Public — العميل يتحقق من الكوبون قبل الطلب
router.post('/validate', verifyToken, couponController.validate);

// Admin only
router.post('/', verifyToken, verifyAdmin, couponController.create);
router.get('/', verifyToken, verifyAdmin, couponController.getAll);
router.get('/:code', verifyToken, verifyAdmin, couponController.getByCode);
router.patch('/:code', verifyToken, verifyAdmin, couponController.update);
router.delete('/:code', verifyToken, verifyAdmin, couponController.remove);

module.exports = router;
