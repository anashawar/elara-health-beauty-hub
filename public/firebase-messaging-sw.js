/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Firebase config will be sent via postMessage from the app
let firebaseConfig = null;

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "FIREBASE_CONFIG") {
    firebaseConfig = event.data.config;
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const { title, body, icon, image } = payload.notification || payload.data || {};
      const notificationTitle = title || "ELARA";
      const notificationOptions = {
        body: body || "",
        icon: icon || "/pwa-icon-192.png",
        image: image || undefined,
        badge: "/pwa-icon-192.png",
        data: payload.data,
        vibrate: [200, 100, 200],
      };
      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.link_url || "/home";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
