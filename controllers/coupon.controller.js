const { db } = require('../config/firebase'); // عدّل حسب ملف Firebase عندك
const { FieldValue } = require('firebase-admin/firestore');

// ==================== CREATE ====================
exports.createCoupon = async (req, res, next) => {
  try {
    const {
      code,
      type,              // 'percentage' | 'fixed'
      value,             // 10 (يعني 10%) أو 50 (يعني 50 جنيه)
      minOrderAmount = 0,
      maxDiscount = null,
      usageLimit = null, // null = غير محدود
      perUserLimit = 1,
      expiresAt = null,  // ISO date string
      isActive = true,
    } = req.body;

    // التحقق الأساسي
    if (!code || !type || value == null) {
      return res.status(400).json({ message: 'code, type, and value are required' });
    }
    if (!['percentage', 'fixed'].includes(type)) {
      return res.status(400).json({ message: 'type must be percentage or fixed' });
    }
    if (type === 'percentage' && (value <= 0 || value > 100)) {
      return res.status(400).json({ message: 'percentage value must be between 1 and 100' });
    }
    if (value <= 0) {
      return res.status(400).json({ message: 'value must be greater than 0' });
    }

    const normalizedCode = code.trim().toUpperCase();
    const couponRef = db.collection('coupons').doc(normalizedCode);
    const existing = await couponRef.get();

    if (existing.exists) {
      return res.status(409).json({ message: 'Coupon code already exists' });
    }

    const couponData = {
      code: normalizedCode,
      type,
      value: Number(value),
      minOrderAmount: Number(minOrderAmount) || 0,
      maxDiscount: maxDiscount != null ? Number(maxDiscount) : null,
      usageLimit: usageLimit != null ? Number(usageLimit) : null,
      perUserLimit: Number(perUserLimit) || 1,
      usedCount: 0,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: Boolean(isActive),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: req.user?.uid || null,
    };

    await couponRef.set(couponData);

    return res.status(201).json({
      message: 'Coupon created successfully',
      coupon: { id: normalizedCode, ...couponData },
    });
  } catch (error) {
    next(error);
  }
};

// ==================== READ ALL ====================
exports.getAllCoupons = async (req, res, next) => {
  try {
    const { active } = req.query;
    let query = db.collection('coupons');

    if (active === 'true') query = query.where('isActive', '==', true);
    if (active === 'false') query = query.where('isActive', '==', false);

    const snapshot = await query.get();
    const coupons = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return res.status(200).json({ count: coupons.length, coupons });
  } catch (error) {
    next(error);
  }
};

// ==================== READ ONE ====================
exports.getCouponByCode = async (req, res, next) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const doc = await db.collection('coupons').doc(code).get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    return res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    next(error);
  }
};

// ==================== UPDATE ====================
exports.updateCoupon = async (req, res, next) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const couponRef = db.collection('coupons').doc(code);
    const doc = await couponRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    // منع تعديل الكود نفسه و usedCount من الـ body
    const { code: _ignore, usedCount: _ignore2, createdAt: _ignore3, ...updates } = req.body;

    if (updates.type && !['percentage', 'fixed'].includes(updates.type)) {
      return res.status(400).json({ message: 'Invalid type' });
    }
    if (updates.value != null) updates.value = Number(updates.value);
    if (updates.expiresAt) updates.expiresAt = new Date(updates.expiresAt);

    updates.updatedAt = FieldValue.serverTimestamp();

    await couponRef.update(updates);

    return res.status(200).json({ message: 'Coupon updated successfully', updates });
  } catch (error) {
    next(error);
  }
};

// ==================== DELETE ====================
exports.deleteCoupon = async (req, res, next) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const couponRef = db.collection('coupons').doc(code);
    const doc = await couponRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    await couponRef.delete();

    return res.status(200).json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ==================== VALIDATE (للعميل قبل الطلب) ====================
exports.validateCoupon = async (req, res, next) => {
  try {
    const { code, orderTotal } = req.body;

    if (!code || orderTotal == null) {
      return res.status(400).json({ message: 'code and orderTotal are required' });
    }

    const result = await evaluateCoupon(code, Number(orderTotal), req.user?.uid);

    if (!result.valid) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(200).json({
      valid: true,
      code: result.coupon.code,
      discount: result.discount,
      finalTotal: result.finalTotal,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== HELPER: تقييم الكوبون ====================
/**
 * تقييم صلاحية الكوبون وحساب الخصم
 * يُستخدم أيضاً داخل order.controller.js عند إنشاء الطلب
 */
async function evaluateCoupon(rawCode, orderTotal, userId) {
  const code = rawCode.trim().toUpperCase();
  const doc = await db.collection('coupons').doc(code).get();

  if (!doc.exists) {
    return { valid: false, message: 'Coupon not found' };
  }

  const coupon = { id: doc.id, ...doc.data() };

  if (!coupon.isActive) {
    return { valid: false, message: 'Coupon is not active' };
  }

  if (coupon.expiresAt) {
    const expiresAt =
      coupon.expiresAt._seconds != null
        ? new Date(coupon.expiresAt._seconds * 1000)
        : new Date(coupon.expiresAt);
    if (expiresAt < new Date()) {
      return { valid: false, message: 'Coupon has expired' };
    }
  }

  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, message: 'Coupon usage limit reached' };
  }

  if (orderTotal < (coupon.minOrderAmount || 0)) {
    return {
      valid: false,
      message: `Minimum order amount is ${coupon.minOrderAmount}`,
    };
  }

  // التحقق من حد الاستخدام لكل مستخدم
  if (userId && coupon.perUserLimit != null) {
    const usageSnap = await db
      .collection('coupon_usages')
      .where('couponCode', '==', code)
      .where('userId', '==', userId)
      .get();

    if (usageSnap.size >= coupon.perUserLimit) {
      return { valid: false, message: 'You have reached the usage limit for this coupon' };
    }
  }

  // حساب الخصم
  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = (orderTotal * coupon.value) / 100;
    if (coupon.maxDiscount != null) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  } else {
    discount = Math.min(coupon.value, orderTotal);
  }

  discount = Math.round(discount * 100) / 100;
  const finalTotal = Math.max(0, Math.round((orderTotal - discount) * 100) / 100);

  return { valid: true, coupon, discount, finalTotal };
}

// ==================== HELPER: استهلاك الكوبون بعد نجاح الطلب ====================
async function consumeCoupon(rawCode, userId, orderId) {
  const code = rawCode.trim().toUpperCase();
  const couponRef = db.collection('coupons').doc(code);

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(couponRef);
    if (!doc.exists) throw new Error('Coupon not found');

    const data = doc.data();
    if (data.usageLimit != null && data.usedCount >= data.usageLimit) {
      throw new Error('Coupon usage limit reached');
    }

    tx.update(couponRef, {
      usedCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // تسجيل الاستخدام
    const usageRef = db.collection('coupon_usages').doc();
    tx.set(usageRef, {
      couponCode: code,
      userId: userId || null,
      orderId: orderId || null,
      usedAt: FieldValue.serverTimestamp(),
    });
  });
}

module.exports.evaluateCoupon = evaluateCoupon;
module.exports.consumeCoupon = consumeCoupon;
