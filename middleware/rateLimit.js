// ===========================================
// Rate Limiters - LUXE Store
// ===========================================

const rateLimit = require('express-rate-limit');

// عام — للـ routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات كثيرة، جرب بعد شوية' }
});

// صارم — للـ auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات دخول كثيرة، جرب بعد 15 دقيقة' }
});

// متوسط — للطلبات
const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'بطّأ شوية — مش أكتر من 10 طلبات في الدقيقة' }
});

module.exports = { generalLimiter, authLimiter, orderLimiter };
