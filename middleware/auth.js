// ===========================================
// Auth Middleware - Verify Firebase Token
// ===========================================

const { auth, db, COLLECTIONS } = require('../config/firebase');

// ===========================================
// التحقق من المستخدم (لازم يكون مسجل)
// ===========================================
async function verifyToken(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'غير مصرح - لازم تسجل دخول' });
    }

    const token = header.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;

    // جيب بيانات المستخدم من Firestore
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(decodedToken.uid).get();
    if (userDoc.exists) {
      req.userData = userDoc.data();
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'توكن غير صالح أو منتهي' });
  }
}

// ===========================================
// التحقق من الأدمن
// ===========================================
async function verifyAdmin(req, res, next) {
  try {
    await verifyToken(req, res, async () => {
      if (!req.userData || req.userData.role !== 'admin') {
        return res.status(403).json({ error: 'غير مصرح - لازم تكون أدمن' });
      }
      next();
    });
  } catch (error) {
    return res.status(403).json({ error: 'غير مصرح' });
  }
}

// ===========================================
// اختياري - مسجل دخول أو زائر
// ===========================================
async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const token = header.split('Bearer ')[1];
      const decodedToken = await auth.verifyIdToken(token);
      req.user = decodedToken;
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(decodedToken.uid).get();
      if (userDoc.exists) req.userData = userDoc.data();
    }
    next();
  } catch (error) {
    next(); // نكمل كزائر
  }
}

module.exports = { verifyToken, verifyAdmin, optionalAuth };
