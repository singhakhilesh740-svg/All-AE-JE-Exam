// app.js — Main app orchestrator (with full bookmarks support)
import { watchAuth, loginWithGoogle, logout } from './auth.js';
import {
  fetchQuestions,
  saveUserProfile,
  saveAttempt,
  addBookmark,
  removeBookmark,
  isQuestionBookmarked,
  fetchBookmarkedQuestions
} from './db.js';
import * as Quiz from './quiz.js';
import {
  EXAMS,
  getExamById,
  getSelectedExam,
  setSelectedExam,
  getSubjectsForExam,
  getSubjectFromExam
} from './exams.js';

// ========== State ==========
let currentUser = null;
let currentExam = null;
let allBookmarkedQuestions = []; // cached for bookmark screen
let bookmarksFilter = 'this'; // 'this' = current exam only, 'all' = everything

// ========== DOM helpers ==========
const $ = (id) => document.getElementById(id);

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(screenId).classList.add('active');
}

function toast(msg, ms = 2000) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), ms);
}

// ========== Auth flow ==========
watchAuth(
  async (user) => {
    currentUser = user;
    $('userName').textContent = user.name.split(' ')[0];
    if (user.photo) $('userAvatar').src = user.photo;
    await saveUserProfile(user);

    const savedExam = getSelectedExam();
    if (savedExam) {
      currentExam = savedExam;
      enterApp();
    } else {
      renderExamSelector();
      showScreen('examScreen');
    }
  },
  () => {
    currentUser = null;
    currentExam = null;
    showScreen('loginScreen');
  }
);

$('googleLoginBtn').addEventListener('click', async () => {
  try {
    await loginWithGoogle();
  } catch (err) {
    toast('Login failed. Try again.');
  }
});

$('logoutBtn').addEventListener('click', async () => {
  await logout();
  toast('Logged out');
});

// ========== Exam selection screen ==========
function renderExamSelector() {
  const container = $('examList');
  container.innerHTML = '';

  EXAMS.forEach(exam => {
    const btn = document.createElement('button');
    btn.className = 'exam-card';
    const subjectCount = exam.subjects ? exam.subjects.length : 0;
    const subjectInfo = subjectCount > 0
      ? `${subjectCount} subjects`
      : 'Coming soon';
    btn.innerHTML = `
      <div class="exam-icon">${exam.icon}</div>
      <div class="exam-info">
        <div class="exam-name">${exam.name}</div>
        <div class="exam-state">${exam.state} · ${subjectInfo}</div>
      </div>
      <div class="exam-arrow">›</div>
    `;
    btn.addEventListener('click', () => selectExam(exam.id));
    container.appendChild(btn);
  });
}

function selectExam(examId) {
  const exam = getExamById(examId);
  if (!exam) {
    toast('Invalid exam');
    return;
  }
  setSelectedExam(examId);
  currentExam = exam;
  enterApp();
}

function enterApp() {
  $('headerExamName').textContent = currentExam.name;
  $('headerExamSub').textContent = currentExam.description;
  showScreen('homeScreen');
  loadHomeData();
}

$('switchExamBtn').addEventListener('click', () => {
  renderExamSelector();
  showScreen('examScreen');
});

// ========== Home screen ==========
async function loadHomeData() {
  const questions = await fetchQuestions({ exam: currentExam.id, maxCount: 200 });
  $('qCount').textContent = questions.length || '0';

  const subjectCount = (currentExam.subjects || []).length;
  $('subjectCount').textContent = subjectCount;
}

document.querySelectorAll('.feature-card').forEach(card => {
  card.addEventListener('click', () => {
    const route = card.dataset.route;
    handleRoute(route);
  });
});

async function handleRoute(route) {
  if (route === 'subjects') {
    renderSubjectsList();
    showScreen('subjectsScreen');
  } else if (route === 'pyq' || route === 'mock') {
    const questions = await fetchQuestions({ exam: currentExam.id, maxCount: 100 });
    if (questions.length === 0) {
      toast(`No questions in ${currentExam.name} yet`);
      return;
    }
    Quiz.startQuiz(questions);
    showScreen('quizScreen');
    renderQuiz();
  } else if (route === 'bookmarks') {
    bookmarksFilter = 'this'; // reset to current exam tab
    await loadBookmarks();
    showScreen('bookmarksScreen');
  } else {
    toast('Coming soon');
  }
}

