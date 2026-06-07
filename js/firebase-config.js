// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getMessaging, isSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyBJi1yjBwojb1cqcTdMwa53Rsb0Yzq7rMI",
  // MUST be firebaseapp.com — that's where /__/auth/handler lives.
  // GitHub Pages does NOT have this file, so never set this to your custom domain.
  authDomain: "ae-exam-app.firebaseapp.com",
  projectId: "ae-exam-app",
  storageBucket: "ae-exam-app.firebasestorage.app",
  messagingSenderId: "101353507688",
  appId: "1:101353507688:web:82b31f2d6096387d7aa4dd"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Add scopes for profile info
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Messaging — only initialise in browsers that support it.
let _messaging = null;
async function getMessagingInstance() {
  if (_messaging) return _messaging;
  const supported = await isSupported();
  if (!supported) return null;
  _messaging = getMessaging(app);
  return _messaging;
}

export { app, auth, db, googleProvider, RecaptchaVerifier, signInWithPhoneNumber, getMessagingInstance };
