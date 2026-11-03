// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// نفس إعدادات مشروعك
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

// استقبال الإشعارات في الخلفية (لما الموقع يكون مقفول)
messaging.onBackgroundMessage((payload) => {
  console.log('استلام إشعار في الخلفية:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/images/logo.png', // لو مفيش لوجو سيبها زي ما هي
    data: payload.data,
    vibrate: [200, 100, 200],
    badge: '/images/badge.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// لما العميل يدوس على الإشعار
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/tracking.html';
  
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
