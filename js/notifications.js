// js/notifications.js — Firebase Cloud Messaging (FCM) client
import {
  getMessaging,
  getToken,
  onMessage,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import {
  doc, setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { app, db } from "./firebase-config.js";

const VAPID_KEY = "BJpkg3o_KoXb-RzruqQozOgr68rUkqaUlnOkz1ttj0QM3ONM111DsR-D39GWg3nanDtYxHRwnDA0ZnnoruK0wG4";
const SUBSCRIBE_FN_URL = "https://asia-south1-ae-exam-app.cloudfunctions.net/subscribeToTopic";

let _messaging = null;
let _initialized = false;

export async function initNotifications(uid, toastFn) {
  if (_initialized) return;
  _initialized = true;

  if (!("Notification" in window)) { console.log("[FCM] Not supported"); return; }
  if (!("serviceWorker" in navigator)) { console.log("[FCM] SW not supported"); return; }
  if (!VAPID_KEY || VAPID_KEY.length < 20) { console.warn("[FCM] VAPID key not set"); return; }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") { console.log("[FCM] Permission denied"); return; }

    _messaging = getMessaging(app);
    const registration = await navigator.serviceWorker.ready;

    const token = await getToken(_messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) { console.log("[FCM] No token received"); return; }

    console.log("[FCM] Token obtained:", token.substring(0, 20) + "…");

    // ── FIX: use setDoc with merge:true instead of updateDoc ──────────────
    // updateDoc fails if the document doesn't exist yet.
    // setDoc with merge:true safely adds fcmToken without overwriting other fields.
    await setDoc(doc(db, "users", uid), { fcmToken: token }, { merge: true });
    console.log("[FCM] Token saved to Firestore");

    // Subscribe to broadcast topic
    await _subscribeToTopic(token);

    // Handle foreground messages
    onMessage(_messaging, (payload) => {
      const title = payload.notification?.title || "AE/JE Civil";
      const body  = payload.notification?.body  || "";
      console.log("[FCM] Foreground message:", title, body);
      if (typeof toastFn === "function") {
        toastFn(`🔔 ${title}: ${body}`);
      } else {
        window.dispatchEvent(
          new CustomEvent("fcm-foreground", { detail: { title, body, data: payload.data } })
        );
      }
    });

    console.log("[FCM] Initialized successfully");
  } catch (err) {
    console.log("[FCM] Init error (non-fatal):", err.message);
  }
}

async function _subscribeToTopic(token) {
  try {
    const res = await fetch(SUBSCRIBE_FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, topic: "all_users" }),
    });
    if (res.ok) {
      console.log("[FCM] Subscribed to all_users topic ✅");
    } else {
      const err = await res.json();
      console.warn("[FCM] Topic subscribe failed:", err.error);
    }
  } catch (err) {
    console.warn("[FCM] Topic subscribe network error:", err.message);
  }
}
