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

// ⚠️ استبدل القيم دي بقيم مشروعك
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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export {
  app, auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
};
