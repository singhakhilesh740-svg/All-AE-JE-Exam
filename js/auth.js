// auth.js
import { auth, googleProvider } from './firebase-config.js';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

setPersistence(auth, browserLocalPersistence).catch(() => {});

export function watchAuth(onLoggedIn, onLoggedOut) {
  onAuthStateChanged(auth, user => {
    if (user) {
      onLoggedIn({
        uid:   user.uid,
        name:  user.displayName || 'Student',
        email: user.email,
        photo: user.photoURL || ''
      });
    } else {
      onLoggedOut();
    }
  });
}

export async function loginWithGoogle() {
  await setPersistence(auth, browserLocalPersistence);
  // signInWithPopup works on GitHub Pages — redirect is broken in
  // storage-partitioned browsers (Chrome 115+, Firefox, Edge)
  await signInWithPopup(auth, googleProvider);
}

export async function logout() {
  await signOut(auth);
}
