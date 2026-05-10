// db.js — Firestore data access layer
import { db } from './firebase-config.js';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// In-memory cache to reduce Firestore reads (saves cost)
const cache = {
  questions: null,
  cachedAt: 0,
  TTL: 1000 * 60 * 30 // 30 min
};

// Fetch questions for UPPSC AE
// Bad data in one doc won't break the rest — we filter invalid ones out
export async function fetchQuestions(opts = {}) {
  const { exam = 'uppsc-ae', maxCount = 50, force = false } = opts;

  // Return cached if fresh
  const now = Date.now();
  if (!force && cache.questions && (now - cache.cachedAt) < cache.TTL) {
    return cache.questions;
  }

  try {
    const qRef = collection(db, 'exams', exam, 'questions');
    const q = query(qRef, limit(maxCount));
    const snap = await getDocs(q);

    const questions = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      // Validate: skip malformed questions instead of crashing
      if (isValidQuestion(data)) {
        questions.push({ id: docSnap.id, ...data });
      } else {
        console.warn(`Skipping malformed question ${docSnap.id}`);
      }
    });

    cache.questions = questions;
    cache.cachedAt = now;
    return questions;
  } catch (err) {
    console.error('Error fetching questions:', err);
    return []; // Return empty instead of throwing — app keeps running
  }
}

// Validate that a question has all required fields
function isValidQuestion(q) {
  return q
    && typeof q.question === 'string'
    && Array.isArray(q.options)
    && q.options.length >= 2
    && typeof q.answer === 'number'
    && q.answer >= 0
    && q.answer < q.options.length;
}

// Save user profile on first login
export async function saveUserProfile(user) {
  try {
    const userRef = doc(db, 'users', user.uid);
    const existing = await getDoc(userRef);
    if (!existing.exists()) {
      await setDoc(userRef, {
        name: user.name,
        email: user.email,
        joinedAt: new Date().toISOString(),
        plan: 'free'
      });
    }
  } catch (err) {
    console.error('Error saving user profile:', err);
  }
}

// Save attempt (which question, which answer, correct or not)
export async function saveAttempt(userId, questionId, selectedIndex, isCorrect) {
  try {
    const attemptRef = doc(db, 'users', userId, 'attempts', questionId);
    await setDoc(attemptRef, {
      selectedIndex,
      isCorrect,
      attemptedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error('Error saving attempt:', err);
    // Don't crash the app if save fails
  }
}

// Toggle bookmark
export async function toggleBookmark(userId, questionId, isBookmarked) {
  try {
    const bookmarkRef = doc(db, 'users', userId, 'bookmarks', questionId);
    if (isBookmarked) {
      await setDoc(bookmarkRef, { savedAt: new Date().toISOString() });
    }
    // Note: deletion is handled separately to keep things simple
  } catch (err) {
    console.error('Error saving bookmark:', err);
  }
}

// Get question count (for status card)
export function getCachedQuestionCount() {
  return cache.questions ? cache.questions.length : 0;
}
