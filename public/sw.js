// ===========================================
// Firebase Messaging (للإشعارات)
// ===========================================
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBJY9ZeorwjPWONp9p6IpDm7bMtFn4W6Uk",
  authDomain: "mmmm-de641.firebaseapp.com",
  projectId: "mmmm-de641",
  storageBucket: "mmmm-de641.firebasestorage.app",
  messagingSenderId: "672078498265",
  appId: "1:672078498265:web:e4d23d2fae0ac6870cf1c8"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// استقبال الإشعارات في الخلفية
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'LUXE Store';
  const notificationOptions = {
    body: payload.notification?.body || 'لديك إشعار جديد',
    icon: '/assets/icon-192x192.png', // اللوجو الكبير
    badge: '/assets/icon-192x192.png', // الأيقونة الصغيرة
    image: '/assets/banner.jpg', // صورة كبيرة (اختياري)
    vibrate: [300, 100, 300, 100, 300], // 🔔 نمط الاهتزاز
    sound: 'default', // 🔊 الصوت
    data: payload.data || {},
    requireInteraction: true, // يفضل في الشاشة لحد ما يتقفل
    actions: [
      { action: 'open', title: '📦 تتبع الطلب' },
      { action: 'close', title: '✖ إغلاق' }
    ]
  };
  
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// عند الضغط على الإشعار
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});

// ===========================================
// PWA Cache (الكاش بتاع الموقع)
// ===========================================
const CACHE_NAME = 'luxe-cache-v2'; // ✅ غيرنا الإصدار عشان نمسح الكاش القديم
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/api.js',
  '/js/ui.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
