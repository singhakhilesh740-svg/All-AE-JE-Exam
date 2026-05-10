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
  questions: {},        // keyed by "exam:subject" or "exam:all"
  cachedAt: {},
  TTL: 1000 * 60 * 30   // 30 min
};

// Fetch questions, optionally filtered by subject
export async function fetchQuestions(opts = {}) {
  const {
    exam = 'uppsc-ae',
    subject = null,         // if null, fetch all subjects
    maxCount = 100,
    force = false
  } = opts;

  const cacheKey = `${exam}:${subject || 'all'}`;
  const now = Date.now();

  // Return cached if fresh
  if (!force && cache.questions[cacheKey] && (now - (cache.cachedAt[cacheKey] || 0)) < cache.TTL) {
    return cache.questions[cacheKey];
  }

  try {
    const qRef = collection(db, 'exams', exam, 'questions');
    let q;
    if (subject) {
      q = query(qRef, where('subject', '==', subject), limit(maxCount));
    } else {
      q = query(qRef, limit(maxCount));
    }

    const snap = await getDocs(q);
    const questions = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      if (isValidQuestion(data)) {
        questions.push({ id: docSnap.id, ...data });
      } else {
        console.warn(`Skipping malformed question ${docSnap.id}`);
      }
    });

    cache.questions[cacheKey] = questions;
    cache.cachedAt[cacheKey] = now;
    return questions;
  } catch (err) {
    console.error('Error fetching questions:', err);
    return [];
  }
}

// Get question count per subject (for the subjects screen)
export async function fetchSubjectCounts(exam = 'uppsc-ae') {
  try {
    const qRef = collection(db, 'exams', exam, 'questions');
    const snap = await getDocs(qRef);
    const counts = {};
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const subj = data.subject || 'uncategorized';
      counts[subj] = (counts[subj] || 0) + 1;
    });
    return counts;
  } catch (err) {
    console.error('Error fetching subject counts:', err);
    return {};
  }
}

function isValidQuestion(q) {
  return q
    && typeof q.question === 'string'
    && Array.isArray(q.options)
    && q.options.length >= 2
    && typeof q.answer === 'number'
    && q.answer >= 0
    && q.answer < q.options.length;
}

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
  }
}

export async function toggleBookmark(userId, questionId, isBookmarked) {
  try {
    const bookmarkRef = doc(db, 'users', userId, 'bookmarks', questionId);
    if (isBookmarked) {
      await setDoc(bookmarkRef, { savedAt: new Date().toISOString() });
    }
  } catch (err) {
    console.error('Error saving bookmark:', err);
  }
}

export function getCachedQuestionCount() {
  // Sum across all cache keys
  let total = 0;
  for (const key in cache.questions) {
    total += cache.questions[key].length;
  }
  return total;
}
