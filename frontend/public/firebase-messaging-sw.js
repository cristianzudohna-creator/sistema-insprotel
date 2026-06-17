importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAhnXIdYM24V0cOz410V9RxfnMH9IT7Tsw",
  authDomain: "sistema-insprotel.firebaseapp.com",
  projectId: "sistema-insprotel",
  storageBucket: "sistema-insprotel.firebasestorage.app",
  messagingSenderId: "800664939729",
  appId: "1:800664939729:web:197bea0671c996c42a29f0",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Nueva notificación";
  const options = {
    body: payload.notification?.body || "",
    icon: "/notification-icon.png",
badge: "/notification-icon.png",
    data: {
      url: payload.data?.url || "/",
    },
  };

  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification?.data?.url || "/";

  event.waitUntil(clients.openWindow(url));
});