// ========== Subjects screen ==========
function renderSubjectsList() {
  const container = $('subjectsList');
  const emptyState = $('subjectsEmpty');
  container.innerHTML = '';

  $('subjectsExamLabel').textContent = currentExam.name;

  const subjects = getSubjectsForExam(currentExam.id);

  if (subjects.length === 0) {
    container.classList.add('hidden');
    emptyState.classList.remove('hidden');
    $('emptyExamName').textContent = currentExam.name;
    return;
  }

  container.classList.remove('hidden');
  emptyState.classList.add('hidden');

  subjects.forEach(subject => {
    const btn = document.createElement('button');
    btn.className = 'subject-card';
    btn.innerHTML = `
      <div class="subject-icon">${subject.icon || '📖'}</div>
      <div class="subject-info">
        <div class="subject-name">${subject.name}</div>
        <div class="subject-desc">${subject.description || ''}</div>
      </div>
      <div class="subject-arrow">›</div>
    `;
    btn.addEventListener('click', () => openSubject(subject.id));
    container.appendChild(btn);
  });
}

async function openSubject(subjectId) {
  toast('Loading questions...');
  const questions = await fetchQuestions({
    exam: currentExam.id,
    subject: subjectId,
    maxCount: 100
  });

  if (questions.length === 0) {
    const subj = getSubjectFromExam(currentExam.id, subjectId);
    toast(`No questions in ${subj?.name || 'this subject'} yet`);
    return;
  }

  Quiz.startQuiz(questions);
  showScreen('quizScreen');
  renderQuiz();
}

$('subjectsBackBtn').addEventListener('click', () => {
  showScreen('homeScreen');
});

// ========== Bookmarks screen ==========
async function loadBookmarks() {
  if (!currentUser) return;
  toast('Loading bookmarks...');
  allBookmarkedQuestions = await fetchBookmarkedQuestions(currentUser.uid);
  renderBookmarksList();
}

function renderBookmarksList() {
  const container = $('bookmarksList');
  const empty = $('bookmarksEmpty');
  const practiceBtn = $('practiceBookmarksBtn');
  const tabThis = $('tabThisExam');
  const tabAll = $('tabAllExams');

  // Filter based on tab
  let visible;
  if (bookmarksFilter === 'this') {
    visible = allBookmarkedQuestions.filter(q => q.examId === currentExam.id);
  } else {
    visible = allBookmarkedQuestions;
  }

  // Update tab counts
  const thisCount = allBookmarkedQuestions.filter(q => q.examId === currentExam.id).length;
  const allCount = allBookmarkedQuestions.length;
  tabThis.textContent = `This Exam (${thisCount})`;
  tabAll.textContent = `All Exams (${allCount})`;

  // Active tab styling
  tabThis.classList.toggle('active', bookmarksFilter === 'this');
  tabAll.classList.toggle('active', bookmarksFilter === 'all');

  // Empty state
  if (visible.length === 0) {
    container.classList.add('hidden');
    empty.classList.remove('hidden');
    practiceBtn.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  empty.classList.add('hidden');
  practiceBtn.classList.remove('hidden');
  practiceBtn.textContent = `Practice all (${visible.length})`;

  // Render the list
  container.innerHTML = '';
  visible.forEach((q, idx) => {
    const card = document.createElement('button');
    card.className = 'bookmark-card';
    const preview = q.question.length > 100
      ? q.question.substring(0, 100) + '...'
      : q.question;
    card.innerHTML = `
      <div class="bookmark-num">${idx + 1}</div>
      <div class="bookmark-content">
        <div class="bookmark-text">${escapeHtml(preview)}</div>
      </div>
      <div class="bookmark-arrow">›</div>
    `;
    card.addEventListener('click', () => openBookmarkedQuestion(idx, visible));
    container.appendChild(card);
  });
}

// Tab switching
$('tabThisExam').addEventListener('click', () => {
  bookmarksFilter = 'this';
  renderBookmarksList();
});

$('tabAllExams').addEventListener('click', () => {
  bookmarksFilter = 'all';
  renderBookmarksList();
});

// "Practice all" button — start a quiz with all visible bookmarks
$('practiceBookmarksBtn').addEventListener('click', () => {
  let visible;
  if (bookmarksFilter === 'this') {
    visible = allBookmarkedQuestions.filter(q => q.examId === currentExam.id);
  } else {
    visible = allBookmarkedQuestions;
  }
  if (visible.length === 0) {
    toast('No bookmarks to practice');
    return;
  }
  Quiz.startQuiz(visible);
  showScreen('quizScreen');
  renderQuiz();
});

// Open single bookmark in review mode
function openBookmarkedQuestion(index, list) {
  Quiz.startQuiz(list);
  // Jump to specific index
  while (Quiz.getProgress().current - 1 < index) {
    if (!Quiz.next()) break;
  }
  showScreen('quizScreen');
  renderQuiz();
}

$('bookmarksBackBtn').addEventListener('click', () => {
  showScreen('homeScreen');
});

// ========== Quiz screen ==========
async function renderQuiz() {
  const q = Quiz.getCurrent();
  if (!q) {
    toast('No question to show');
    showScreen('homeScreen');
    return;
  }

  const { current, total } = Quiz.getProgress();
  $('quizProgress').textContent = `${current} / ${total}`;

  // Look up subject within current exam (or question's exam if from bookmark)
  const examIdForLookup = q.examId || currentExam.id;
  const subjData = getSubjectFromExam(examIdForLookup, q.subject);
  $('quizSubject').textContent = subjData ? subjData.name : (q.subject || 'General');
  $('quizYear').textContent = q.year ? `Year ${q.year}` : '—';
  $('quizQuestion').textContent = q.question;
  $('quizExplanation').classList.add('hidden');

  const optsContainer = $('quizOptions');
  optsContainer.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.innerHTML = `<span class="opt-letter">${letters[i]}.</span><span>${escapeHtml(opt)}</span>`;
    btn.addEventListener('click', () => onOptionClick(i, btn));
    optsContainer.appendChild(btn);
  });

  // Bookmark icon — check Firebase to set correct state
  await updateBookmarkButton(q);
}

