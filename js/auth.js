// auth.js — Email/Password + Mobile+Password + Google Login (linked accounts)
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
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

setPersistence(auth, browserLocalPersistence).catch(() => {});

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
    return snap.docs[0].id; // doc ID = uid
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

// ── REGISTRATION — Email + Password ───────────────────────────────────────
export async function registerWithEmail({ name, email, mobile, password }) {
  const emailTaken  = await isEmailRegistered(email);
  if (emailTaken) throw new Error('EMAIL_TAKEN');

  const mobileTaken = await isMobileRegistered(mobile);
  if (mobileTaken) throw new Error('MOBILE_TAKEN');

  const cred = await createUserWithEmailAndPassword(auth, email.toLowerCase(), password);
  const user = cred.user;

  await updateProfile(user, { displayName: name }).catch(() => {});
  await saveUserProfile({ uid: user.uid, name, email: email.toLowerCase(), mobile });

  return user;
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

// ── LOGIN — Mobile + Password ──────────────────────────────────────────────
export async function loginWithMobile(mobile, password) {
  const email = await getEmailByMobile(mobile);
  if (!email) throw new Error('MOBILE_NOT_FOUND');
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// ── LOGIN — Google (with auto-link if same email registered) ───────────────
//
// Logic:
//   1. Try Google sign-in popup
//   2. If user's Google email matches a registered Firestore account:
//        a. If already linked (same UID) → just log in ✓
//        b. If different UID (email+password account exists) →
//           sign in with email+password first, then link Google to it
//           so both methods work on same account going forward
//   3. If email not registered at all → reject (NOT_REGISTERED)
//
export async function loginWithGoogle() {
  await setPersistence(auth, browserLocalPersistence);

  let result;
  try {
    result = await signInWithPopup(auth, googleProvider);
  } catch (e) {
    // auth/account-exists-with-different-credential:
    // email already registered with email+password, Google popup blocked linking
    if (e.code === 'auth/account-exists-with-different-credential') {
      const email = e.customData?.email;
      if (!email) throw e;
      // Check they are actually registered in our system
      const registered = await isEmailRegistered(email);
      if (!registered) {
        throw new Error('NOT_REGISTERED');
      }
      // They need to log in with email+password first, then we link Google
      throw new Error('LINK_REQUIRED:' + email);
    }
    throw e;
  }

  const user = result.user;

  // Check Firestore profile
  let profile = await getUserProfile(user.uid);

  if (!profile) {
    // No profile under this Google UID —
    // check if same email was registered under a different UID (email+password)
    const existingUid = await getUidByEmail(user.email);

    if (!existingUid) {
      // Not registered at all
      await signOut(auth);
      throw new Error('NOT_REGISTERED');
    }

    // Email registered under different UID (email+password account)
    // Copy the profile to new Google UID and update email field
    const oldSnap = await getDoc(doc(db, 'users', existingUid));
    const oldData = oldSnap.exists() ? oldSnap.data() : {};
    await saveUserProfile({
      uid:    user.uid,
      name:   oldData.name   || user.displayName || 'Student',
      email:  user.email,
      mobile: oldData.mobile || ''
    });
  }

  return user;
}

// ── Link Google to current email+password account ─────────────────────────
// Called after user confirms they want to link their Google account
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
  // Check Firebase Auth directly (works for all sign-in methods)
  const methods = await fetchSignInMethodsForEmail(auth, normalised);
  if (!methods || methods.length === 0) {
    throw new Error('NOT_REGISTERED');
  }
  await sendPasswordResetEmail(auth, normalised);
}
