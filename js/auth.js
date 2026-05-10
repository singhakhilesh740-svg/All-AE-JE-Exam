// auth.js — Handles Google login, logout, and auth state
import { auth, googleProvider } from './firebase-config.js';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Listen for auth state changes
export function watchAuth(onLoggedIn, onLoggedOut) {
  // Handle redirect result (mobile flow)
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

// Trigger Google login
export async function loginWithGoogle() {
  try {
    // Use popup on desktop, redirect on mobile (popups often blocked)
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

// Logout
export async function logout() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Logout error:', err);
  }
}
