// db.js — Firestore data access layer (exam-scoped + cross-exam bookmarks with stage info)
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
  const { exam, subject = null, stage = null, maxCount = 100, force = false } = opts;
  if (!exam) {
    console.error('fetchQuestions: exam is required');
    return [];
  }

  const cacheKey = `${exam}:${stage || '*'}:${subject || 'all'}`;
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
        if (stage && data.stage && data.stage !== stage) return;
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

// ========== Bookmarks (with stage info for per-stage filtering) ==========
export async function addBookmark(userId, examId, questionId) {
  try {
    const bookmarkId = `${examId}_${questionId}`;
    const ref = doc(db, 'users', userId, 'bookmarks', bookmarkId);

    // Get the question to grab its stage
    const qData = await fetchQuestionById(examId, questionId);
    const stage = qData?.stage || null;

    await setDoc(ref, {
      examId,
      questionId,
      stage,
      savedAt: new Date().toISOString()
    });
    return true;
  } catch (err) {
    console.error('Error adding bookmark:', err);
    return false;
  }
}

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

export async function fetchAllBookmarks(userId) {
  try {
    const ref = collection(db, 'users', userId, 'bookmarks');
    const snap = await getDocs(ref);
    const bookmarks = [];
    snap.forEach(docSnap => {
      bookmarks.push({ id: docSnap.id, ...docSnap.data() });
    });
    bookmarks.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
    return bookmarks;
  } catch (err) {
    console.error('Error fetching bookmarks:', err);
    return [];
  }
}

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
        stage: q.stage || bm.stage,
        savedAt: bm.savedAt
      });
    }
  }
  return results;
}
