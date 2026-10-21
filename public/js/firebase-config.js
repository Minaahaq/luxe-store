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

// ===========================================
// Exports
// ===========================================
export {
  app,
  auth,
  db,
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
