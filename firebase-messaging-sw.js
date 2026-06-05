// firebase-messaging-sw.js
// FCM background message handler — must be at ROOT of the site.
// This file is used in TWO ways:
//   a) FCM uses it automatically if named firebase-messaging-sw.js
//   b) We also pass our existing service-worker.js registration to getToken(),
//      so this file handles only the background message event.

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "AIzaSyBJi1yjBwojb1cqcTdMwa53Rsb0Yzq7rMI",
  authDomain:        "ae-exam-app.firebaseapp.com",
  projectId:         "ae-exam-app",
  storageBucket:     "ae-exam-app.firebasestorage.app",
  messagingSenderId: "101353507688",
  appId:             "1:101353507688:web:82b31f2d6096387d7aa4dd",
});

const messaging = firebase.messaging();

// ── Background messages (app is closed or in background) ────────────────────
messaging.onBackgroundMessage((payload) => {
  console.log("[FCM-SW] Background message:", payload);

  const title = payload.notification?.title || "AE/JE Civil";
  const body  = payload.notification?.body  || "";
  const data  = payload.data || {};

  const options = {
    body,
    icon:  "/icon-192.png",
    badge: "/icon-192.png",
    tag:   data.type || "fcm",          // collapses duplicate notifications
    data:  { url: "/", ...data },
    vibrate: [200, 100, 200],
    actions: [
      { action: "open", title: "📖 Open App" },
    ],
  };

  // Customise per notification type
  if (data.type === "report_response") {
    options.tag      = `report-${data.reportId}`;
    options.actions  = [{ action: "open", title: "📖 View Fix" }];
    options.requireInteraction = false;
  } else if (data.type === "new_content") {
    options.tag      = `content-${Date.now()}`;
    options.actions  = [{ action: "open", title: "📚 Study Now" }];
    options.requireInteraction = false;
  }

  self.registration.showNotification(title, options);
});

// ── Notification click ───────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing tab if open
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});
