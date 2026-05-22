// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBJi1yjBwojb1cqcTdMwa53Rsb0Yzq7rMI",
  authDomain: "ae-exam-app.firebaseapp.com",
  projectId: "ae-exam-app",
  storageBucket: "ae-exam-app.firebasestorage.app",
  messagingSenderId: "101353507688",
  appId: "1:101353507688:web:82b31f2d6096387d7aa4dd"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

googleProvider.addScope('profile');
googleProvider.addScope('email');

// Allow linking multiple sign-in methods to same account
// Must also enable "Account linking" in Firebase Console:
// Authentication → Settings → User account linking → Link accounts that use the same email

export { app, auth, db, googleProvider };
