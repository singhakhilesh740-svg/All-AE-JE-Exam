// app.js — Main orchestrator
// Flow: Login → Home (all exams) → Exam Dashboard → Stage Dashboard → Subjects → Quiz
//                                                                  → PYQ → Quiz
//                                                                  → Mock → Quiz
//                                                                  → Bookmarks → Quiz

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
  getStagesForExam,
  getStageFromExam,
  getSubjectsForStage,
  findSubjectInExam
} from './exams.js';

// ========== State ==========
let currentUser = null;
let currentExam = null;
let currentStage = null;
let allBookmarkedQuestions = [];
let bookmarksFilter = 'this'; // 'this' = current stage, 'all' = all exams
let quizSource = null;        // tracks where quiz was launched from (for back nav)

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

// ========== Persistence (last exam) ==========
const LAST_EXAM_KEY = 'lastSelectedExam';

function rememberLastExam(examId) {
  localStorage.setItem(LAST_EXAM_KEY, examId);
}

function getLastExamId() {
  return localStorage.getItem(LAST_EXAM_KEY);
}

// ========== Auth ==========
watchAuth(
  async (user) => {
    currentUser = user;
    $('userName').textContent = user.name.split(' ')[0];
    if (user.photo) $('userAvatar').src = user.photo;
    await saveUserProfile(user);

    // Try to land on last exam's dashboard
    const lastId = getLastExamId();
    const lastExam = lastId ? getExamById(lastId) : null;
    if (lastExam) {
      currentExam = lastExam;
      openExamDashboard();
    } else {
      renderHomeExams();
      showScreen('homeScreen');
    }
  },
  () => {
    currentUser = null;
    currentExam = null;
    currentStage = null;
    showScreen('loginScreen');
  }
);

$('googleLoginBtn').addEventListener('click', async () => {
  try { await loginWithGoogle(); }
  catch (err) { toast('Login failed. Try again.'); }
});

$('logoutBtn').addEventListener('click', async () => {
  await logout();
  toast('Logged out');
});

// ========== HOME SCREEN: All exams list ==========
function renderHomeExams() {
  const container = $('examList');
  container.innerHTML = '';

  EXAMS.forEach(exam => {
    let totalSubjects = 0;
    (exam.stages || []).forEach(s => totalSubjects += (s.subjects || []).length);
    const status = totalSubjects > 0 ? `${totalSubjects} subjects` : 'Coming soon';

    const btn = document.createElement('button');
    btn.className = 'exam-card';
    btn.innerHTML = `
      <div class="exam-icon">${exam.icon}</div>
      <div class="exam-info">
        <div class="exam-name">${exam.name}</div>
        <div class="exam-state">${exam.state} · ${status}</div>
      </div>
      <div class="exam-arrow">›</div>
    `;
    btn.addEventListener('click', () => {
      currentExam = exam;
      rememberLastExam(exam.id);
      openExamDashboard();
    });
    container.appendChild(btn);
  });
}

// ========== EXAM DASHBOARD: Stage cards ==========
function openExamDashboard() {
  $('dashExamName').textContent = currentExam.name;
  $('dashExamSub').textContent = currentExam.description;

  // Check if exam has any subjects across any stage
  let totalSubjects = 0;
  (currentExam.stages || []).forEach(s => totalSubjects += (s.subjects || []).length);

  const stagesList = $('stagesList');
  const comingSoon = $('examComingSoon');

  if (totalSubjects === 0) {
    // Show "coming soon" for exams without any content
    stagesList.classList.add('hidden');
    comingSoon.classList.remove('hidden');
    $('comingSoonExamName').textContent = currentExam.name;
  } else {
    stagesList.classList.remove('hidden');
    comingSoon.classList.add('hidden');
    renderStagesGrid();
  }

  showScreen('examDashboardScreen');
}

