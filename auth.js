// auth.js — Email/Password + Mobile+Password + Google Login + OTP (Phone Auth)
import { auth, googleProvider, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  linkWithPopup,
  fetchSignInMethodsForEmail,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

setPersistence(auth, browserLocalPersistence).catch(() => {});

// ── Registration guard (Bug 3 fix) ─────────────────────────────────────────
// Prevents watchAuth from firing during registration before profile is saved
let _registering = false;

// ── Auth state ─────────────────────────────────────────────────────────────
export function watchAuth(onLoggedIn, onLoggedOut) {
  onAuthStateChanged(auth, async user => {
    // Bug 3 fix: ignore onAuthStateChanged fired during registration
    if (_registering) return;

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
    name,
    email: email || '',
    mobile: mobile || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

// ── Lookup email by mobile ─────────────────────────────────────────────────
export async function getEmailByMobile(mobile) {
  try {
    const q = query(collection(db, 'users'), where('mobile', '==', mobile));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data().email || null;
  } catch { return null; }
}

// ── Lookup Firestore uid by email ──────────────────────────────────────────
async function getUidByEmail(email) {
  try {
    const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].id;
  } catch { return null; }
}

// ── Check duplicates ───────────────────────────────────────────────────────
export async function isMobileRegistered(mobile) {
  try {
    const q = query(collection(db, 'users'), where('mobile', '==', mobile));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch { return false; }
}

export async function isEmailRegistered(email) {
  try {
    const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch { return false; }
}

// ── REGISTRATION — Email + Password (Bug 3 fixed) ─────────────────────────
export async function registerWithEmail({ name, email, mobile, password }) {
  const emailTaken = await isEmailRegistered(email);
  if (emailTaken) throw new Error('EMAIL_TAKEN');

  const mobileTaken = await isMobileRegistered(mobile);
  if (mobileTaken) throw new Error('MOBILE_TAKEN');

  // Bug 3 fix: set flag BEFORE creating auth user so watchAuth ignores the
  // intermediate onAuthStateChanged that fires before profile is saved
  _registering = true;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.toLowerCase(), password);
    const user = cred.user;

    await updateProfile(user, { displayName: name }).catch(() => {});
    await saveUserProfile({ uid: user.uid, name, email: email.toLowerCase(), mobile });

    return user;
  } finally {
    // Always clear flag, then let watchAuth fire naturally on next state change
    _registering = false;
    // Manually trigger onLoggedIn by reloading auth state
    // (onAuthStateChanged won't re-fire automatically after we clear the flag,
    //  so we return the user and let app.js call watchAuth's callback directly)
  }
}

// ── LOGIN — Email + Password ───────────────────────────────────────────────
export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.toLowerCase(), password);
  const profile = await getUserProfile(cred.user.uid);
  if (!profile) {
    await signOut(auth);
    throw new Error('NOT_REGISTERED');
  }
  return cred.user;
}

// ── LOGIN — Mobile + Password (Bug 5 fixed) ───────────────────────────────
export async function loginWithMobile(mobile, password) {
  const email = await getEmailByMobile(mobile);
  if (!email) throw new Error('MOBILE_NOT_FOUND');

  const cred = await signInWithEmailAndPassword(auth, email, password);

  // Bug 5 fix: check profile exists same as loginWithEmail
  const profile = await getUserProfile(cred.user.uid);
  if (!profile) {
    await signOut(auth);
    throw new Error('NOT_REGISTERED');
  }

  return cred.user;
}

// ── OTP LOGIN — Step 1: Send OTP to registered mobile ─────────────────────
//
// containerElementId: ID of an invisible div in the page for reCAPTCHA widget
// Returns: confirmationResult (store this, needed for verifyOtp)
//
export async function sendOtp(mobile, containerElementId) {
  // Verify mobile is registered before sending OTP
  const email = await getEmailByMobile(mobile);
  if (!email) throw new Error('MOBILE_NOT_FOUND');

  // Create reCAPTCHA verifier (invisible)
  // Re-create each time to avoid stale verifier issues
  if (window._recaptchaVerifier) {
    try { window._recaptchaVerifier.clear(); } catch(e) {}
  }
  window._recaptchaVerifier = new RecaptchaVerifier(auth, containerElementId, {
    size: 'invisible',
    callback: () => {} // reCAPTCHA solved automatically for invisible
  });

  const phoneNumber = '+91' + mobile;
  const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window._recaptchaVerifier);
  return confirmationResult;
}

// ── OTP LOGIN — Step 2: Verify OTP code ───────────────────────────────────
//
// confirmationResult: returned from sendOtp()
// code: 6-digit OTP entered by user
//
export async function verifyOtp(confirmationResult, code) {
  const cred = await confirmationResult.confirm(code);
  const user = cred.user;

  // Check Firestore profile exists for this phone auth user
  let profile = await getUserProfile(user.uid);

  if (!profile) {
    // Phone auth creates a NEW uid — try to find the existing profile by mobile
    const mobile = user.phoneNumber?.replace('+91', '');
    if (mobile) {
      const q = query(collection(db, 'users'), where('mobile', '==', mobile));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const oldData = snap.docs[0].data();
        // Copy profile to new phone-auth UID
        await saveUserProfile({
          uid:    user.uid,
          name:   oldData.name   || user.displayName || 'Student',
          email:  oldData.email  || '',
          mobile: mobile
        });
        profile = await getUserProfile(user.uid);
      }
    }
  }

  if (!profile) {
    await signOut(auth);
    throw new Error('NOT_REGISTERED');
  }

  return user;
}

// ── LOGIN — Google (Bug 2 fixed) ──────────────────────────────────────────
export async function loginWithGoogle() {
  await setPersistence(auth, browserLocalPersistence);

  let result;
  try {
    result = await signInWithPopup(auth, googleProvider);
  } catch (e) {
    if (e.code === 'auth/account-exists-with-different-credential') {
      const email = e.customData?.email;
      if (!email) throw e;
      const registered = await isEmailRegistered(email);
      if (!registered) throw new Error('NOT_REGISTERED');
      throw new Error('LINK_REQUIRED:' + email);
    }
    throw e;
  }

  const user = result.user;
  let profile = await getUserProfile(user.uid);

  if (!profile) {
    const existingUid = await getUidByEmail(user.email);

    if (!existingUid) {
      await signOut(auth);
      throw new Error('NOT_REGISTERED');
    }

    // Bug 2 fix: fetch old profile data safely before writing new one
    let oldData = {};
    try {
      const oldSnap = await getDoc(doc(db, 'users', existingUid));
      oldData = oldSnap.exists() ? oldSnap.data() : {};
    } catch(e) {}

    await saveUserProfile({
      uid:    user.uid,
      name:   oldData.name   || user.displayName || 'Student',
      email:  (user.email || '').toLowerCase(),
      mobile: oldData.mobile || ''
    });
  }

  return user;
}

// ── Link Google to current email+password account ─────────────────────────
export async function linkGoogleToCurrentUser() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');
  const result = await linkWithPopup(user, googleProvider);
  return result.user;
}

// ── Logout ─────────────────────────────────────────────────────────────────
export async function logout() {
  await signOut(auth);
}

// ── Forgot Password ────────────────────────────────────────────────────────
export async function sendPasswordResetLink(email) {
  const { sendPasswordResetEmail } = await import(
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"
  );
  const normalised = email.toLowerCase().trim();
  const methods = await fetchSignInMethodsForEmail(auth, normalised);
  if (!methods || methods.length === 0) throw new Error('NOT_REGISTERED');
  await sendPasswordResetEmail(auth, normalised);
}
