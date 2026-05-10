// auth.js — Handles Google login, logout, and auth state
import { auth, googleProvider } from './firebase-config.js';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export function watchAuth(onLoggedIn, onLoggedOut) {
  getRedirectResult(auth).catch(err => {
    console.error('Redirect login error:', err);
  });

  onAuthStateChanged(auth, (user) => {
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
