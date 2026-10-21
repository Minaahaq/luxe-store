const { db, COLLECTIONS } = require('../config/firebase');

// ===========================================
// Constants
// ===========================================
const SHIPPING_COST = 200;
const PHONE_RE = /^01[0-9]{9}$/;

// ===========================================
// Helpers
// ===========================================
function sanitize(str) {
  return String(str || '').replace(/[<>]/g, '').trim();
}

function validateOrderInput(body) {
  const errors = [];

  if (!Array.isArray(body.items) || body.items.length === 0) {
    errors.push('الطلب لازم يحتوي منتج واحد على الأقل');
  } else if (body.items.length > 50) {
    errors.push('الطلب فيه عدد كبير من المنتجات');
  } else {
    body.items.forEach((it, i) => {
      if (!it.productId || typeof it.productId !== 'string') {
        errors.push(`المنتج رقم ${i + 1}: غير صحيح`);
      }
      if (!Number.isInteger(it.qty) || it.qty < 1 || it.qty > 100) {
        errors.push(`المنتج رقم ${i + 1}: الكمية لازم 1-100`);
      }
    });
  }

  const addr = body.shippingAddress || {};
  if (!addr.city || addr.city.trim().length < 2) errors.push('المحافظة مطلوبة');
  if (!addr.area || addr.area.trim().length < 2) errors.push('المنطقة مطلوبة');
  if (!addr.street || addr.street.trim().length < 3) errors.push('الشارع مطلوب');

  // رقم عملية التحويل إجباري
  if (!body.paymentRefNumber || body.paymentRefNumber.trim().length < 6) {
    errors.push('رقم عملية التحويل مطلوب (6 أحرف على الأقل)');
  }

  return errors;
}

// ===========================================
// 1. إنشاء طلب
// ===========================================
exports.create = async (req, res) => {
  try {
    const errors = validateOrderInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'بيانات غير صحيحة', details: errors });
    }

    if (!req.userData) {
      return res.status(403).json({ error: 'بيانات المستخدم غير مكتملة' });
    }

    // تحقق من المنتجات والمخزون
    let subtotal = 0;
    const orderItems = [];

    for (const item of req.body.items) {
      const prodDoc = await db.collection(COLLECTIONS.PRODUCTS).doc(item.productId).get();
      if (!prodDoc.exists) {
        return res.status(404).json({ error: `المنتج ${item.productId} غير موجود` });
      }

      const prod = prodDoc.data();
      if (prod.stock < item.qty) {
        return res.status(400).json({
          error: `الكمية المطلوبة من "${prod.name}" غير متوفرة (متاح: ${prod.stock})`
        });
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

    // الحساب
    const shipping = SHIPPING_COST;
    const total = subtotal + shipping;

    // بيانات الطلب
    const orderNumber = 'ORD-' + Date.now().toString().slice(-8);
    const trackingId = 'TRK-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const now = new Date().toISOString();
    const addr = req.body.shippingAddress;

    const orderData = {
      orderNumber,
      trackingId,
      userId: req.user.uid,
      customer: {
        name: sanitize(req.userData.name || ''),
        email: req.user.email || '',
        phone: sanitize(req.userData.phone || '')
      },
      shippingAddress: {
        city: sanitize(addr.city),
        area: sanitize(addr.area),
        street: sanitize(addr.street),
        building: sanitize(addr.building || ''),
        apartment: sanitize(addr.apartment || ''),
        notes: sanitize(req.body.notes || '')
      },
      items: orderItems,
      subtotal,
      shipping,
      discount: 0,
      total,
      
      // بيانات الدفع
      paymentMethod: 'vodafone_cash',
      paymentRefNumber: sanitize(req.body.paymentRefNumber),
      shippingPaid: false,         // لسه ما اتأكدش
      shippingFee: SHIPPING_COST,
      productAmount: subtotal,     // المتبقي عند الاستلام
      
      // الحالة
      status: 'pending_payment',   // في انتظار مراجعة الدفع
      
      trackingHistory: [{
        status: 'pending_payment',
        note: 'تم استلام الطلب — في انتظار مراجعة إثبات دفع الشحن',
        timestamp: now
      }],
      createdAt: now,
      updatedAt: now
    };

    const ref = await db.collection(COLLECTIONS.ORDERS).add(orderData);

    // قلل المخزون
    for (const item of orderItems) {
      const prodRef = db.collection(COLLECTIONS.PRODUCTS).doc(item.productId);
      const prodSnap = await prodRef.get();
      if (prodSnap.exists) {
        const p = prodSnap.data();
        await prodRef.update({
          stock: Math.max(0, (p.stock || 0) - item.qty),
          sold: (p.sold || 0) + item.qty
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الطلب — في انتظار مراجعة الدفع',
      orderId: ref.id,
      orderNumber,
      trackingId,
      shippingFee: SHIPPING_COST,
      productAmount: subtotal,
      total
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'فشل إنشاء الطلب' });
  }
};

// ===========================================
// 2. طلباتي
// ===========================================
exports.getMyOrders = async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTIONS.ORDERS)
      .where('userId', '==', req.user.uid)
      .get();

    const orders = [];
    snapshot.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ error: 'فشل تحميل الطلبات' });
  }
};

// ===========================================
// 3. طلب واحد
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
    res.status(500).json({ error: 'فشل تحميل الطلب' });
  }
};

// ===========================================
// 4. تتبع
// ===========================================
exports.track = async (req, res) => {
  try {
    const trackingId = String(req.params.trackingId || '').toUpperCase();

    const snapshot = await db.collection(COLLECTIONS.ORDERS)
      .where('trackingId', '==', trackingId)
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
        customer: { name: order.customer?.name || '' },
        shippingAddress: {
          city: order.shippingAddress?.city || '',
          area: order.shippingAddress?.area || ''
        },
        total: order.total,
        itemsCount: order.items?.length || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'فشل التتبع' });
  }
};

// ===========================================
// 5. إلغاء طلب
// ===========================================
exports.cancel = async (req, res) => {
  try {
    const doc = await db.collection(COLLECTIONS.ORDERS).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'الطلب غير موجود' });

    const order = doc.data();

    if (order.userId !== req.user.uid) {
      return res.status(403).json({ error: 'غير مصرح' });
    }

    if (!['pending_payment', 'pending'].includes(order.status)) {
      return res.status(400).json({ error: 'لا يمكن الإلغاء بعد بدء التجهيز' });
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
    for (const item of order.items || []) {
      const prodRef = db.collection(COLLECTIONS.PRODUCTS).doc(item.productId);
      const prodSnap = await prodRef.get();
      if (prodSnap.exists) {
        const p = prodSnap.data();
        await prodRef.update({
          stock: (p.stock || 0) + item.qty,
          sold: Math.max(0, (p.sold || 0) - item.qty)
        });
      }
    }

    res.json({ success: true, message: 'تم إلغاء الطلب' });
  } catch (error) {
    res.status(500).json({ error: 'فشل إلغاء الطلب' });
  }
};
