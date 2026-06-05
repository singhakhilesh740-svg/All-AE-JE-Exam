// functions/index.js — Firebase Cloud Functions (1st Gen, firebase-functions v6)
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
admin.initializeApp();

// 1. Notify reporter when admin resolves/dismisses their report
exports.onReportStatusChange = functions
  .region("asia-south1")
  .firestore.document("reports/{reportId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after  = change.after.data();
    if (before.status === after.status) return null;
    const replyMsg = after.admin_reply;
    if (!replyMsg) return null;
    const userUid = after.user_uid;
    if (!userUid) return null;
    const userSnap = await admin.firestore().doc(`users/${userUid}`).get();
    if (!userSnap.exists) return null;
    const fcmToken = userSnap.data().fcmToken;
    if (!fcmToken) return null;
    const isResolved = after.status === "resolved";
    try {
      await admin.messaging().send({
        token: fcmToken,
        notification: {
          title: isResolved ? "✅ Question Fixed!" : "📋 Report Reviewed",
          body: replyMsg,
        },
        data: { type: "report_response", status: after.status },
        webpush: { fcmOptions: { link: "/" } },
      });
    } catch (err) {
      if (err.code === "messaging/registration-token-not-registered") {
        await admin.firestore().doc(`users/${userUid}`).update({ fcmToken: null });
      }
    }
    return null;
  });

// 2. Subscribe token to topic
exports.subscribeToTopic = functions
  .region("asia-south1")
  .https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const { token, topic } = req.body || {};
    if (!token || !topic) return res.status(400).json({ error: "Missing token or topic" });
    if (!["all_users"].includes(topic)) return res.status(403).json({ error: "Topic not allowed" });
    try {
      await admin.messaging().subscribeToTopic([token], topic);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

// 3. Broadcast to all users when new content uploaded
exports.broadcastNewContent = functions
  .region("asia-south1")
  .firestore.document("notifications/{notifId}")
  .onCreate(async (snap) => {
    const data = snap.data();
    if (!data) return null;
    try {
      const response = await admin.messaging().send({
        topic: "all_users",
        notification: {
          title: data.title || "📚 New Content Added!",
          body:  data.body  || "New study material is now available.",
        },
        data: { type: "new_content", subject: data.subject || "" },
        webpush: { fcmOptions: { link: "/" } },
      });
      await snap.ref.update({ sent: true, sentAt: new Date().toISOString(), fcmMessageId: response });
    } catch (err) {
      console.error("Broadcast error:", err);
    }
    return null;
  });
