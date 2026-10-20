// ===========================================
// Input Validation — express-validator
// ===========================================

const { body, param, query, validationResult } = require('express-validator');

// ---------------------------------------------
// Response helper — بيرجع الأخطاء
// ---------------------------------------------
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'بيانات غير صحيحة',
      details: errors.array().map(e => ({
        field: e.path,
        message: e.msg
      }))
    });
  }
  next();
}

// ---------------------------------------------
// Register
// ---------------------------------------------
const validateRegister = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('الاسم لازم 3-50 حرف')
    .matches(/^[\p{L}\s'-]+$/u)
    .withMessage('الاسم يقبل حروف عربية/إنجليزية فقط'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('البريد غير صحيح')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('كلمة السر لازم 6 أحرف على الأقل')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('كلمة السر لازم تحتوي على حرف ورقم على الأقل'),

  body('phone')
    .optional({ values: 'falsy' })
    .matches(/^01[0-9]{9}$/)
    .withMessage('رقم الموبايل لازم 11 رقم يبدأ بـ 01'),

  handleValidation
];

// ---------------------------------------------
// Update profile
// ---------------------------------------------
const validateUpdateProfile = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('الاسم لازم 3-50 حرف'),

  body('phone')
    .optional({ values: 'falsy' })
    .matches(/^01[0-9]{9}$/)
    .withMessage('رقم الموبايل غير صحيح'),

  body('addresses')
    .optional()
    .isArray()
    .withMessage('العناوين لازم تكون قائمة'),

  body('addresses.*.city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 30 }),

  body('addresses.*.street')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }),

  handleValidation
];

// ---------------------------------------------
// Add product (admin)
// ---------------------------------------------
const validateAddProduct = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('اسم المنتج لازم 3-200 حرف'),

  body('price')
    .isFloat({ min: 0.01, max: 9999999 })
    .withMessage('السعر لازم رقم موجب'),

  body('oldPrice')
    .optional({ values: 'null' })
    .isFloat({ min: 0 })
    .withMessage('السعر القديم غير صحيح'),

  body('stock')
    .isInt({ min: 0, max: 999999 })
    .withMessage('المخزون لازم رقم صحيح >= 0'),

  body('category')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('الفئة مطلوبة'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('الوصف طويل جداً'),

  body('isActive')
    .optional()
    .isBoolean(),

  body('isFeatured')
    .optional()
    .isBoolean(),

  handleValidation
];

// ---------------------------------------------
// Update order status (admin)
// ---------------------------------------------
const validateOrderStatus = [
  body('status')
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('حالة غير صالحة'),

  body('note')
    .optional()
    .trim()
    .isLength({ max: 500 }),

  handleValidation
];

// ---------------------------------------------
// Create order
// ---------------------------------------------
const validateCreateOrder = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('الطلب لازم يحتوي منتج واحد على الأقل'),

  body('items.*.productId')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('رقم المنتج غير صحيح'),

  body('items.*.qty')
    .isInt({ min: 1, max: 100 })
    .withMessage('الكمية لازم رقم موجب'),

  body('shippingAddress.city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('المحافظة مطلوبة'),

  body('shippingAddress.area')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('المنطقة مطلوبة'),

  body('shippingAddress.street')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('الشارع مطلوب'),

  body('paymentMethod')
    .isIn(['cod', 'card', 'wallet'])
    .withMessage('طريقة دفع غير صالحة'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }),

  handleValidation
];

// ---------------------------------------------
// MongoDB/Firestore ID check
// ---------------------------------------------
const validateId = [
  param('id')
    .trim()
    .isLength({ min: 1, max: 100 })
    .matches(/^[A-Za-z0-9_-]+$/)
    .withMessage('معرّف غير صحيح'),

  handleValidation
];

module.exports = {
  validateRegister,
  validateUpdateProfile,
  validateAddProduct,
  validateOrderStatus,
  validateCreateOrder,
  validateId,
  handleValidation
};
