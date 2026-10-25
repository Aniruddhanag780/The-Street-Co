// Firebase Cloud Messaging Service Worker for The Street Co Web Push Notifications
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Initialize Firebase App in service worker using the user's project
firebase.initializeApp({
  apiKey: "AIzaSyCAEUcCRBnOrpXUu_CLTisYGswOvUska2Q",
  authDomain: "the-street-co.firebaseapp.com",
  projectId: "the-street-co",
  storageBucket: "the-street-co.firebasestorage.app",
  messagingSenderId: "438693170929",
  appId: "1:438693170929:web:99cd28c089afb79e8fa350",
  measurementId: "G-MKB9JQDG1N"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background push received:', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || 'The Street Co';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'New exclusive drop & order update from The Street Co',
    icon: payload.notification?.icon || '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: {
      url: payload.data?.url || payload.notification?.click_action || '/'
    },
    vibrate: [150, 80, 150]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
