// ===========================================
// LUXE Store - Node.js API Server
// ===========================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const {
  helmetMiddleware,
  generalLimiter,
  corsOptions,
  sanitizeBody,
  securityLogger
} = require('./middleware/security');

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// ===========================================
// Trust proxy — لازم على Vercel
// ===========================================
app.set('trust proxy', 1);

// ===========================================
// Security Middleware (بالترتيب مهم)
// ===========================================
app.use(helmetMiddleware());
app.use(cors(corsOptions()));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(sanitizeBody);
app.use(securityLogger);

// Rate limit عام
app.use('/api/', generalLimiter);

// ===========================================
// Routes
// ===========================================
app.get('/', (req, res) => {
  res.json({
    message: '🔥 LUXE Store API',
    version: '1.0.0',
    status: 'running'
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
// Error Handler — بيخفي تفاصيل الأخطاء في production
// ===========================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);

  const isProd = process.env.NODE_ENV === 'production';

  res.status(err.status || 500).json({
    error: isProd ? 'حدث خطأ' : (err.message || 'حدث خطأ')
  });
});

// ===========================================
// Export للـ Vercel + التشغيل المحلي
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
    console.log('  🔒 الحماية: Helmet + Rate Limit + Sanitize ✅');
    console.log('  🔥 ========================================');
    console.log('');
  });
}
