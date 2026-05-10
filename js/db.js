// db.js — Firestore data access layer (exam-scoped + cross-exam bookmarks)
import { db } from './firebase-config.js';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const cache = {
  questions: {},
  cachedAt: {},
  TTL: 1000 * 60 * 30
};

// ========== Questions ==========
export async function fetchQuestions(opts = {}) {
  const { exam, subject = null, maxCount = 100, force = false } = opts;
  if (!exam) {
    console.error('fetchQuestions: exam is required');
    return [];
  }

  const cacheKey = `${exam}:${subject || 'all'}`;
  const now = Date.now();

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

// Fetch a SINGLE question by exam + question ID (for cross-exam bookmark viewing)
export async function fetchQuestionById(examId, questionId) {
  try {
    const qRef = doc(db, 'exams', examId, 'questions', questionId);
    const snap = await getDoc(qRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    if (!isValidQuestion(data)) return null;
    return { id: snap.id, ...data };
  } catch (err) {
    console.error('Error fetching question:', err);
    return null;
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

// ========== User profile ==========
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

// ========== Attempts ==========
export async function saveAttempt(userId, examId, questionId, selectedIndex, isCorrect) {
  try {
    const attemptId = `${examId}_${questionId}`;
    const attemptRef = doc(db, 'users', userId, 'attempts', attemptId);
    await setDoc(attemptRef, {
      examId,
      questionId,
      selectedIndex,
      isCorrect,
      attemptedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error('Error saving attempt:', err);
  }
}

// ========== Bookmarks (cross-exam) ==========

// Add a bookmark
export async function addBookmark(userId, examId, questionId) {
  try {
    const bookmarkId = `${examId}_${questionId}`;
    const ref = doc(db, 'users', userId, 'bookmarks', bookmarkId);
    await setDoc(ref, {
      examId,
      questionId,
      savedAt: new Date().toISOString()
    });
    return true;
  } catch (err) {
    console.error('Error adding bookmark:', err);
    return false;
  }
}

// Remove a bookmark
export async function removeBookmark(userId, examId, questionId) {
  try {
    const bookmarkId = `${examId}_${questionId}`;
    const ref = doc(db, 'users', userId, 'bookmarks', bookmarkId);
    await deleteDoc(ref);
    return true;
  } catch (err) {
    console.error('Error removing bookmark:', err);
    return false;
  }
}

// Check if a question is bookmarked
export async function isQuestionBookmarked(userId, examId, questionId) {
  try {
    const bookmarkId = `${examId}_${questionId}`;
    const ref = doc(db, 'users', userId, 'bookmarks', bookmarkId);
    const snap = await getDoc(ref);
    return snap.exists();
  } catch (err) {
    console.error('Error checking bookmark:', err);
    return false;
  }
}

// Fetch ALL bookmarks for a user (across all exams)
// Returns array of { examId, questionId, savedAt }
export async function fetchAllBookmarks(userId) {
  try {
    const ref = collection(db, 'users', userId, 'bookmarks');
    const snap = await getDocs(ref);
    const bookmarks = [];
    snap.forEach(docSnap => {
      bookmarks.push({ id: docSnap.id, ...docSnap.data() });
    });
    // Sort newest first
    bookmarks.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
    return bookmarks;
  } catch (err) {
    console.error('Error fetching bookmarks:', err);
    return [];
  }
}

// Fetch full question data for a list of bookmarks
// Returns array of { examId, questionId, savedAt, question, options, answer, ... }
export async function fetchBookmarkedQuestions(userId) {
  const bookmarks = await fetchAllBookmarks(userId);
  if (bookmarks.length === 0) return [];

  const results = [];
  for (const bm of bookmarks) {
    const q = await fetchQuestionById(bm.examId, bm.questionId);
    if (q) {
      results.push({
        ...q,
        examId: bm.examId,
        savedAt: bm.savedAt
      });
    }
    // If question doesn't exist anymore (deleted by admin), skip silently
  }
  return results;
}
