const { db, COLLECTIONS } = require('../config/firebase');

// ===========================================
// إنشاء طلب
// ===========================================
exports.create = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'الطلب لازم يحتوي منتج' });
    }
    if (!shippingAddress || !shippingAddress.city || !shippingAddress.street) {
      return res.status(400).json({ error: 'العنوان ناقص' });
    }

    // 1. احسب الإجمالي + تحقق من المخزون
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const prodDoc = await db.collection(COLLECTIONS.PRODUCTS).doc(item.productId).get();
      if (!prodDoc.exists) {
        return res.status(404).json({ error: `المنتج ${item.productId} غير موجود` });
      }
      const prod = prodDoc.data();
      if (prod.stock < item.qty) {
        return res.status(400).json({ error: `الكمية المطلوبة من ${prod.name} غير متوفرة` });
      }

      const itemSubtotal = prod.price * item.qty;
      subtotal += itemSubtotal;

      orderItems.push({
        productId: item.productId,
        name: prod.name,
        price: prod.price,
        qty: item.qty,
        image: prod.thumbnail || (prod.images && prod.images[0]) || '',
        subtotal: itemSubtotal
      });
    }

    // 2. احسب الشحن
    const shipping = subtotal >= 2000 ? 0 : 50;
    const total = subtotal + shipping;

    // 3. بيانات الطلب
    const orderNumber = 'ORD-' + Date.now().toString().slice(-8);
    const trackingId = 'TRK-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const now = new Date().toISOString();

    const orderData = {
      orderNumber,
      trackingId,
      userId: req.user.uid,
      customer: {
        name: req.userData?.name || '',
        email: req.user.email || '',
        phone: req.userData?.phone || ''
      },
      shippingAddress,
      items: orderItems,
      subtotal,
      shipping,
      discount: 0,
      total,
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: 'unpaid',
      status: 'pending',
      trackingHistory: [{
        status: 'pending',
        note: 'تم استلام الطلب بنجاح',
        timestamp: now
      }],
      notes: notes || '',
      createdAt: now,
      updatedAt: now
    };

    // 4. احفظ الطلب
    const ref = await db.collection(COLLECTIONS.ORDERS).add(orderData);

    // 5. قلل المخزون
    for (const item of orderItems) {
      const prodRef = db.collection(COLLECTIONS.PRODUCTS).doc(item.productId);
      const prodDoc = await prodRef.get();
      await prodRef.update({
        stock: prodDoc.data().stock - item.qty,
        sold: (prodDoc.data().sold || 0) + item.qty
      });
    }

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الطلب',
      orderId: ref.id,
      orderNumber,
      trackingId,
      total
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ===========================================
// طلباتي
// ===========================================
exports.getMyOrders = async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTIONS.ORDERS)
      .where('userId', '==', req.user.uid)
      .get();

    const orders = [];
    snapshot.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));

    // ترتيب يدوي (الأحدث أولاً)
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===========================================
// طلب واحد
// ===========================================
exports.getById = async (req, res) => {
  try {
    const doc = await db.collection(COLLECTIONS.ORDERS).doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }
    const order = doc.data();
    if (order.userId !== req.user.uid && req.userData?.role !== 'admin') {
      return res.status(403).json({ error: 'غير مصرح' });
    }
    res.json({ success: true, data: { id: doc.id, ...order } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===========================================
// تتبع برقم
// ===========================================
exports.track = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const snapshot = await db.collection(COLLECTIONS.ORDERS)
      .where('trackingId', '==', trackingId.toUpperCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'لا يوجد طلب بهذا الرقم' });
    }

    const doc = snapshot.docs[0];
    const order = doc.data();

    res.json({
      success: true,
      data: {
        trackingId: order.trackingId,
        orderNumber: order.orderNumber,
        status: order.status,
        trackingHistory: order.trackingHistory,
        customer: { name: order.customer.name },
        shippingAddress: order.shippingAddress
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===========================================
// إلغاء طلب
// ===========================================
exports.cancel = async (req, res) => {
  try {
    const doc = await db.collection(COLLECTIONS.ORDERS).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'الطلب غير موجود' });

    const order = doc.data();
    if (order.userId !== req.user.uid) {
      return res.status(403).json({ error: 'غير مصرح' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'لا يمكن الإلغاء بعد التجهيز' });
    }

    const history = order.trackingHistory || [];
    history.push({
      status: 'cancelled',
      note: 'تم الإلغاء بواسطة العميل',
      timestamp: new Date().toISOString()
    });

    await doc.ref.update({
      status: 'cancelled',
      trackingHistory: history,
      updatedAt: new Date().toISOString()
    });

    // رجع المخزون
    for (const item of order.items) {
      const prodRef = db.collection(COLLECTIONS.PRODUCTS).doc(item.productId);
      const prodDoc = await prodRef.get();
      if (prodDoc.exists) {
        await prodRef.update({
          stock: prodDoc.data().stock + item.qty,
          sold: Math.max(0, (prodDoc.data().sold || 0) - item.qty)
        });
      }
    }

    res.json({ success: true, message: 'تم إلغاء الطلب' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
