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
function setupRecaptcha() {
  // Always use a dedicated div, never the button itself
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
  console.log('[Auth] Saving profile:', { uid, name, email, mobile });
  await setDoc(doc(db, 'users', uid), {
    name, email: email || '', mobile: mobile || '',
    createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  }, { merge: true });
  console.log('[Auth] Profile saved successfully');
}

// Check if mobile is already registered (in users collection)
export async function isMobileRegistered(mobile) {
  try {
    console.log('[Auth] Checking mobile registration:', mobile);
    const q = query(collection(db, 'users'), where('mobile', '==', mobile));
    const snap = await getDocs(q);
    console.log('[Auth] isMobileRegistered result:', !snap.empty, 'docs:', snap.size);
    return !snap.empty;
  } catch(e) {
    console.error('[Auth] isMobileRegistered error:', e);
    return false;
  }
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
export async function sendOTP(mobileNumber) {
  const verifier = setupRecaptcha();
  confirmationResult = await signInWithPhoneNumber(auth, mobileNumber, verifier);
  return confirmationResult;
}

// ── Phone OTP: Verify + check registration ─────────────────────────────────
export async function verifyOTPLogin(otp) {
  if (!confirmationResult) throw new Error('No OTP sent. Please try again.');
  const result = await confirmationResult.confirm(otp);
  const user = result.user;
  console.log('[Auth] OTP verified, uid:', user.uid, 'phone:', user.phoneNumber);
  // Check by UID first (most reliable)
  const profile = await getUserProfile(user.uid);
  console.log('[Auth] Profile found by UID:', profile);
  if (!profile) {
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