function renderStagesGrid() {
  const container = $('stagesList');
  container.innerHTML = '';
  const stages = getStagesForExam(currentExam.id);

  stages.forEach(stage => {
    const subjectCount = (stage.subjects || []).length;
    const status = subjectCount > 0 ? `${subjectCount} subjects` : 'Coming soon';
    const card = document.createElement('button');
    card.className = 'stage-card';
    card.innerHTML = `
      <div class="stage-icon">${stage.icon}</div>
      <div class="stage-info">
        <div class="stage-name">${stage.name}</div>
        <div class="stage-desc">${stage.description}</div>
        <div class="stage-status">${status}</div>
      </div>
      <div class="stage-arrow">›</div>
    `;
    card.addEventListener('click', () => openStageDashboard(stage.id));
    container.appendChild(card);
  });
}

$('examDashBackBtn').addEventListener('click', () => {
  renderHomeExams();
  showScreen('homeScreen');
});

// ========== STAGE DASHBOARD: Section cards (Subjects/PYQ/Mock/Bookmarks) ==========
function openStageDashboard(stageId) {
  const stage = getStageFromExam(currentExam.id, stageId);
  if (!stage) { toast('Invalid stage'); return; }
  currentStage = stage;

  $('stageDashName').textContent = stage.name;
  $('stageDashExamLabel').textContent = currentExam.name;
  $('stageNameLabel').textContent = stage.name;
  $('stageSubjectCount').textContent = (stage.subjects || []).length;

  showScreen('stageDashboardScreen');
}

document.querySelectorAll('[data-stage-route]').forEach(card => {
  card.addEventListener('click', () => {
    const route = card.dataset.stageRoute;
    handleStageRoute(route);
  });
});

async function handleStageRoute(route) {
  if (!currentStage) { toast('Pick a stage first'); return; }

  if (route === 'subjects') {
    renderSubjectsList();
    showScreen('subjectsScreen');
  } else if (route === 'pyq') {
    // For now: load all questions for this exam (later: filter by stage + year)
    const questions = await fetchQuestions({ exam: currentExam.id, maxCount: 100 });
    if (questions.length === 0) {
      toast(`No PYQ available yet for ${currentStage.name}`);
      return;
    }
    quizSource = 'pyq';
    Quiz.startQuiz(questions);
    showScreen('quizScreen');
    renderQuiz();
  } else if (route === 'mock') {
    toast('Mock tests coming soon');
  } else if (route === 'bookmarks') {
    bookmarksFilter = 'this';
    await loadBookmarks();
    showScreen('bookmarksScreen');
  } else {
    toast('Coming soon');
  }
}

$('stageDashBackBtn').addEventListener('click', () => {
  showScreen('examDashboardScreen');
});

// ========== SUBJECTS LIST ==========
function renderSubjectsList() {
  const container = $('subjectsList');
  const emptyState = $('subjectsEmpty');
  container.innerHTML = '';

  $('subjectsExamLabel').textContent = currentExam.name;
  $('subjectsStageLabel').textContent = currentStage.name;

  const subjects = currentStage.subjects || [];

  if (subjects.length === 0) {
    container.classList.add('hidden');
    emptyState.classList.remove('hidden');
    $('emptyStageName').textContent = currentStage.name;
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
    const subj = currentStage.subjects.find(s => s.id === subjectId);
    toast(`No questions in ${subj?.name || 'this subject'} yet`);
    return;
  }

  quizSource = 'subject';
  Quiz.startQuiz(questions);
  showScreen('quizScreen');
  renderQuiz();
}

$('subjectsBackBtn').addEventListener('click', () => {
  showScreen('stageDashboardScreen');
});

// ========== BOOKMARKS SCREEN ==========
async function loadBookmarks() {
  if (!currentUser) return;
  toast('Loading bookmarks...');
  allBookmarkedQuestions = await fetchBookmarkedQuestions(currentUser.uid);
  $('bookmarksContextLabel').textContent = `${currentExam.name} · ${currentStage.name}`;
  renderBookmarksList();
}

