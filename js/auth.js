// auth.js — Registration + OTP Login + Google Login
import { auth, googleProvider, db, RecaptchaVerifier, signInWithPhoneNumber } from './firebase-config.js';
import {
  signInWithPopup, signOut, onAuthStateChanged,
  setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

setPersistence(auth, browserLocalPersistence).catch(() => {});

let recaptchaVerifier = null;
let confirmationResult = null;

// ── Recaptcha ──────────────────────────────────────────────────────────────
function setupRecaptcha(buttonId) {
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear(); } catch(e) {}
    recaptchaVerifier = null;
  }
  recaptchaVerifier = new RecaptchaVerifier(auth, buttonId, {
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
        uid:    user.uid,
        name:   profile?.name  || user.displayName || 'Student',
        email:  profile?.email || user.email || '',
        mobile: profile?.mobile || '',
        photo:  user.photoURL || '',
        isNew:  !profile
      });
    } else {
      onLoggedOut();
    }
  });
}

// ── User profile helpers ───────────────────────────────────────────────────
export async function getUserProfile(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
}

export async function saveUserProfile({ uid, name, email, mobile }) {
  await setDoc(doc(db, 'users', uid), {
    name, email: email || '', mobile: mobile || '',
    createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  }, { merge: true });
}

// Check if mobile is already registered (in users collection)
export async function isMobileRegistered(mobile) {
  try {
    const q = query(collection(db, 'users'), where('mobile', '==', mobile));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch { return false; }
}

// Check if email is already registered
export async function isEmailRegistered(email) {
  try {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch { return false; }
}

// ── Google login — only if registered ─────────────────────────────────────
export async function loginWithGoogle() {
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  // Check if this google email is registered
  const profile = await getUserProfile(user.uid);
  if (!profile) {
    // Check if email exists in any user doc
    const registered = await isEmailRegistered(user.email);
    if (!registered) {
      await signOut(auth);
      throw new Error('NOT_REGISTERED');
    }
  }
  return user;
}

// ── Phone OTP: Send ────────────────────────────────────────────────────────
export async function sendOTP(mobileNumber, buttonId) {
  const verifier = setupRecaptcha(buttonId);
  confirmationResult = await signInWithPhoneNumber(auth, mobileNumber, verifier);
  return confirmationResult;
}

// ── Phone OTP: Verify + check registration ─────────────────────────────────
export async function verifyOTPLogin(otp) {
  if (!confirmationResult) throw new Error('No OTP sent. Please try again.');
  const result = await confirmationResult.confirm(otp);
  const user = result.user;
  // Check if user has a profile (i.e. registered)
  const profile = await getUserProfile(user.uid);
  if (!profile) {
    // Not registered — sign them out, return flag
    await signOut(auth);
    return { user, registered: false };
  }
  return { user, registered: true };
}

// ── Phone OTP: Verify for registration (no check) ─────────────────────────
export async function verifyOTPRegister(otp) {
  if (!confirmationResult) throw new Error('No OTP sent. Please try again.');
  const result = await confirmationResult.confirm(otp);
  return result.user;
}

// ── Logout ─────────────────────────────────────────────────────────────────
export async function logout() {
  await signOut(auth);
}
