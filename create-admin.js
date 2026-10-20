// ===========================================
// Create Admin User - LUXE Store
// الاستخدام: node create-admin.js
// ===========================================

const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, 'config/serviceAccountKey.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const auth = admin.auth();
const db = admin.firestore();

// ===========================================
// بيانات الأدمن — عدّلها لو عايز
// ===========================================
const ADMIN_DATA = {
  name: 'Admin',
  email: 'admin@luxe.com',
  password: '123456',
  phone: '01000000000'
};

async function createAdmin() {
  console.log('👑 بدء إنشاء حساب الأدمن...\n');

  try {
    let uid;

    // 1. جرب تنشئ مستخدم جديد في Auth
    try {
      const userRecord = await auth.createUser({
        email: ADMIN_DATA.email,
        password: ADMIN_DATA.password,
        displayName: ADMIN_DATA.name
      });
      uid = userRecord.uid;
      console.log(`✅ تم إنشاء الحساب في Auth: ${uid}`);
    } catch (err) {
      // لو موجود بالفعل، جيبه
      if (err.code === 'auth/email-already-exists') {
        const existing = await auth.getUserByEmail(ADMIN_DATA.email);
        uid = existing.uid;
        console.log(`ℹ️ الحساب موجود بالفعل في Auth: ${uid}`);

        // حدث الباسورد عشان نضمن إنه معروف
        await auth.updateUser(uid, { password: ADMIN_DATA.password });
        console.log(`✅ تم تحديث كلمة السر`);
      } else {
        throw err;
      }
    }

    // 2. احفظ/حدّث البيانات في Firestore مع role: admin
    await db.collection('users').doc(uid).set({
      uid,
      name: ADMIN_DATA.name,
      email: ADMIN_DATA.email,
      phone: ADMIN_DATA.phone,
      role: 'admin',
      addresses: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log(`✅ تم حفظ البيانات في Firestore (role: admin)`);

    console.log('\n🎉 ========================================');
    console.log('   حساب الأدمن جاهز!');
    console.log('   ========================================');
    console.log(`   📧 البريد:     ${ADMIN_DATA.email}`);
    console.log(`   🔑 الباسورد:   ${ADMIN_DATA.password}`);
    console.log(`   🆔 UID:        ${uid}`);
    console.log(`   👑 الدور:       admin`);
    console.log('   ========================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ خطأ:', err.message);
    process.exit(1);
  }
}

createAdmin();
