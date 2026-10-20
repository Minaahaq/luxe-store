const { db, COLLECTIONS } = require('../config/firebase');

// ===========================================
// جلب كل المنتجات (متاح للجميع)
// ===========================================
exports.getAll = async (req, res) => {
  try {
    const { category, search } = req.query;

    let query = db.collection(COLLECTIONS.PRODUCTS);

    // فلترة بالفئة
    if (category) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query.get();

    let products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });

    // بحث يدوي
    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, count: products.length, data: products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===========================================
// منتج واحد
// ===========================================
exports.getById = async (req, res) => {
  try {
    const doc = await db.collection(COLLECTIONS.PRODUCTS).doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'المنتج غير موجود' });
    }
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===========================================
// المنتجات المميزة
// ===========================================
exports.getFeatured = async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTIONS.PRODUCTS)
      .where('isFeatured', '==', true)
      .limit(8)
      .get();

    const products = [];
    snapshot.forEach(doc => products.push({ id: doc.id, ...doc.data() }));

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
