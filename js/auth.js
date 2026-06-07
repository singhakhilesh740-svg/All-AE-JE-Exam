// auth.js — NATIVE auth (Path B) via @capacitor-firebase/authentication
// Google + Phone OTP run through native Android SDKs (no WebView popup, no
// reCAPTCHA). We then bridge the credential into the Firebase JS SDK so that
// Firestore (profiles) keeps working with the same signed-in user.
//
// Falls back to web methods automatically when running in a normal browser.
// Web Google login uses signInWithRedirect (mobile-safe, no popup blocked issues).

import { auth, db, googleProvider, RecaptchaVerifier, signInWithPhoneNumber } from './firebase-config.js';
import {
  signInWithPopup, signInWithRedirect, getRedirectResult,
  signInWithCredential, GoogleAuthProvider, PhoneAuthProvider,
  signOut, onAuthStateChanged, setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp, increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Capacitor native plugin — accessed via the runtime GLOBAL (window.Capacitor)
const Capacitor = window.Capacitor || { isNativePlatform: () => false };
const isNative = Capacitor.isNativePlatform && Capacitor.isNativePlatform();
const FirebaseAuthentication =
  (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FirebaseAuthentication) || null;

setPersistence(auth, browserLocalPersistence).catch(() => {});

// ── Web reCAPTCHA (only used in browser fallback for OTP) ───────────────────
let recaptchaVerifier = null;
let confirmationResult = null;
let nativeVerificationId = null;

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
// watchAuth must be called early so getRedirectResult fires before the user
// sees a "not logged in" flash after returning from Google redirect.
export function watchAuth(onLoggedIn, onLoggedOut) {
  // Handle the result when Google redirects back to the page (web flow)
  getRedirectResult(auth).then(async result => {
    if (result && result.user) {
      await ensureProfileDoc(result.user, { email: result.user.email });
      await trackLogin(result.user);
      // onAuthStateChanged will fire automatically after this
    }
  }).catch(e => {
    // auth/redirect-cancelled-by-user or auth/popup-closed-by-user — ignore silently
    if (e.code !== 'auth/redirect-cancelled-by-user') {
      console.error('[Auth] getRedirectResult error:', e.code, e.message);
    }
  });

  onAuthStateChanged(auth, async user => {
    if (user) {
      const profile = await getUserProfile(user.uid);
      onLoggedIn({
        uid:     user.uid,
        name:    profile?.name  || '',
        email:   profile?.email || user.email || '',
        mobile:  profile?.mobile || user.phoneNumber || '',
        state:   profile?.state || '',
        preparingFor: profile?.preparingFor || '',
        hasProfile: !!(profile && profile.name && profile.state && profile.preparingFor)
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

export async function saveUserProfile({ uid, name, email, mobile, state, preparingFor }) {
  const data = {
    name:   (name || '').trim(),
    email:  (email || '').toLowerCase().trim(),
    mobile: mobile || '',
    updatedAt: serverTimestamp()
  };
  if (state !== undefined) data.state = state;
  if (preparingFor !== undefined) data.preparingFor = preparingFor;
  await setDoc(doc(db, 'users', uid), data, { merge: true });
}

// Shared: ensure a profile doc exists right after first sign-in
async function ensureProfileDoc(user, { email, mobile } = {}) {
  try {
    const existing = await getUserProfile(user.uid);
    if (!existing) {
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

// ── Track login activity ────────────────────────────────────────────────
async function trackLogin(user) {
  try {
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    await setDoc(doc(db, 'users', user.uid), {
      lastLogin: serverTimestamp(),
      loginCount: increment(1),
      lastDevice: isMobile ? 'mobile' : 'desktop',
      lastBrowser: navigator.userAgent.slice(0, 100),
    }, { merge: true });
  } catch (e) {
    console.error('[Auth] trackLogin error:', e);
  }
}

// ── Google login ─────────────────────────────────────────────────────────────
// On web: uses signInWithRedirect (works on mobile Chrome, Safari, no popup blocking).
// The result is handled in watchAuth() via getRedirectResult() when page reloads.
// On native: uses the Capacitor plugin (no change).
export async function loginWithGoogle() {
  if (isNative) {
    if (!FirebaseAuthentication) throw new Error('Native auth plugin not available');
    const result = await FirebaseAuthentication.signInWithGoogle();
    const idToken = result.credential?.idToken;
    if (!idToken) throw new Error('No Google idToken returned');
    const credential = GoogleAuthProvider.credential(idToken);
    const userCred = await signInWithCredential(auth, credential);
    await ensureProfileDoc(userCred.user, { email: result.user?.email });
    await trackLogin(userCred.user);
    return userCred.user;
  } else {
    // Use redirect (not popup) — works reliably on mobile browsers and GitHub Pages
    await setPersistence(auth, browserLocalPersistence);
    await signInWithRedirect(auth, googleProvider);
    // Page will redirect to Google and come back — result handled in watchAuth()
    // This function doesn't return a user directly; the redirect navigates away.
  }
}

// ── OTP: Send ────────────────────────────────────────────────────────────────
export async function sendOTP(mobileNumber) {
  if (isNative) {
    return new Promise((resolve, reject) => {
      let settled = false;
      FirebaseAuthentication.addListener('phoneCodeSent', (event) => {
        nativeVerificationId = event.verificationId;
        if (!settled) { settled = true; resolve({ verificationId: event.verificationId }); }
      });
      FirebaseAuthentication.signInWithPhoneNumber({ phoneNumber: mobileNumber })
        .catch(err => { if (!settled) { settled = true; reject(err); } });
    });
  } else {
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
