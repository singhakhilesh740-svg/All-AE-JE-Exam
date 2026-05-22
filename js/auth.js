// auth.js — Email/Password + Mobile+Password + Google Login
import { auth, googleProvider, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
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

// ── Lookup email by mobile (for mobile+password login) ─────────────────────
export async function getEmailByMobile(mobile) {
  try {
    // mobile stored as plain 10-digit string e.g. "9876543210"
    const q = query(collection(db, 'users'), where('mobile', '==', mobile));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data().email || null;
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

// ── REGISTRATION — Email + Password ────────────────────────────────────────
// Creates Firebase Auth account then saves profile to Firestore
export async function registerWithEmail({ name, email, mobile, password }) {
  // 1. Check duplicates first
  const emailTaken  = await isEmailRegistered(email);
  if (emailTaken) throw new Error('EMAIL_TAKEN');

  const mobileTaken = await isMobileRegistered(mobile);
  if (mobileTaken) throw new Error('MOBILE_TAKEN');

  // 2. Create Firebase Auth user
  const cred = await createUserWithEmailAndPassword(auth, email.toLowerCase(), password);
  const user = cred.user;

  // 3. Update display name in Firebase Auth
  await updateProfile(user, { displayName: name }).catch(() => {});

  // 4. Save profile to Firestore (password NOT stored — Firebase handles it)
  await saveUserProfile({ uid: user.uid, name, email: email.toLowerCase(), mobile });

  return user;
}

// ── LOGIN — Email + Password ───────────────────────────────────────────────
export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.toLowerCase(), password);
  // Verify profile exists in Firestore (registered user check)
  const profile = await getUserProfile(cred.user.uid);
  if (!profile) {
    await signOut(auth);
    throw new Error('NOT_REGISTERED');
  }
  return cred.user;
}

// ── LOGIN — Mobile + Password (lookup email → login) ──────────────────────
export async function loginWithMobile(mobile, password) {
  // 1. Look up registered email for this mobile
  const email = await getEmailByMobile(mobile);
  if (!email) throw new Error('MOBILE_NOT_FOUND');

  // 2. Sign in with that email + given password
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// ── LOGIN — Google (registered users only) ─────────────────────────────────
export async function loginWithGoogle() {
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  // Check if profile exists in Firestore
  const profile = await getUserProfile(user.uid);
  if (!profile) {
    // Also check by email (in case they registered with same email)
    const emailExists = await isEmailRegistered(user.email);
    if (!emailExists) {
      await signOut(auth);
      throw new Error('NOT_REGISTERED');
    }
  }
  return user;
}

// ── Logout ─────────────────────────────────────────────────────────────────
export async function logout() {
  await signOut(auth);
}
