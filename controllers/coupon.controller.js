const { db, COLLECTIONS } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

// ===========================================
// Constants
// ===========================================
const COUPONS = 'coupons';
const COUPON_USAGES = 'coupon_usages';

// ===========================================
// Helpers
// ===========================================
function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

async function evaluateCoupon(rawCode, orderTotal, userId) {
  const code = normalizeCode(rawCode);
  if (!code) return { valid: false, message: 'كود الخصم مطلوب' };

  const doc = await db.collection(COUPONS).doc(code).get();
  if (!doc.exists) return { valid: false, message: 'كود الخصم غير موجود' };

  const coupon = { id: doc.id, ...doc.data() };

  if (!coupon.isActive) return { valid: false, message: 'كود الخصم غير مُفعّل' };

  if (coupon.expiresAt) {
    const expiresAt = coupon.expiresAt._seconds
      ? new Date(coupon.expiresAt._seconds * 1000)
      : new Date(coupon.expiresAt);
    if (expiresAt < new Date()) return { valid: false, message: 'كود الخصم منتهي الصلاحية' };
  }

  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, message: 'تم استهلاك كود الخصم بالكامل' };
  }

  if (orderTotal < (coupon.minOrderAmount || 0)) {
    return {
      valid: false,
      message: `الحد الأدنى للطلب ${coupon.minOrderAmount} جنيه لاستخدام الكود`
    };
  }

  if (userId && coupon.perUserLimit != null) {
    const usageSnap = await db.collection(COUPON_USAGES)
      .where('couponCode', '==', code)
      .where('userId', '==', userId)
      .get();
    if (usageSnap.size >= coupon.perUserLimit) {
      return { valid: false, message: 'لقد استخدمت هذا الكود من قبل' };
    }
  }

  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = (orderTotal * coupon.value) / 100;
    if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
  } else if (coupon.type === 'fixed') {
    discount = Math.min(coupon.value, orderTotal);
  } else {
    return { valid: false, message: 'نوع الكوبون غير صحيح' };
  }

  discount = Math.round(discount * 100) / 100;
  return { valid: true, coupon, discount };
}

async function consumeCoupon(rawCode, userId, orderId) {
  const code = normalizeCode(rawCode);
  const couponRef = db.collection(COUPONS).doc(code);

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(couponRef);
    if (!doc.exists) throw new Error('كود الخصم غير موجود');

    const data = doc.data();
    if (data.usageLimit != null && data.usedCount >= data.usageLimit) {
      throw new Error('تم استهلاك كود الخصم بالكامل');
    }

    tx.update(couponRef, {
      usedCount: FieldValue.increment(1),
      updatedAt: new Date().toISOString()
    });

    const usageRef = db.collection(COUPON_USAGES).doc();
    tx.set(usageRef, {
      couponCode: code,
      userId: userId || null,
      orderId: orderId || null,
      usedAt: new Date().toISOString()
    });
  });
}

// ===========================================
// 1. إنشاء كوبون (Admin)
// ===========================================
exports.create = async (req, res) => {
  try {
    const { code, type, value, minOrderAmount = 0, maxDiscount = null,
            usageLimit = null, perUserLimit = 1, expiresAt = null } = req.body;

    if (!code || !type || value == null) {
      return res.status(400).json({ error: 'code و type و value مطلوبين' });
    }
    if (!['percentage', 'fixed'].includes(type)) {
      return res.status(400).json({ error: 'type لازم percentage أو fixed' });
    }
    if (type === 'percentage' && (value <= 0 || value > 100)) {
      return res.status(400).json({ error: 'نسبة الخصم لازم بين 1 و 100' });
    }
    if (value <= 0) {
      return res.status(400).json({ error: 'قيمة الخصم لازم أكبر من 0' });
    }

    const normalized = normalizeCode(code);
    const ref = db.collection(COUPONS).doc(normalized);
    const existing = await ref.get();
    if (existing.exists) {
      return res.status(409).json({ error: 'كود الخصم موجود بالفعل' });
    }

    const now = new Date().toISOString();
    const data = {
      code: normalized,
      type,
      value: Number(value),
      minOrderAmount: Number(minOrderAmount) || 0,
      maxDiscount: maxDiscount != null ? Number(maxDiscount) : null,
      usageLimit: usageLimit != null ? Number(usageLimit) : null,
      perUserLimit: Number(perUserLimit) || 1,
      usedCount: 0,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: req.user?.uid || null
    };

    await ref.set(data);
    res.status(201).json({ success: true, message: 'تم إنشاء الكوبون', data });
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({ error: 'فشل إنشاء الكوبون' });
  }
};

// ===========================================
// 2. كل الكوبونات (Admin)
// ===========================================
exports.getAll = async (req, res) => {
  try {
    const snapshot = await db.collection(COUPONS).get();
    const coupons = [];
    snapshot.forEach(doc => coupons.push({ id: doc.id, ...doc.data() }));
    coupons.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, count: coupons.length, data: coupons });
  } catch (error) {
    res.status(500).json({ error: 'فشل تحميل الكوبونات' });
  }
};

// ===========================================
// 3. كوبون واحد (Admin)
// ===========================================
exports.getByCode = async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);
    const doc = await db.collection(COUPONS).doc(code).get();
    if (!doc.exists) return res.status(404).json({ error: 'الكوبون غير موجود' });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    res.status(500).json({ error: 'فشل تحميل الكوبون' });
  }
};

// ===========================================
// 4. تحديث كوبون (Admin)
// ===========================================
exports.update = async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);
    const ref = db.collection(COUPONS).doc(code);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'الكوبون غير موجود' });

    const { code: _c, usedCount: _u, createdAt: _cr, createdBy: _cb, ...updates } = req.body;

    if (updates.type && !['percentage', 'fixed'].includes(updates.type)) {
      return res.status(400).json({ error: 'نوع الكوبون غير صحيح' });
    }
    if (updates.value != null) updates.value = Number(updates.value);
    if (updates.expiresAt) updates.expiresAt = new Date(updates.expiresAt).toISOString();
    updates.updatedAt = new Date().toISOString();

    await ref.update(updates);
    res.json({ success: true, message: 'تم تحديث الكوبون', updates });
  } catch (error) {
    res.status(500).json({ error: 'فشل تحديث الكوبون' });
  }
};

// ===========================================
// 5. حذف كوبون (Admin)
// ===========================================
exports.remove = async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);
    const ref = db.collection(COUPONS).doc(code);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'الكوبون غير موجود' });
    await ref.delete();
    res.json({ success: true, message: 'تم حذف الكوبون' });
  } catch (error) {
    res.status(500).json({ error: 'فشل حذف الكوبون' });
  }
};

// ===========================================
// 6. التحقق من كوبون (User) — قبل الطلب
// ===========================================
exports.validate = async (req, res) => {
  try {
    const { code, orderTotal } = req.body;
    if (!code || orderTotal == null) {
      return res.status(400).json({ error: 'code و orderTotal مطلوبين' });
    }

    const result = await evaluateCoupon(code, Number(orderTotal), req.user?.uid);
    if (!result.valid) {
      return res.status(400).json({ error: result.message });
    }

    const finalTotal = Math.max(0, Math.round((orderTotal - result.discount) * 100) / 100);
    res.json({
      success: true,
      data: {
        code: result.coupon.code,
        type: result.coupon.type,
        value: result.coupon.value,
        discount: result.discount,
        finalTotal
      }
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({ error: 'فشل التحقق من الكوبون' });
  }
};

module.exports.evaluateCoupon = evaluateCoupon;
module.exports.consumeCoupon = consumeCoupon;
