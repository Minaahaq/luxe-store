// ===========================================
// Firebase Admin Initialization
// ===========================================

const admin = require('firebase-admin');
const path = require('path');

// على Vercel: نقرأ من Environment Variable
// محلياً: نقرأ من الملف
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${serviceAccount.project_id}.appspot.com`
  });
}

const auth = admin.auth();
const db = admin.firestore();
const storage = admin.storage();

const COLLECTIONS = {
  USERS: 'users',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  ORDERS: 'orders',
  REVIEWS: 'reviews'
};

module.exports = {
  admin,
  auth,
  db,
  storage,
  COLLECTIONS
};
