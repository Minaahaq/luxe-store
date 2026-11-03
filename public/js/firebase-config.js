// ===========================================
// Firebase Client Config - LUXE Store
// ===========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ إضافة مكتبة الإشعارات
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

// ⚠️ استبدل القيم دي بقيم مشروعك من Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBJY9ZeorwjPWONp9p6IpDm7bMtFn4W6Uk",
  authDomain: "mmmm-de641.firebaseapp.com",
  databaseURL: "https://mmmm-de641-default-rtdb.firebaseio.com",
  projectId: "mmmm-de641",
  storageBucket: "mmmm-de641.firebasestorage.app",
  messagingSenderId: "672078498265",
  appId: "1:672078498265:web:e4d23d2fae0ac6870cf1c8",
  measurementId: "G-QBGREJP2SQ"
};

// ===========================================
// Initialize
// ===========================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const messaging = getMessaging(app); // ✅ تهيئة الإشعارات

// ===========================================
// دالة طلب الإذن وجلب التوكن (للإشعارات)
// ===========================================
export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // ⚠️ حط الـ VAPID Key بتاعك هنا
      const token = await getToken(messaging, { 
        vapidKey: 'BAHMCOrG3YYgi68U75gcyIsfJY1zMLzY-qYl0L7mx6LWVIdn0oTKtuqoJkM1D6kcSLqYCK621Ns3KFS7rA2zJf8' 
      });
      if (token) {
        console.log('FCM Token:', token);
        return token;
      }
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
  }
  return null;
}

// ===========================================
// Exports
// ===========================================
export {
  app,
  auth,
  db,
  messaging, // ✅ تصدير messaging
  // Auth
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  // Firestore
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
};
