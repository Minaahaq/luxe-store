// ===========================================
// Firebase Admin Initialization (v12.x)
// ===========================================

const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));

// Initialize
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
