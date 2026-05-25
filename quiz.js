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
  TTL: 1000 * 60 * 5    // 5 min (development) — change to 30 when done
};

// ─── Questions ────────────────────────────────────────────────────────────────

export async function fetchQuestions(opts = {}) {
  const { exam, subject = null, type = null, maxCount = 10000, force = false } = opts;
  if (!exam) { console.error('fetchQuestions: exam is required'); return []; }

  const cacheKey = `${exam}:${subject || 'all'}:${type || 'all'}`;
  const now = Date.now();

  if (!force && cache.questions[cacheKey] && (now - (cache.cachedAt[cacheKey] || 0)) < cache.TTL) {
    return cache.questions[cacheKey];
  }

  try {
    const qRef = collection(db, 'exams', exam, 'questions');
    let q;
    // Filter by type at Firestore level so limit() is not wasted on wrong types
    if (subject && type) {
      q = query(qRef, where('subject', '==', subject), where('type', '==', type), limit(maxCount));
    } else if (subject) {
      q = query(qRef, where('subject', '==', subject), limit(maxCount));
    } else if (type) {
      q = query(qRef, where('type', '==', type), limit(maxCount));
    } else {
      q = query(qRef, limit(maxCount));
    }

    const snap = await getDocs(q);
    const questions = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      if (isValidQuestion(data)) {
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

// Fetch practice questions across ALL exams (not locked to one exam)
// Automatically includes any exam added to exams.js — no changes needed here
export async function fetchPracticeQuestions(opts = {}) {
  const { subject = null, section = null, maxCount = 10000, force = false } = opts;
  const { EXAMS } = await import('./exams.js');
  // Filter exams by section so civil Practice only queries civil exams, PCB only PCB
  const filtered = section ? EXAMS.filter(e => e.section === section) : EXAMS;
  const EXAM_IDS = filtered.map(e => e.id);

  const cacheKey = `practice:${section || 'all'}:${subject || 'all'}`;
  const now = Date.now();

  if (!force && cache.questions[cacheKey] && (now - (cache.cachedAt[cacheKey] || 0)) < cache.TTL) {
    return cache.questions[cacheKey];
  }

  try {
  const perExam = maxCount;   // each exam gets full quota; dedup handled by Firestore IDs
    const results = await Promise.all(
      EXAM_IDS.map(async examId => {
        try {
          const qRef = collection(db, 'exams', examId, 'questions');
          let q;
          if (subject) {
            q = query(qRef, where('subject', '==', subject), where('type', '==', 'practice'), limit(perExam));
          } else {
            q = query(qRef, where('type', '==', 'practice'), limit(perExam));
          }
          const snap = await getDocs(q);
          const qs = [];
          snap.forEach(docSnap => {
            const data = docSnap.data();
            if (isValidQuestion(data)) {
              qs.push({ id: docSnap.id, examId, ...data });
            }
          });
          return qs;
        } catch {
          return [];
        }
      })
    );

    const all = results.flat();
    cache.questions[cacheKey] = all;
    cache.cachedAt[cacheKey] = now;
    return all;
  } catch (err) {
    console.error('Error fetching practice questions:', err);
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

    const fullQuestions = [];   // new format — full question stored in bookmark doc
    const legacyRefs   = [];   // old format — only examId + questionId stored

    snap.forEach(docSnap => {
      const data = docSnap.data();
      if (isValidQuestion(data)) {
        // New format: full question data is embedded in the bookmark doc
        fullQuestions.push({ ...data, id: data.id || docSnap.id });
      } else if (data.examId && data.questionId) {
        // Old format: bookmark only stored reference IDs — need to fetch question
        legacyRefs.push({ docId: docSnap.id, examId: data.examId, questionId: data.questionId, savedAt: data.savedAt || '' });
      }
    });

    // Fetch old-format bookmarks from Firestore questions collection
    const legacyResults = await Promise.all(
      legacyRefs.map(async bm => {
        try {
          const q = await fetchQuestionById(bm.examId, bm.questionId);
          if (!q) return null;
          // Migrate: save full question into bookmark doc so future reads are fast
          const bmRef = doc(db, 'users', userId, 'bookmarks', bm.docId);
          setDoc(bmRef, { ...q, examId: bm.examId, savedAt: bm.savedAt }).catch(() => {});
          return { ...q, examId: bm.examId, savedAt: bm.savedAt };
        } catch { return null; }
      })
    );

    const all = [
      ...fullQuestions,
      ...legacyResults.filter(Boolean)
    ];

    // Sort newest first
    all.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
    return all;
  } catch (err) {
    console.error('Error fetching bookmarks:', err);
    return [];
  }
}
