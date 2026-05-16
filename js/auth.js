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

setPersistence(auth, browserLocalPersistence).catch(() => {});

export function watchAuth(onLoggedIn, onLoggedOut) {
  const redirectPromise = getRedirectResult(auth)
    .then(result => {
      if (result?.user) {
        // Successful redirect login
        console.log('[auth] redirect login success:', result.user.email);
      }
    })
    .catch(err => {
      console.error('[auth] redirect error:', err.code, err.message);
    });

  let firstEmission = true;

  onAuthStateChanged(auth, async (user) => {
    if (firstEmission) {
      firstEmission = false;
      await redirectPromise;
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
    // Always use redirect — works on both mobile and desktop
    // Popup fails on GitHub Pages due to cross-origin restrictions
    await signInWithRedirect(auth, googleProvider);
  } catch (err) {
    console.error('[auth] login error:', err.code, err.message);
    throw err;
  }
}

export async function logout() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('[auth] logout error:', err);
  }
}
