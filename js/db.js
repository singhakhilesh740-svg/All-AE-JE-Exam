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
  deleteDoc,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const cache = {
  questions: {},
  cachedAt: {},
  TTL: 1000 * 60 * 30   // 30 min
};

// ─── Questions ────────────────────────────────────────────────────────────────

export async function fetchQuestions(opts = {}) {
  const { exam, subject = null, type = null, maxCount = 500, force = false } = opts;
  if (!exam) { console.error('fetchQuestions: exam is required'); return []; }

  const cacheKey = `${exam}:${subject || 'all'}:${type || 'all'}`;
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
        if (type && data.type && data.type !== type) return;
        questions.push({ id: docSnap.id, examId: exam, ...data });
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

export async function fetchQuestionById(examId, questionId) {
  try {
    const qRef = doc(db, 'exams', examId, 'questions', questionId);
    const snap = await getDoc(qRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    if (!isValidQuestion(data)) return null;
    return { id: snap.id, examId, ...data };
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

// ─── User profile ─────────────────────────────────────────────────────────────

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

// ─── Attempts ─────────────────────────────────────────────────────────────────

export async function saveAttempt(userId, examId, questionId, selectedIndex, isCorrect) {
  if (!questionId) return;   // skip if no id (local-only questions)
  try {
    const ref = doc(db, 'users', userId, 'attempts', `${examId}_${questionId}`);
    await setDoc(ref, { examId, questionId, selectedIndex, isCorrect, attemptedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error('Error saving attempt:', err);
  }
}

// ─── Bookmarks ────────────────────────────────────────────────────────────────
// We store the FULL question object in Firestore so bookmarks work even if
// questions came from local JSON (no Firestore doc to re-fetch).

export async function addBookmark(userId, question) {
  if (!question || !question.id) {
    console.warn('addBookmark: question has no id, cannot bookmark');
    return false;
  }
  try {
    const examId = question.examId || 'unknown';
    const bookmarkId = `${examId}_${question.id}`;
    const ref = doc(db, 'users', userId, 'bookmarks', bookmarkId);
    await setDoc(ref, {
      // store full question so we don't need to re-fetch
      ...question,
      examId,
      savedAt: new Date().toISOString()
    });
    return true;
  } catch (err) {
    console.error('Error adding bookmark:', err);
    return false;
  }
}

export async function removeBookmark(userId, question) {
  if (!question || !question.id) return false;
  try {
    const examId = question.examId || 'unknown';
    const bookmarkId = `${examId}_${question.id}`;
    const ref = doc(db, 'users', userId, 'bookmarks', bookmarkId);
    await deleteDoc(ref);
    return true;
  } catch (err) {
    console.error('Error removing bookmark:', err);
    return false;
  }
}

export async function isQuestionBookmarked(userId, question) {
  if (!question || !question.id) return false;
  try {
    const examId = question.examId || 'unknown';
    const bookmarkId = `${examId}_${question.id}`;
    const ref = doc(db, 'users', userId, 'bookmarks', bookmarkId);
    const snap = await getDoc(ref);
    return snap.exists();
  } catch (err) {
    console.error('Error checking bookmark:', err);
    return false;
  }
}

export async function fetchBookmarkedQuestions(userId) {
  try {
    const ref = collection(db, 'users', userId, 'bookmarks');
    const snap = await getDocs(ref);
    const bookmarks = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      // Only include valid questions (full data stored at bookmark time)
      if (isValidQuestion(data)) {
        bookmarks.push({ ...data, id: data.id || docSnap.id });
      }
    });
    // Sort newest first
    bookmarks.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
    return bookmarks;
  } catch (err) {
    console.error('Error fetching bookmarks:', err);
    return [];
  }
}
