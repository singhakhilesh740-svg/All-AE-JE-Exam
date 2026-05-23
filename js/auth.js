// auth.js — NATIVE auth (Path B) via @capacitor-firebase/authentication
// Google + Phone OTP run through native Android SDKs (no WebView popup, no
// reCAPTCHA). We then bridge the credential into the Firebase JS SDK so that
// Firestore (profiles) keeps working with the same signed-in user.
//
// Falls back to web methods automatically when running in a normal browser.

import { auth, db, googleProvider, RecaptchaVerifier, signInWithPhoneNumber } from './firebase-config.js';
import {
  signInWithPopup, signInWithCredential, GoogleAuthProvider, PhoneAuthProvider,
  signOut, onAuthStateChanged, setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Capacitor native plugin — accessed via the runtime GLOBAL (window.Capacitor)
// instead of `import`. Bare-module imports like '@capacitor-firebase/...' do NOT
// resolve in a plain WebView without a bundler, which crashes the whole script.
// Capacitor injects these globals at runtime, so this works in the app and is
// simply undefined (harmless) in a normal browser.
const Capacitor = window.Capacitor || { isNativePlatform: () => false };
const isNative = Capacitor.isNativePlatform && Capacitor.isNativePlatform();
// The plugin is registered on window.Capacitor.Plugins.FirebaseAuthentication
const FirebaseAuthentication =
  (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FirebaseAuthentication) || null;

setPersistence(auth, browserLocalPersistence).catch(() => {});

// ── Web reCAPTCHA (only used in browser fallback) ───────────────────────────
let recaptchaVerifier = null;
let confirmationResult = null;        // web OTP
let nativeVerificationId = null;      // native OTP

function setupRecaptcha() {
  if (recaptchaVerifier) { try { recaptchaVerifier.clear(); } catch(e){} recaptchaVerifier = null; }
  const old = document.getElementById('recaptcha-container');
  if (old) old.remove();
  const container = document.createElement('div');
  container.id = 'recaptcha-container';
  document.body.appendChild(container);
  recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible', callback: () => {} });
  return recaptchaVerifier;
}
export function resetRecaptcha() {
  if (recaptchaVerifier) { try { recaptchaVerifier.clear(); } catch(e){} recaptchaVerifier = null; }
  const old = document.getElementById('recaptcha-container');
  if (old) old.remove();
}

// ── Auth state ─────────────────────────────────────────────────────────────
// On native, the JS SDK's onAuthStateChanged still fires because we bridge the
// credential in via signInWithCredential. So one listener covers both.
export function watchAuth(onLoggedIn, onLoggedOut) {
  onAuthStateChanged(auth, async user => {
    if (user) {
      const profile = await getUserProfile(user.uid);
      onLoggedIn({
        uid:     user.uid,
        name:    profile?.name  || '',
        email:   profile?.email || user.email || '',
        mobile:  profile?.mobile || user.phoneNumber || '',
        hasProfile: !!(profile && profile.name)
      });
    } else {
      onLoggedOut();
    }
  });
}

// ── Profile helpers ─────────────────────────────────────────────────────────
export async function getUserProfile(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
}

export async function saveUserProfile({ uid, name, email, mobile }) {
  await setDoc(doc(db, 'users', uid), {
    name:   (name || '').trim(),
    email:  (email || '').toLowerCase().trim(),
    mobile: mobile || '',
    updatedAt: serverTimestamp()
  }, { merge: true });
}

// Shared: ensure a profile doc exists right after first sign-in
async function ensureProfileDoc(user, { email, mobile } = {}) {
  try {
    const existing = await getUserProfile(user.uid);
    if (!existing) {
      // For Google, try to carry over an existing profile matched by email
      let carry = null;
      const e = (email || user.email || '').toLowerCase();
      if (e) {
        try {
          const q = query(collection(db, 'users'), where('email', '==', e));
          const snap = await getDocs(q);
          if (!snap.empty) carry = snap.docs[0].data();
        } catch (err) { console.error('[Auth] email lookup failed:', err); }
      }
      await setDoc(doc(db, 'users', user.uid), {
        name:   carry?.name   || user.displayName || '',
        email:  e,
        mobile: carry?.mobile || mobile || user.phoneNumber || '',
        createdAt: carry?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  } catch (e) {
    console.error('[Auth] ensureProfileDoc error (check Firestore rules):', e);
  }
}

// ── Google login ─────────────────────────────────────────────────────────────
export async function loginWithGoogle() {
  if (isNative) {
    if (!FirebaseAuthentication) throw new Error('Native auth plugin not available');
    // Native Google sign-in → get idToken → bridge into JS SDK
    const result = await FirebaseAuthentication.signInWithGoogle();
    const idToken = result.credential?.idToken;
    if (!idToken) throw new Error('No Google idToken returned');
    const credential = GoogleAuthProvider.credential(idToken);
    const userCred = await signInWithCredential(auth, credential);
    await ensureProfileDoc(userCred.user, { email: result.user?.email });
    return userCred.user;
  } else {
    // Web fallback — popup
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, googleProvider);
    await ensureProfileDoc(result.user, { email: result.user.email });
    return result.user;
  }
}

// ── OTP: Send ────────────────────────────────────────────────────────────────
export async function sendOTP(mobileNumber) {
  if (isNative) {
    // Native phone auth — no reCAPTCHA needed. Returns a verificationId.
    return new Promise((resolve, reject) => {
      let settled = false;
      // Listener fires when SMS auto-retrieved OR when code is ready to enter
      FirebaseAuthentication.addListener('phoneCodeSent', (event) => {
        nativeVerificationId = event.verificationId;
        if (!settled) { settled = true; resolve({ verificationId: event.verificationId }); }
      });
      FirebaseAuthentication.signInWithPhoneNumber({ phoneNumber: mobileNumber })
        .catch(err => { if (!settled) { settled = true; reject(err); } });
    });
  } else {
    // Web fallback — reCAPTCHA flow
    const verifier = setupRecaptcha();
    try {
      confirmationResult = await signInWithPhoneNumber(auth, mobileNumber, verifier);
      return confirmationResult;
    } catch (e) {
      resetRecaptcha();
      throw e;
    }
  }
}

// ── OTP: Verify ──────────────────────────────────────────────────────────────
export async function verifyOTP(otp) {
  if (isNative) {
    if (!nativeVerificationId) throw new Error('No OTP sent. Please try again.');
    // Build a phone credential and bridge into the JS SDK
    const credential = PhoneAuthProvider.credential(nativeVerificationId, otp);
    const userCred = await signInWithCredential(auth, credential);
    nativeVerificationId = null;
    await ensureProfileDoc(userCred.user, { mobile: userCred.user.phoneNumber });
    return userCred.user;
  } else {
    if (!confirmationResult) throw new Error('No OTP sent. Please try again.');
    const result = await confirmationResult.confirm(otp);
    await ensureProfileDoc(result.user, { mobile: result.user.phoneNumber });
    return result.user;
  }
}

// ── Logout ─────────────────────────────────────────────────────────────────
export async function logout() {
  if (isNative) {
    try { await FirebaseAuthentication.signOut(); } catch(e) {}
  }
  await signOut(auth);
}
