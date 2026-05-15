// auth.js — Handles Google login, logout, and auth state
import { auth, googleProvider } from './firebase-config.js';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Force LOCAL persistence — user stays logged in across reloads/sessions
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.warn('Could not set persistence:', err);
});

export function watchAuth(onLoggedIn, onLoggedOut) {
  // On mobile, after signInWithRedirect returns to the page, Firebase briefly
  // emits null from onAuthStateChanged while it processes the redirect result.
  // We await getRedirectResult() first so we never act on that spurious null.

  const redirectPromise = getRedirectResult(auth)
    .then(() => {})   // resolves fast if no redirect pending
    .catch(err => { console.error('Redirect login error:', err); });

  let firstEmission = true;

  onAuthStateChanged(auth, async (user) => {
    // On first emission, wait for redirect promise to settle
    if (firstEmission) {
      firstEmission = false;
      await redirectPromise;
      // Re-check current user after redirect settled
      // (auth.currentUser is up-to-date after await)
      user = auth.currentUser;
    }

    if (user) {
      onLoggedIn({
        uid: user.uid,
        name: user.displayName || 'Student',
        email: user.email,
        photo: user.photoURL || ''
      });
    } else {
      onLoggedOut();
    }
  });
}

export async function loginWithGoogle() {
  try {
    await setPersistence(auth, browserLocalPersistence);
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    if (isMobile) {
      await signInWithRedirect(auth, googleProvider);
    } else {
      await signInWithPopup(auth, googleProvider);
    }
  } catch (err) {
    console.error('Login error:', err);
    throw err;
  }
}

export async function logout() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Logout error:', err);
  }
}