function renderBookmarksList() {
  const container = $('bookmarksList');
  const empty = $('bookmarksEmpty');
  const practiceBtn = $('practiceBookmarksBtn');
  const tabThis = $('tabThisStage');
  const tabAll = $('tabAllExams');

  // Filter: 'this' means current exam + current stage
  let visible;
  if (bookmarksFilter === 'this') {
    visible = allBookmarkedQuestions.filter(q =>
      q.examId === currentExam.id && q.stage === currentStage.id
    );
  } else {
    visible = allBookmarkedQuestions;
  }

  // Counts
  const thisCount = allBookmarkedQuestions.filter(q =>
    q.examId === currentExam.id && q.stage === currentStage.id
  ).length;
  const allCount = allBookmarkedQuestions.length;
  tabThis.textContent = `This Stage (${thisCount})`;
  tabAll.textContent = `All Exams (${allCount})`;
  tabThis.classList.toggle('active', bookmarksFilter === 'this');
  tabAll.classList.toggle('active', bookmarksFilter === 'all');

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

  container.innerHTML = '';
  visible.forEach((q, idx) => {
    const card = document.createElement('button');
    card.className = 'bookmark-card';
    const preview = q.question.length > 100 ? q.question.substring(0, 100) + '...' : q.question;
    card.innerHTML = `
      <div class="bookmark-num">${idx + 1}</div>
      <div class="bookmark-content"><div class="bookmark-text">${escapeHtml(preview)}</div></div>
      <div class="bookmark-arrow">›</div>
    `;
    card.addEventListener('click', () => openBookmarkedQuestion(idx, visible));
    container.appendChild(card);
  });
}

$('tabThisStage').addEventListener('click', () => {
  bookmarksFilter = 'this';
  renderBookmarksList();
});

$('tabAllExams').addEventListener('click', () => {
  bookmarksFilter = 'all';
  renderBookmarksList();
});

$('practiceBookmarksBtn').addEventListener('click', () => {
  let visible;
  if (bookmarksFilter === 'this') {
    visible = allBookmarkedQuestions.filter(q =>
      q.examId === currentExam.id && q.stage === currentStage.id
    );
  } else {
    visible = allBookmarkedQuestions;
  }
  if (visible.length === 0) { toast('No bookmarks to practice'); return; }
  quizSource = 'bookmarks';
  Quiz.startQuiz(visible);
  showScreen('quizScreen');
  renderQuiz();
}); 

function openBookmarkedQuestion(index, list) {
  quizSource = 'bookmarks';
  Quiz.startQuiz(list);
  while (Quiz.getProgress().current - 1 < index) {
    if (!Quiz.next()) break;
  }
  showScreen('quizScreen');
  renderQuiz();
}

$('bookmarksBackBtn').addEventListener('click', () => {
  showScreen('stageDashboardScreen');
});

// ========== QUIZ SCREEN ==========
async function renderQuiz() {
  const q = Quiz.getCurrent();
  if (!q) {
    toast('No question to show');
    showScreen('stageDashboardScreen');
    return;
  }

  const { current, total } = Quiz.getProgress();
  $('quizProgress').textContent = `${current} / ${total}`;

  // Find subject across all stages of the question's exam
  const examIdForLookup = q.examId || currentExam.id;
  const subjData = findSubjectInExam(examIdForLookup, q.subject);
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
    btn.addEventListener('click', () => onOptionClick(i));
    optsContainer.appendChild(btn);
  });

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

function onOptionClick(index) {
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
    setTimeout(() => returnToQuizSource(), 800);
  }
});

$('quizPrevBtn').addEventListener('click', () => {
  if (Quiz.prev()) renderQuiz();
});

$('quizBackBtn').addEventListener('click', () => returnToQuizSource());

function returnToQuizSource() {
  if (quizSource === 'bookmarks') {
    showScreen('bookmarksScreen');
  } else if (quizSource === 'subject') {
    showScreen('subjectsScreen');
  } else if (quizSource === 'pyq' || quizSource === 'mock') {
    showScreen('stageDashboardScreen');
  } else {
    showScreen('stageDashboardScreen');
  }
}

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
