// ===========================================
// Security Middleware - LUXE Store
// ===========================================
// هيدرز حماية + rate limiting + CORS محسّن
// ===========================================

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// ---------------------------------------------
// Helmet — security headers
// ---------------------------------------------
// بيضيف 11 هيدر حماية تلقائياً
function helmetMiddleware() {
  return helmet({
    contentSecurityPolicy: false, // هنعتمد على Vercel
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  });
}

// ---------------------------------------------
// Rate Limiters
// ---------------------------------------------

// عام — لكل الـ API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // 100 طلب لكل IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'محاولات كثيرة، جرب بعد شوية'
  }
});

// صارم — للـ auth (login/register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 محاولات فقط
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'محاولات دخول كثيرة، جرب بعد 15 دقيقة'
  }
});

// متوسط — للطلبات (orders)
const orderLimiter = rateLimit({
  windowMs: 60 * 1000, // دقيقة
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'بطّأ شوية — مش أكتر من 10 طلبات في الدقيقة'
  }
});

// ---------------------------------------------
// CORS محسّن — قائمة بيضاء صريحة
// ---------------------------------------------
function corsOptions() {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://luxe-store-1uof.vercel.app'
  ];

  // اقبل أي origin ينتهي بـ .vercel.app (لمعاينات Vercel)
  const isVercelPreview = (origin) =>
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin || '');

  return {
    origin: function (origin, callback) {
      // بدون origin = postman/curl = اسمح
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || isVercelPreview(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS: origin not allowed'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // 24 ساعة
  };
}

// ---------------------------------------------
// طلب جسم غير مصرح — منع HTML injection
// ---------------------------------------------
function sanitizeBody(req, res, next) {
  const clean = (v) => {
    if (typeof v === 'string') {
      // شيل أي < أو > أو null bytes
      return v.replace(/[<>]/g, '').replace(/\0/g, '').trim();
    }
    if (Array.isArray(v)) return v.map(clean);
    if (v && typeof v === 'object') {
      const out = {};
      for (const k of Object.keys(v)) {
        // منع حقن prototype pollution
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
        out[k] = clean(v[k]);
      }
      return out;
    }
    return v;
  };

  if (req.body && typeof req.body === 'object') {
    req.body = clean(req.body);
  }
  next();
}

// ---------------------------------------------
// Logging — للمراقبة
// ---------------------------------------------
function securityLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const flag = res.statusCode >= 400 ? '⚠️' : '✅';
    console.log(`${flag} ${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`);
  });
  next();
}

module.exports = {
  helmetMiddleware,
  generalLimiter,
  authLimiter,
  orderLimiter,
  corsOptions,
  sanitizeBody,
  securityLogger
};
