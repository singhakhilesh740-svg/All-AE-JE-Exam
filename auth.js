// auth.js — Mobile OTP login only
// Flow: enter mobile → OTP → logged in. Profile (name/email) saved after login.
// On repeat login, profile loads automatically by UID.

import { auth, db, RecaptchaVerifier, signInWithPhoneNumber } from './firebase-config.js';
import {
  signOut, onAuthStateChanged, setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

setPersistence(auth, browserLocalPersistence).catch(() => {});

let recaptchaVerifier = null;
let confirmationResult = null;

// ── Recaptcha ──────────────────────────────────────────────────────────────
function setupRecaptcha() {
  let container = document.getElementById('recaptcha-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'recaptcha-container';
    document.body.appendChild(container);
  }
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear(); } catch(e) {}
    recaptchaVerifier = null;
    container.innerHTML = '';
  }
  recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: 'invisible', callback: () => {}
  });
  return recaptchaVerifier;
}

// ── Auth state ─────────────────────────────────────────────────────────────
export function watchAuth(onLoggedIn, onLoggedOut) {
  onAuthStateChanged(auth, async user => {
    if (user) {
      const profile = await getUserProfile(user.uid);
      onLoggedIn({
        uid:     user.uid,
        name:    profile?.name  || '',
        email:   profile?.email || '',
        mobile:  profile?.mobile || user.phoneNumber || '',
        // hasProfile = true once the user has filled in their name at least once
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

// Save / update the user's profile details (name, email)
// Mobile comes from the verified phone auth, stored automatically.
export async function saveUserProfile({ uid, name, email, mobile }) {
  await setDoc(doc(db, 'users', uid), {
    name:   (name || '').trim(),
    email:  (email || '').toLowerCase().trim(),
    mobile: mobile || '',
    updatedAt: serverTimestamp()
  }, { merge: true });
}

// ── OTP: Send ────────────────────────────────────────────────────────────────
export async function sendOTP(mobileNumber) {
  const verifier = setupRecaptcha();
  confirmationResult = await signInWithPhoneNumber(auth, mobileNumber, verifier);
  return confirmationResult;
}

// ── OTP: Verify ──────────────────────────────────────────────────────────────
// Verifies the code and logs the user in. No registration check —
// anyone with a valid mobile + OTP can log in. Profile is created/loaded by UID.
export async function verifyOTP(otp) {
  if (!confirmationResult) throw new Error('No OTP sent. Please try again.');
  const result = await confirmationResult.confirm(otp);
  const user = result.user;

  // Ensure a user doc exists with at least the mobile number on first login
  const existing = await getUserProfile(user.uid);
  if (!existing) {
    await setDoc(doc(db, 'users', user.uid), {
      name:   '',
      email:  '',
      mobile: user.phoneNumber || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  return user;
}

// ── Logout ─────────────────────────────────────────────────────────────────
export async function logout() {
  await signOut(auth);
}
