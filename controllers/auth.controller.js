const { auth, db, COLLECTIONS } = require('../config/firebase');

// ===========================================
// تسجيل حساب جديد
// ===========================================
exports.register = async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'الاسم والبريد وكلمة السر مطلوبين' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'كلمة السر لازم 6 أحرف على الأقل' });
    }

    // 1. أنشئ مستخدم في Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name
    });

    // 2. احفظ في Firestore
    const userData = {
      uid: userRecord.uid,
      name,
      email,
      phone: phone || '',
      role: 'customer',
      addresses: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.collection(COLLECTIONS.USERS).doc(userRecord.uid).set(userData);

    // 3. أنشئ custom token للعميل
    const token = await auth.createCustomToken(userRecord.uid);

    res.status(201).json({
      success: true,
      message: 'تم التسجيل بنجاح',
      user: { uid: userRecord.uid, email, name },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'هذا البريد مستخدم بالفعل' });
    }
    res.status(500).json({ error: error.message });
  }
};

// ===========================================
// تسجيل الدخول (يستخدم Firebase Client SDK من الفرونت)
// ===========================================
exports.login = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'idToken مطلوب' });
    }

    // تحقق من الـ token اللي جاي من Firebase Client SDK
    const decodedToken = await auth.verifyIdToken(idToken);

    // جيب بيانات المستخدم من Firestore
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'بيانات المستخدم غير موجودة' });
    }

    res.json({
      success: true,
      user: userDoc.data()
    });
  } catch (error) {
    res.status(401).json({ error: 'توكن غير صالح' });
  }
};

// ===========================================
// بيانات المستخدم الحالي
// ===========================================
exports.getMe = async (req, res) => {
  try {
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    res.json({ success: true, user: userDoc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===========================================
// تحديث البيانات
// ===========================================
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, addresses } = req.body;
    const updates = { updatedAt: new Date().toISOString() };

    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (addresses && Array.isArray(addresses)) updates.addresses = addresses;

    await db.collection(COLLECTIONS.USERS).doc(req.user.uid).update(updates);

    res.json({ success: true, message: 'تم التحديث' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
