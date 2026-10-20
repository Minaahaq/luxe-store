// ===========================================
// Seed Products - LUXE Store
// ===========================================
// الاستخدام: node seed.js

const admin = require('firebase-admin');
const path = require('path');

// تحميل Service Account
const serviceAccount = require(path.join(__dirname, 'config/serviceAccountKey.json'));

// Initialize
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// ===========================================
// المنتجات
// ===========================================
const PRODUCTS = [
  {
    name: "سماعات Sony WH-1000XM5",
    description: "سماعات لاسلكية فاخرة بإلغاء ضوضاء احترافي. بطارية 30 ساعة. صوت نقي.",
    category: "إلكترونيات",
    price: 12999,
    oldPrice: 14999,
    stock: 25,
    sku: "LX-001",
    brand: "Sony",
    images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80"],
    thumbnail: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80",
    isFeatured: true,
    rating: 4.8,
    reviewsCount: 234
  },
  {
    name: "Apple Watch Ultra 2",
    description: "ساعة ذكية احترافية بشاشة Retina دائمة التشغيل ومقاومة للماء.",
    category: "إلكترونيات",
    price: 24999,
    oldPrice: 28999,
    stock: 15,
    sku: "LX-002",
    brand: "Apple",
    images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80"],
    thumbnail: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80",
    isFeatured: true,
    rating: 4.7,
    reviewsCount: 189
  },
  {
    name: "حذاء Nike Air Max Premium",
    description: "حذاء رياضي بتصميم عصري وراحة استثنائية. مناسب للجري والاستخدام اليومي.",
    category: "أحذية",
    price: 4599,
    oldPrice: 5999,
    stock: 30,
    sku: "LX-003",
    brand: "Nike",
    images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80"],
    thumbnail: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
    isFeatured: true,
    rating: 4.9,
    reviewsCount: 512
  },
  {
    name: "حقيبة Montblanc جلد طبيعي",
    description: "حقيبة ظهر فاخرة من الجلد الإيطالي الطبيعي. تصميم كلاسيكي أنيق.",
    category: "حقائب",
    price: 8999,
    oldPrice: 11999,
    stock: 8,
    sku: "LX-004",
    brand: "Montblanc",
    images: ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80"],
    thumbnail: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80",
    isFeatured: false,
    rating: 4.6,
    reviewsCount: 98
  },
  {
    name: "كاميرا Sony A7 IV",
    description: "كاميرا احترافية Full Frame بعدسة 28-70mm. مثالية للتصوير الاحترافي.",
    category: "إلكترونيات",
    price: 89999,
    oldPrice: 99999,
    stock: 5,
    sku: "LX-005",
    brand: "Sony",
    images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80"],
    thumbnail: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80",
    isFeatured: true,
    rating: 4.9,
    reviewsCount: 156
  },
  {
    name: "نظارة Ray-Ban Aviator Gold",
    description: "نظارة شمسية كلاسيكية بإطار ذهبي وعدسات UV400.",
    category: "أزياء",
    price: 2599,
    oldPrice: 3499,
    stock: 20,
    sku: "LX-006",
    brand: "Ray-Ban",
    images: ["https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80"],
    thumbnail: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80",
    isFeatured: false,
    rating: 4.5,
    reviewsCount: 78
  },
  {
    name: "MacBook Pro M3 Max",
    description: "لابتوب احترافي بشريحة M3 Max. 36GB RAM و 1TB SSD. مثالي للمصممين.",
    category: "إلكترونيات",
    price: 149999,
    oldPrice: 169999,
    stock: 12,
    sku: "LX-007",
    brand: "Apple",
    images: ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80"],
    thumbnail: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80",
    isFeatured: true,
    rating: 4.9,
    reviewsCount: 687
  },
  {
    name: "عطر Dior Sauvage Elixir",
    description: "عطر رجالي فاخر بتركيبة قوية وتصميم أنيق.",
    category: "عطور",
    price: 3499,
    oldPrice: 4299,
    stock: 35,
    sku: "LX-008",
    brand: "Dior",
    images: ["https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&q=80"],
    thumbnail: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&q=80",
    isFeatured: true,
    rating: 4.8,
    reviewsCount: 1234
  },
  {
    name: "ساعة Rolex Submariner",
    description: "ساعة فاخرة كلاسيكية. تصميم خالد وهيبة لا مثيل لها.",
    category: "ساعات",
    price: 499999,
    oldPrice: 549999,
    stock: 2,
    sku: "LX-009",
    brand: "Rolex",
    images: ["https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&q=80"],
    thumbnail: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&q=80",
    isFeatured: true,
    rating: 5.0,
    reviewsCount: 89
  },
  {
    name: "مكبر صوت Marshall Stanmore III",
    description: "مكبر صوت بلوتوث بتصميم كلاسيكي مذهل وجودة صوت احترافية.",
    category: "إلكترونيات",
    price: 4999,
    oldPrice: 6499,
    stock: 20,
    sku: "LX-010",
    brand: "Marshall",
    images: ["https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80"],
    thumbnail: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80",
    isFeatured: false,
    rating: 4.7,
    reviewsCount: 312
  }
];

// ===========================================
// التشغيل
// ===========================================
async function seed() {
  console.log('🌱 بدء إضافة المنتجات...\n');

  for (const product of PRODUCTS) {
    try {
      const now = new Date().toISOString();
      const docRef = await db.collection('products').add({
        ...product,
        isActive: true,
        sold: 0,
        specs: {},
        tags: [],
        createdAt: now,
        updatedAt: now
      });
      console.log(`✅ ${product.name} (ID: ${docRef.id})`);
    } catch (err) {
      console.error(`❌ ${product.name}: ${err.message}`);
    }
  }

  console.log('\n🎉 تمت الإضافة بنجاح!');
  console.log(`📦 عدد المنتجات المضافة: ${PRODUCTS.length}`);
  process.exit(0);
}

seed();
