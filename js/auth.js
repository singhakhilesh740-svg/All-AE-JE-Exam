// auth.js — Mobile OTP login + Google login
// Flow: enter mobile → OTP → logged in,  OR  Google sign-in.
// Profile (name/email/mobile) saved after login. On repeat login, profile
// loads automatically and is shared across both login methods (matched by
// email or mobile).

import { auth, db, googleProvider, RecaptchaVerifier, signInWithPhoneNumber } from './firebase-config.js';
import {
  signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp
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

  // Ensure a user doc exists with at least the mobile number on first login.
  // Wrapped in try/catch so a Firestore permission error does NOT block login —
  // the user is already authenticated; the profile doc can be created later.
  try {
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
  } catch (e) {
    console.error('[Auth] Could not create profile doc (check Firestore rules):', e);
    // Continue anyway — login succeeded. Profile will be saved on the Profile screen.
  }

  return user;
}

// ── Google login ─────────────────────────────────────────────────────────────
// Anyone can sign in with Google. On first Google login, if a profile already
// exists under the same email (or this Google email matches an OTP-created
// profile), we copy it across so the user's name/email/mobile carry over.
export async function loginWithGoogle() {
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const googleEmail = (user.email || '').toLowerCase();

  try {
    // 1. Profile already under this Google UID? (repeat logins) — done.
    let profile = await getUserProfile(user.uid);

    if (!profile) {
      // 2. Look for an existing profile with the same email (from a prior
      //    Google login under a different UID, or saved via the profile screen).
      let existingData = null;
      if (googleEmail) {
        try {
          const q = query(collection(db, 'users'), where('email', '==', googleEmail));
          const snap = await getDocs(q);
          if (!snap.empty) existingData = snap.docs[0].data();
        } catch (e) { console.error('[Auth] email lookup failed:', e); }
      }

      // 3. Create / copy a profile doc under the Google UID.
      await setDoc(doc(db, 'users', user.uid), {
        name:   existingData?.name   || user.displayName || '',
        email:  googleEmail,
        mobile: existingData?.mobile || '',
        createdAt: existingData?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  } catch (e) {
    console.error('[Auth] Google profile setup error (check Firestore rules):', e);
    // Login still succeeded — continue.
  }

  return user;
}

// ── Logout ─────────────────────────────────────────────────────────────────
export async function logout() {
  await signOut(auth);
}
