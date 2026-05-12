// quiz.js — Quiz engine. Pure logic.
let state = {
  questions: [],
  currentIndex: 0,
  selectedIndex: null,
  answered: false,
  bookmarked: new Set()
};

export function startQuiz(questions) {
  state.questions = questions;
  state.currentIndex = 0;
  state.selectedIndex = null;
  state.answered = false;
}

export function getCurrent() {
  return state.questions[state.currentIndex] || null;
}

export function getProgress() {
  return {
    current: state.currentIndex + 1,
    total: state.questions.length
  };
}

export function selectOption(index) {
  if (state.answered) return null;
  state.selectedIndex = index;
  state.answered = true;
  const q = getCurrent();
  return {
    isCorrect: index === q.answer,
    correctIndex: q.answer
  };
}

export function next() {
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex++;
    state.selectedIndex = null;
    state.answered = false;
    return true;
  }
  return false;
}

export function prev() {
  if (state.currentIndex > 0) {
    state.currentIndex--;
    state.selectedIndex = null;
    state.answered = false;
    return true;
  }
  return false;
}

export function isBookmarked(qId) {
  return state.bookmarked.has(qId);
}

export function toggleBookmark(qId) {
  if (state.bookmarked.has(qId)) {
    state.bookmarked.delete(qId);
    return false;
  }
  state.bookmarked.add(qId);
  return true;
}

// Replace the active question set (used by topic filter chip inside quiz)
export function resetToQuestions(questions) {
  state.questions = questions;
  state.currentIndex = 0;
  state.selectedIndex = null;
  state.answered = false;
}

export function getAllQuestions() {
  return state.questions;
}
