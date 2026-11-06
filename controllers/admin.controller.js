const { db, auth, COLLECTIONS } = require('../config/firebase');
const admin = require('firebase-admin');

// ===========================================
// Helper — حساب ربح طلب واحد
// ===========================================
function computeOrderProfit(order, productsCache = {}) {
  let revenue = 0;
  let cost = 0;
  let missingCost = 0;

  for (const item of (order.items || [])) {
    const pid = item.productId || item.product_id;
    const product = productsCache[pid];

    const qty = Number(item.quantity || 1);
    const unitPrice = Number(item.price || product?.price || 0);
    const unitCost = Number(product?.costPrice || 0);

    revenue += unitPrice * qty;
    cost += unitCost * qty;
    if (!product || unitCost === 0) missingCost++;
  }

  return {
    revenue,
    cost,
    profit: revenue - cost,
    margin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
    missingCost,
  };
}

// ===========================================
// إحصائيات + أرباح
// ===========================================
exports.getStats = async (req, res) => {
  try {
    const [productsSnap, ordersSnap, usersSnap] = await Promise.all([
      db.collection(COLLECTIONS.PRODUCTS).get(),
      db.collection(COLLECTIONS.ORDERS).get(),
      db.collection(COLLECTIONS.USERS).get(),
    ]);

    // كاش للمنتجات
    const productsCache = {};
    productsSnap.forEach(doc => {
      productsCache[doc.id] = { id: doc.id, ...doc.data() };
    });

    let revenue = 0;
    let cost = 0;
    let itemsSold = 0;

    ordersSnap.forEach(doc => {
      const o = { id: doc.id, ...doc.data() };
      const st = (o.status || '').toLowerCase();
      if (st !== 'delivered') return;

      const p = computeOrderProfit(o, productsCache);
      revenue += p.revenue;
      cost += p.cost;
      itemsSold += (o.items || []).reduce(
        (s, i) => s + (Number(i.quantity) || 1),
        0
      );
    });

    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    // ربح متوقع من المخزون الحالي
    let potentialProfit = 0;
    let productsWithoutCost = 0;
    productsSnap.forEach(doc => {
      const p = doc.data();
      const price = Number(p.price) || 0;
      const c = Number(p.costPrice) || 0;
      const stock = Number(p.stock) || 0;
      potentialProfit += (price - c) * stock;
      if (!p.costPrice || Number(p.costPrice) === 0) productsWithoutCost++;
    });

    res.json({
      success: true,
      data: {
        products: productsSnap.size,
        orders: ordersSnap.size,
        users: usersSnap.size,
        revenue: Number(revenue.toFixed(2)),
        cost: Number(cost.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        margin: Number(margin.toFixed(2)),
        itemsSold,
        potentialProfit: Number(potentialProfit.toFixed(2)),
        productsWithoutCost,
      },
    });
  } catch (error) {
    console.error('getStats error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ===========================================
// إضافة منتج (مع costPrice)
// ===========================================
exports.addProduct = async (req, res) => {
  try {
    const { name, price, category, stock, costPrice } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ error: 'الاسم والسعر والفئة مطلوبين' });
    }
    if (Number(price) <= 0) {
      return res.status(400).json({ error: 'السعر لازم أكبر من 0' });
    }
    if (costPrice !== undefined && costPrice !== null && Number(costPrice) < 0) {
      return res.status(400).json({ error: 'سعر التكلفة لازم يكون موجب' });
    }

    const now = new Date().toISOString();
    const productData = {
      name: String(name).trim(),
      description: req.body.description || '',
      category,
      price: Number(price),
      costPrice: Number(costPrice) || 0, // ✅ جديد
      oldPrice: req.body.oldPrice ? Number(req.body.oldPrice) : null,
      stock: Number(stock) || 0,
      sku: req.body.sku || `LX-${Date.now().toString().slice(-6)}`,
      brand: req.body.brand || '',
      images: req.body.images || [],
      thumbnail: req.body.thumbnail || (req.body.images && req.body.images[0]) || '',
      specs: req.body.specs || {},
      tags: req.body.tags || [],
      rating: 0,
      reviewsCount: 0,
      sold: 0,
      isActive: req.body.isActive !== false,
      isFeatured: !!req.body.isFeatured,
      createdAt: now,
      updatedAt: now,
    };

    const ref = await db.collection(COLLECTIONS.PRODUCTS).add(productData);
    res.status(201).json({ success: true, id: ref.id, data: productData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===========================================
// تعديل منتج (مع costPrice)
// ===========================================
exports.updateProduct = async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    delete updates.id;
    delete updates.createdAt;

    if (updates.costPrice !== undefined) {
      if (Number(updates.costPrice) < 0) {
        return res.status(400).json({ error: 'سعر التكلفة لازم يكون موجب' });
      }
      updates.costPrice = Number(updates.costPrice) || 0;
    }
    if (updates.price !== undefined) {
      updates.price = Number(updates.price);
      if (updates.price <= 0) {
        return res.status(400).json({ error: 'السعر لازم أكبر من 0' });
      }
    }
    if (updates.stock !== undefined) {
      updates.stock = Number(updates.stock) || 0;
    }

    await db.collection(COLLECTIONS.PRODUCTS).doc(req.params.id).update(updates);
    res.json({ success: true, message: 'تم التحديث' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===========================================
// حذف منتج
// ===========================================
exports.deleteProduct = async (req, res) => {
  try {
    // امنع الحذف لو المنتج مستخدم في طلبات
    const orderSnap = await db.collection(COLLECTIONS.ORDERS)
      .where('items.productId', 'array-contains', req.params.id)
      .limit(1)
      .get();

    if (!orderSnap.empty) {
      return res.status(400).json({
        error: 'المنتج ده موجود في طلبات — يفضل تخفيه بدل حذفه',
      });
    }

    await db.collection(COLLECTIONS.PRODUCTS).doc(req.params.id).delete();
    res.json({ success: true, message: 'تم الحذف' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===========================================
// كل الطلبات — مع profit لكل طلب + costPrice لكل item
// ===========================================
exports.getAllOrders = async (req, res) => {
  try {
    const [ordersSnap, productsSnap] = await Promise.all([
      db.collection(COLLECTIONS.ORDERS).get(),
      db.collection(COLLECTIONS.PRODUCTS).get(),
    ]);

    const productsCache = {};
    productsSnap.forEach(doc => {
      productsCache[doc.id] = { id: doc.id, ...doc.data() };
    });

    const orders = [];
    ordersSnap.forEach(doc => {
      const order = { id: doc.id, ...doc.data() };

      // ضيف costPrice + thumbnail لكل item
      if (Array.isArray(order.items)) {
        order.items = order.items.map(item => {
          const product = productsCache[item.productId];
          return {
            ...item,
            costPrice: Number(product?.costPrice || 0),
            thumbnail: item.thumbnail || product?.thumbnail || '',
          };
        });
      }

      // ضيف ربح الطلب (ما عدا الملغي)
      const st = (order.status || '').toLowerCase();
      if (st !== 'cancelled' && st !== 'canceled') {
        const p = computeOrderProfit(order, productsCache);
        order.profit = {
          revenue: Number(p.revenue.toFixed(2)),
          cost: Number(p.cost.toFixed(2)),
          profit: Number(p.profit.toFixed(2)),
          margin: Number(p.margin.toFixed(2)),
        };
      }

      orders.push(order);
    });

    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    console.error('getAllOrders error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ===========================================
// 🆕 تحليلات كاملة (endpoint اختياري — أسرع للفرونت)
// ===========================================
exports.getAnalytics = async (req, res) => {
  try {
    const { from, to, status } = req.query;

    const [ordersSnap, productsSnap] = await Promise.all([
      db.collection(COLLECTIONS.ORDERS).get(),
      db.collection(COLLECTIONS.PRODUCTS).get(),
    ]);

    const productsCache = {};
    productsSnap.forEach(doc => {
      productsCache[doc.id] = { id: doc.id, ...doc.data() };
    });

    const fromTs = from ? new Date(from).getTime() : 0;
    const toTs = to ? new Date(to).getTime() : Date.now();

    let totalRevenue = 0;
    let totalCost = 0;
    let itemsSold = 0;
    let ordersCount = 0;
    let missingCost = 0;
    const perProduct = {};
    const dailyTrend = {};

    for (const doc of ordersSnap.docs) {
      const order = { id: doc.id, ...doc.data() };
      const st = (order.status || '').toLowerCase();
      if (st === 'cancelled' || st === 'canceled') continue;

      if (status === 'delivered' && st !== 'delivered') continue;
      if (status === 'paid' && !['delivered', 'shipped', 'processing', 'paid', 'completed'].includes(st)) continue;

      const orderTs = new Date(order.createdAt || 0).getTime();
      if (orderTs < fromTs || orderTs > toTs) continue;

      ordersCount++;
      const dayKey = new Date(order.createdAt).toISOString().slice(0, 10);
      if (!dailyTrend[dayKey]) dailyTrend[dayKey] = { revenue: 0, profit: 0 };

      for (const item of (order.items || [])) {
        const product = productsCache[item.productId];
        const qty = Number(item.quantity || 1);
        const unitPrice = Number(item.price || product?.price || 0);
        const unitCost = Number(product?.costPrice || 0);

        totalRevenue += unitPrice * qty;
        totalCost += unitCost * qty;
        itemsSold += qty;
        if (!product || unitCost === 0) missingCost++;

        dailyTrend[dayKey].revenue += unitPrice * qty;
        dailyTrend[dayKey].profit += (unitPrice - unitCost) * qty;

        const pid = item.productId || `u_${item.name || ''}`;
        if (!perProduct[pid]) {
          perProduct[pid] = {
            id: pid,
            name: product?.name || item.name || 'منتج محذوف',
            sku: product?.sku || '',
            thumbnail: product?.thumbnail || '',
            qty: 0, revenue: 0, cost: 0,
          };
        }
        perProduct[pid].qty += qty;
        perProduct[pid].revenue += unitPrice * qty;
        perProduct[pid].cost += unitCost * qty;
      }
    }

    const products = Object.values(perProduct).map(r => ({
      ...r,
      profit: r.revenue - r.cost,
      margin: r.revenue > 0 ? ((r.revenue - r.cost) / r.revenue) * 100 : 0,
    })).sort((a, b) => b.profit - a.profit);

    res.json({
      success: true,
      data: {
        summary: {
          revenue: Number(totalRevenue.toFixed(2)),
          cost: Number(totalCost.toFixed(2)),
          profit: Number((totalRevenue - totalCost).toFixed(2)),
          margin: totalRevenue > 0
            ? Number((((totalRevenue - totalCost) / totalRevenue) * 100).toFixed(2))
            : 0,
          ordersCount,
          itemsSold,
          missingCost,
        },
        products,
        dailyTrend,
      },
    });
  } catch (error) {
    console.error('getAnalytics error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ===========================================
// تحديث حالة طلب + إشعار (نسخة نظيفة بدون تكرار)
// ===========================================
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const docRef = db.collection(COLLECTIONS.ORDERS).doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) return res.status(404).json({ error: 'الطلب غير موجود' });

    const order = doc.data();
    const history = order.trackingHistory || [];
    history.push({
      status,
      note: note || `تم التحديث إلى ${status}`,
      timestamp: new Date().toISOString(),
    });

    const updateData = {
      status,
      trackingHistory: history,
      updatedAt: new Date().toISOString(),
    };

    if (status === 'processing') updateData.shippingPaid = true;

    await docRef.update(updateData);

    // ===== الإشعار — نسخة واحدة =====
    if (status === 'shipped') {
      try {
        const userDoc = await db.collection(COLLECTIONS.USERS).doc(order.userId).get();
        const userData = userDoc.exists ? userDoc.data() : null;

        if (userData?.fcmToken) {
          const productImage =
            order.items?.[0]?.image ||
            order.items?.[0]?.thumbnail ||
            'https://luxe-store-1uof.vercel.app/assets/icon-192x192.png';

          const message = {
            token: userData.fcmToken,
            notification: {
              title: '🚚 طلبك في الطريق!',
              body: `طلبك رقم ${order.orderNumber} خرج للتوصيل النهاردة.`,
            },
            data: {
              url: `https://luxe-store-1uof.vercel.app/tracking.html?track=${order.trackingId}`,
            },
            webpush: {
              notification: {
                icon: 'https://luxe-store-1uof.vercel.app/assets/icon-192x192.png',
                badge: 'https://luxe-store-1uof.vercel.app/assets/icon-192x192.png',
                image: productImage,
                vibrate: [300, 100, 300, 100, 300],
                sound: 'default',
                requireInteraction: true,
                actions: [{ action: 'open', title: '📦 تتبع الطلب' }],
              },
            },
          };

          await admin.messaging().send(message);
          console.log('✅ Notification sent to:', order.userId);
        }
      } catch (fcmError) {
        // ما نرجعش error للـ client — الطلب اتحدث فعلاً
        console.error('❌ FCM Send Error:', fcmError);
      }
    }

    res.json({ success: true, message: 'تم تحديث الحالة' });
  } catch (error) {
    console.error('updateOrderStatus error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ===========================================
// كل المستخدمين + LTV
// ===========================================
exports.getAllUsers = async (req, res) => {
  try {
    const [usersSnap, ordersSnap] = await Promise.all([
      db.collection(COLLECTIONS.USERS).get(),
      db.collection(COLLECTIONS.ORDERS).get(),
    ]);

    // جمع إحصائيات كل مستخدم
    const statsMap = {};
    ordersSnap.forEach(doc => {
      const o = doc.data();
      if (!o.userId) return;
      const st = (o.status || '').toLowerCase();
      if (st === 'cancelled' || st === 'canceled') return;

      if (!statsMap[o.userId]) {
        statsMap[o.userId] = { totalOrders: 0, totalSpent: 0, lastOrderAt: null };
      }
      statsMap[o.userId].totalOrders++;
      if (st === 'delivered') {
        statsMap[o.userId].totalSpent += Number(o.total) || 0;
      }
      const ts = o.createdAt || '';
      if (!statsMap[o.userId].lastOrderAt || ts > statsMap[o.userId].lastOrderAt) {
        statsMap[o.userId].lastOrderAt = ts;
      }
    });

    const users = [];
    usersSnap.forEach(doc => {
      const s = statsMap[doc.id] || { totalOrders: 0, totalSpent: 0, lastOrderAt: null };
      users.push({
        uid: doc.id,
        ...doc.data(),
        totalOrders: s.totalOrders,
        totalSpent: Number(s.totalSpent.toFixed(2)),
        lastOrderAt: s.lastOrderAt,
      });
    });

    // رتب حسب الإنفاق
    users.sort((a, b) => b.totalSpent - a.totalSpent);

    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error('getAllUsers error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ===========================================
// تحديث دور المستخدم
// ===========================================
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!['customer', 'admin', 'banned'].includes(role)) {
      return res.status(400).json({ error: 'دور غير صالح' });
    }

    if (req.user.uid === req.params.uid && role === 'banned') {
      return res.status(400).json({ error: 'لا يمكنك حظر حسابك الشخصي!' });
    }

    await db.collection(COLLECTIONS.USERS).doc(req.params.uid).update({
      role,
      updatedAt: new Date().toISOString(),
    });
    res.json({ success: true, message: 'تم تحديث الحالة بنجاح' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
