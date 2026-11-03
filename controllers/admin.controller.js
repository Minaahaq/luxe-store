const { db, auth, COLLECTIONS } = require('../config/firebase');
const admin = require('firebase-admin'); // ✅ ضيفنا السطر ده عشان الإشعارات

// ===========================================
// إحصائيات
// ===========================================
exports.getStats = async (req, res) => {
  try {
    const [productsSnap, ordersSnap, usersSnap] = await Promise.all([
      db.collection(COLLECTIONS.PRODUCTS).get(),
      db.collection(COLLECTIONS.ORDERS).get(),
      db.collection(COLLECTIONS.USERS).get()
    ]);

    let revenue = 0;
    ordersSnap.forEach(doc => {
      const o = doc.data();
      if (o.status === 'delivered') revenue += o.total || 0;
    });

    res.json({
      success: true,
      data: {
        products: productsSnap.size,
        orders: ordersSnap.size,
        users: usersSnap.size,
        revenue
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===========================================
// إضافة منتج
// ===========================================
exports.addProduct = async (req, res) => {
  try {
    const { name, price, category, stock } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ error: 'الاسم والسعر والفئة مطلوبين' });
    }
    if (price <= 0) {
      return res.status(400).json({ error: 'السعر لازم أكبر من 0' });
    }

    const now = new Date().toISOString();
    const productData = {
      name,
      description: req.body.description || '',
      category,
      price: Number(price),
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
      isActive: true,
      isFeatured: req.body.isFeatured || false,
      createdAt: now,
      updatedAt: now
    };

    const ref = await db.collection(COLLECTIONS.PRODUCTS).add(productData);
    res.status(201).json({ success: true, id: ref.id, data: productData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===========================================
// تعديل منتج
// ===========================================
exports.updateProduct = async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    delete updates.id;
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
    await db.collection(COLLECTIONS.PRODUCTS).doc(req.params.id).delete();
    res.json({ success: true, message: 'تم الحذف' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===========================================
// كل الطلبات
// ===========================================
exports.getAllOrders = async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTIONS.ORDERS).get();
    const orders = [];
    snapshot.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===========================================
// تحديث حالة طلب (مع إرسال الإشعارات)
// ===========================================
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const doc = await db.collection(COLLECTIONS.ORDERS).doc(req.params.id).get();

    if (!doc.exists) return res.status(404).json({ error: 'الطلب غير موجود' });

    const order = doc.data();
    const history = order.trackingHistory || [];
    history.push({
      status,
      note: note || `تم التحديث إلى ${status}`,
      timestamp: new Date().toISOString()
    });

    const updateData = {
      status,
      trackingHistory: history,
      updatedAt: new Date().toISOString()
    };

    // ✅ لو الحالة "قيد التجهيز" نعلم إن الشحن اتدفع
    if (status === 'processing') {
      updateData.shippingPaid = true;
    }

    await doc.ref.update(updateData);

       // 🚚 إرسال الإشعار لو الحالة "تم الشحن"
    if (status === 'shipped') {
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(order.userId).get();
      const userData = userDoc.data();

      if (userData && userData.fcmToken) {
        const message = {
          token: userData.fcmToken,
          notification: {
            title: '🚚 طلبك في الطريق!',
            body: `طلبك رقم ${order.orderNumber} خرج للتوصيل النهاردة.`
          },
          data: {
            url: `https://luxe-store-1uof.vercel.app/tracking.html?track=${order.trackingId}`
          },
          // ✅ الإضافة دي بتخلي الإشعار فيه لوجو وصوت وألوان
          webpush: {
            notification: {
              icon: 'https://luxe-store-1uof.vercel.app/assets/icon-192x192.png',
              badge: 'https://luxe-store-1uof.vercel.app/assets/icon-192x192.png',
              vibrate: [300, 100, 300, 100, 300], // 🔔 الاهتزاز
              sound: 'default', // 🔊 الصوت
              requireInteraction: true, // يفضل ظاهر لحد ما يدوس عليه
              actions: [
                { action: 'open', title: '📦 تتبع الطلب' }
              ]
            }
          }
        };

        try {
          await admin.messaging().send(message);
          console.log('✅ Notification sent to:', order.userId);
        } catch (fcmError) {
          console.error('❌ FCM Send Error:', fcmError);
        }
      }
    }
// ===========================================
// كل المستخدمين
// ===========================================
exports.getAllUsers = async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTIONS.USERS).get();
    const users = [];
    snapshot.forEach(doc => users.push({ uid: doc.id, ...doc.data() }));
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===========================================
// تحديث دور المستخدم (مع الحظر)
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
      updatedAt: new Date().toISOString()
    });
    res.json({ success: true, message: 'تم تحديث الحالة بنجاح' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
