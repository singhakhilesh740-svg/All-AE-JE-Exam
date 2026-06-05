// js/notifications.js — Firebase Cloud Messaging (FCM) client
//
// Responsibilities:
//   1. Ask user for notification permission (once, on first login)
//   2. Get FCM token using VAPID key
//   3. Save token to Firestore  users/{uid}.fcmToken
//   4. Subscribe to "all_users" topic via Cloud Function
//   5. Handle foreground messages (show in-app toast)
//
// Usage: call  initNotifications(uid)  after user logs in (in app.js)

import {
  getMessaging,
  getToken,
  onMessage,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import {
  doc, updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { app, db } from "./firebase-config.js";

// ── CONFIG ──────────────────────────────────────────────────────────────────
// Get your VAPID key from:
//   Firebase Console → Project Settings → Cloud Messaging
//   → Web Push certificates → Generate key pair → copy the Key pair value
const VAPID_KEY = "BJpkg3o_KoXb-RzruqQozOgr68rUkqaUlnOkz1ttj0QM3ONM111DsR-D39GWg3nanDtYxHRwnDA0ZnnoruK0wG4";

// Cloud Function URL — update region if you deployed to a different one
const SUBSCRIBE_FN_URL =
  "https://asia-south1-ae-exam-app.cloudfunctions.net/subscribeToTopic";

// ── STATE ────────────────────────────────────────────────────────────────────
let _messaging = null;
let _initialized = false;

// ── MAIN EXPORT ──────────────────────────────────────────────────────────────
/**
 * Call this once after the user logs in.
 * @param {string} uid  - Firebase Auth UID
 * @param {Function} [toastFn] - optional function(msg) to show in-app toasts
 */
export async function initNotifications(uid, toastFn) {
  if (_initialized) return;
  _initialized = true;

  // Browser support check
  if (!("Notification" in window)) {
    console.log("[FCM] Notifications not supported in this browser");
    return;
  }
  if (!("serviceWorker" in navigator)) {
    console.log("[FCM] Service workers not supported");
    return;
  }
  if (!VAPID_KEY || VAPID_KEY.length < 20) {
    console.warn("[FCM] VAPID key not set — see NOTIFICATIONS_SETUP.md");
    return;
  }

  try {
    // Request permission (Chrome shows a prompt; Safari requires user gesture)
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("[FCM] Permission denied by user");
      return;
    }

    _messaging = getMessaging(app);

    // Use the already-registered service worker so FCM shares it
    const registration = await navigator.serviceWorker.ready;

    const token = await getToken(_messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.log("[FCM] No token received");
      return;
    }

    console.log("[FCM] Token obtained:", token.substring(0, 20) + "…");

    // Persist token in Firestore
    await updateDoc(doc(db, "users", uid), { fcmToken: token });

    // Subscribe to broadcast topic
    await _subscribeToTopic(token);

    // Handle messages when the app IS in the foreground
    onMessage(_messaging, (payload) => {
      const title = payload.notification?.title || "AE/JE Civil";
      const body  = payload.notification?.body  || "";
      console.log("[FCM] Foreground message:", title, body);

      // Show in-app toast if the caller provided a toast function
      if (typeof toastFn === "function") {
        toastFn(`🔔 ${title}: ${body}`);
      } else {
        // Fallback: dispatch a custom event that app.js can catch
        window.dispatchEvent(
          new CustomEvent("fcm-foreground", { detail: { title, body, data: payload.data } })
        );
      }
    });

    console.log("[FCM] Initialized successfully");
  } catch (err) {
    // Non-fatal — app still works without notifications
    console.log("[FCM] Init error (non-fatal):", err.message);
  }
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
async function _subscribeToTopic(token) {
  try {
    const res = await fetch(SUBSCRIBE_FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, topic: "all_users" }),
    });
    if (!res.ok) {
      const err = await res.json();
      console.warn("[FCM] Topic subscribe failed:", err.error);
    }
  } catch (err) {
    console.warn("[FCM] Topic subscribe network error:", err.message);
  }
}
