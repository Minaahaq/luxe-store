// ===========================================
// LUXE Store - Node.js API Server
// ===========================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// ===========================================
// Middleware
// ===========================================
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://luxe-store.vercel.app'
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString('ar-EG')}] ${req.method} ${req.path}`);
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
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'حدث خطأ في السيرفر'
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
    console.log('  🔥 ========================================');
    console.log('');
  });
}
