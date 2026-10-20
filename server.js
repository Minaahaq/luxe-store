// ===========================================
// LUXE Store - Node.js API Server
// ===========================================

require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// Vercel بيشتغل خلف proxy
app.set('trust proxy', 1);

// ===========================================
// Security Headers (Helmet)
// ===========================================
app.use(helmet({
  contentSecurityPolicy: false,          // هنعتمد على الفرونت
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// ===========================================
// CORS
// ===========================================
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://luxe-store-1uof.vercel.app'
  ],
  credentials: true
}));

// ===========================================
// Body Parsers
// ===========================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ===========================================
// Serve frontend (لو موجود في public/)
// ===========================================
app.use(express.static(path.join(__dirname, 'public')));

// ===========================================
// Rate Limiting
// ===========================================
// عام — لكل الـ API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات كثيرة، جرب بعد شوية' }
});

// صارم — للـ auth فقط
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات دخول كثيرة، جرب بعد 15 دقيقة' }
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ===========================================
// Logging
// ===========================================
app.use((req, res, next) => {
  const t = new Date().toLocaleTimeString('ar-EG');
  console.log(`[${t}] ${req.method} ${req.path}`);
  next();
});

// ===========================================
// Routes
// ===========================================
app.get('/', (req, res) => {
  res.json({
    message: '🔥 LUXE Store API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      orders: '/api/orders',
      admin: '/api/admin'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// ===========================================
// 404
// ===========================================
app.use((req, res) => {
  res.status(404).json({ error: 'المسار غير موجود' });
});

// ===========================================
// Error Handler
// ===========================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);

  const isProd = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    error: isProd ? 'حدث خطأ' : (err.message || 'حدث خطأ في السيرفر')
  });
});

// ===========================================
// Vercel + Local
// ===========================================
module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log('');
    console.log('  🔥 ========================================');
    console.log('  🔥  LUXE Store API Server');
    console.log('  🔥 ========================================');
    console.log(`  🚀 السيرفر شغال على: http://localhost:${PORT}`);
    console.log(`  🌍 البيئة: ${process.env.NODE_ENV || 'development'}`);
    console.log('  🔒 Helmet + Rate Limiting ✅');
    console.log('  🔥 ========================================');
    console.log('');
  });
}