async function updateBookmarkButton(q) {
  if (!currentUser) {
    $('quizBookmarkBtn').textContent = '☆';
    return;
  }
  const examIdForBookmark = q.examId || currentExam.id;
  const isMarked = await isQuestionBookmarked(currentUser.uid, examIdForBookmark, q.id);
  $('quizBookmarkBtn').textContent = isMarked ? '★' : '☆';
  $('quizBookmarkBtn').dataset.marked = isMarked ? '1' : '0';
}

function onOptionClick(index, btnEl) {
  const result = Quiz.selectOption(index);
  if (!result) return;

  const q = Quiz.getCurrent();
  const allBtns = document.querySelectorAll('.quiz-option');

  allBtns.forEach((b, i) => {
    b.disabled = true;
    if (i === result.correctIndex) b.classList.add('correct');
    if (i === index && !result.isCorrect) b.classList.add('wrong');
  });

  if (q.explanation) {
    $('quizExplanationText').textContent = q.explanation;
    $('quizExplanation').classList.remove('hidden');
  }

  if (currentUser && currentExam) {
    const examIdForAttempt = q.examId || currentExam.id;
    saveAttempt(currentUser.uid, examIdForAttempt, q.id, index, result.isCorrect);
  }
}

$('quizNextBtn').addEventListener('click', () => {
  if (Quiz.next()) {
    renderQuiz();
  } else {
    toast('Quiz complete! 🎉');
    setTimeout(() => showScreen('homeScreen'), 800);
  }
});

$('quizPrevBtn').addEventListener('click', () => {
  if (Quiz.prev()) renderQuiz();
});

$('quizBackBtn').addEventListener('click', () => {
  // Smart back: if quiz was from bookmarks, go to bookmarks; else subjects
  const bm = allBookmarkedQuestions.length > 0 && Quiz.getCurrent()?.savedAt;
  if (bm) {
    showScreen('bookmarksScreen');
  } else {
    showScreen('subjectsScreen');
  }
});

// Bookmark toggle (now properly toggles save/unsave)
$('quizBookmarkBtn').addEventListener('click', async () => {
  const q = Quiz.getCurrent();
  if (!q || !currentUser) return;

  const examIdForBookmark = q.examId || currentExam.id;
  const isMarked = $('quizBookmarkBtn').dataset.marked === '1';

  if (isMarked) {
    const ok = await removeBookmark(currentUser.uid, examIdForBookmark, q.id);
    if (ok) {
      $('quizBookmarkBtn').textContent = '☆';
      $('quizBookmarkBtn').dataset.marked = '0';
      toast('Removed from bookmarks');
    } else {
      toast('Failed to remove');
    }
  } else {
    const ok = await addBookmark(currentUser.uid, examIdForBookmark, q.id);
    if (ok) {
      $('quizBookmarkBtn').textContent = '★';
      $('quizBookmarkBtn').dataset.marked = '1';
      toast('Bookmarked');
    } else {
      toast('Failed to bookmark');
    }
  }
});

// ========== Helpers ==========
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
