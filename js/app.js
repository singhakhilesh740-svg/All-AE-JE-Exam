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
import { getTopicsFor } from './subjects.js';

// ========== State ==========
let currentUser = null;
let currentExam = null;
let currentStage = null;
let currentSubject = null;       // current subject for subject dashboard
let currentTopic   = 'all';     // active topic filter ('all' or topic id)
let allBookmarkedQuestions = [];
let bookmarksFilter = 'this'; // 'this' = current stage, 'all' = all exams
let quizSource = null;        // tracks where quiz was launched from (for back nav)
let quizRoute  = null;        // 'pyq' | 'practice' | 'bookmarks' — for topic re-filter

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
  const subj = currentStage.subjects.find(s => s.id === subjectId);
  if (!subj) { toast('Invalid subject'); return; }
  currentSubject = subj;
  openSubjectDashboard();
}

// ========== SUBJECT DASHBOARD: 4 cards (Practice / Notes / PYQ / Bookmarks) ==========
async function openSubjectDashboard() {
  if (!currentSubject) { toast('Pick a subject first'); return; }

  currentTopic = 'all'; // reset topic filter on new subject

  $('subjDashName').textContent = currentSubject.name;
  $('subjDashExamLabel').textContent = currentExam.name;
  $('subjDashStageLabel').textContent = currentStage.name;

  // Render topic chips
  renderTopicBar('subjTopicBar', currentSubject.id, (topicId) => {
    currentTopic = topicId;
    // Update counts when topic changes
    updateSubjectCounts();
  });

  // Reset counters
  $('subjCntPractice').textContent = '…';
  $('subjCntPyq').textContent = '…';
  $('subjCntBm').textContent = '0';

  showScreen('subjectDashboardScreen');

  updateSubjectCounts();
}

function updateSubjectCounts() {
  const topicFilter = currentTopic === 'all' ? null : currentTopic;

  fetchQuestions({ exam: currentExam.id, subject: currentSubject.id, type: 'practice' })
    .then(qs => {
      const filtered = topicFilter ? qs.filter(q => q.topic === topicFilter) : qs;
      $('subjCntPractice').textContent = filtered.length;
    })
    .catch(() => { $('subjCntPractice').textContent = '0'; });

  fetchQuestions({ exam: currentExam.id, subject: currentSubject.id, type: 'pyq' })
    .then(qs => {
      const filtered = topicFilter ? qs.filter(q => q.topic === topicFilter) : qs;
      $('subjCntPyq').textContent = filtered.length;
    })
    .catch(() => { $('subjCntPyq').textContent = '0'; });

  // Bookmarks count
  if (currentUser) {
    (async () => {
      try {
        if (allBookmarkedQuestions.length === 0) {
          allBookmarkedQuestions = await fetchBookmarkedQuestions(currentUser.uid);
        }
        let bmList = allBookmarkedQuestions.filter(q =>
          q.examId === currentExam.id && q.subject === currentSubject.id
        );
        if (topicFilter) bmList = bmList.filter(q => q.topic === topicFilter);
        $('subjCntBm').textContent = bmList.length;
      } catch (e) { /* ignore */ }
    })();
  }
}

// ===== Topic bar renderer =====
// Renders scrollable chip row into a container element by id.
// onSelect(topicId) is called when user picks a chip.
function renderTopicBar(containerId, subjectId, onSelect) {
  const container = $(containerId);
  if (!container) return;
  const topics = getTopicsFor(subjectId); // always starts with {id:'all', label:'All'}

  container.innerHTML = topics.map(t => `
    <button class="topic-chip${t.id === currentTopic ? ' active' : ''}"
            data-topic="${t.id}">${escapeHtml(t.label)}</button>
  `).join('');

  container.querySelectorAll('.topic-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const topicId = chip.dataset.topic;
      // Toggle active chip
      container.querySelectorAll('.topic-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      if (onSelect) onSelect(topicId);
    });
  });
}

// Sync topic chip state in the quiz/notes topic bars (read-only, same topic)
function renderQuizTopicBar(containerId, subjectId) {
  const container = $(containerId);
  if (!container) return;
  const topics = getTopicsFor(subjectId);
  container.innerHTML = topics.map(t => `
    <button class="topic-chip${t.id === currentTopic ? ' active' : ''}"
            data-topic="${t.id}">${escapeHtml(t.label)}</button>
  `).join('');

  container.querySelectorAll('.topic-chip').forEach(chip => {
    chip.addEventListener('click', async () => {
      const topicId = chip.dataset.topic;
      currentTopic = topicId;
      // Sync active state on all chip bars
      document.querySelectorAll('.topic-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.topic === topicId);
      });
      // Re-fetch and filter questions for the active route
      if (!currentSubject || !quizRoute) return;
      const subjId = currentSubject.id;
      const tf = topicId === 'all' ? null : topicId;
      if (quizRoute === 'pyq' || quizRoute === 'practice') {
        let qs = await fetchQuestions({
          exam: currentExam.id, subject: subjId,
          type: quizRoute === 'pyq' ? 'pyq' : 'practice', maxCount: 500
        });
        if (tf) qs = qs.filter(q => q.topic === tf);
        if (qs.length === 0) { toast('No questions for this topic yet'); return; }
        if (quizRoute === 'pyq') qs.sort((a, b) => (b.year||0)-(a.year||0) || (a.q_num||0)-(b.q_num||0));
        Quiz.resetToQuestions(qs);
        renderQuiz();
      } else if (quizRoute === 'bookmarks') {
        let bms = allBookmarkedQuestions.filter(q =>
          q.examId === currentExam.id && q.subject === subjId
        );
        if (tf) bms = bms.filter(q => q.topic === tf);
        if (bms.length === 0) { toast('No bookmarks for this topic yet'); return; }
        Quiz.resetToQuestions(bms);
        renderQuiz();
      }
      // Also update subject dashboard counts if visible
      if (currentSubject) updateSubjectCounts();
    });
  });
}

// Subject-dashboard route handlers (Practice / Notes / PYQ / Bookmarks)
document.querySelectorAll('[data-subj-route]').forEach(card => {
  card.addEventListener('click', () => {
    const route = card.dataset.subjRoute;
    handleSubjectRoute(route);
  });
});

async function handleSubjectRoute(route) {
  if (!currentSubject) { toast('Pick a subject first'); return; }
  const subjId = currentSubject.id;
  const subjName = currentSubject.name;
  const topicFilter = currentTopic === 'all' ? null : currentTopic;
  const topicLabel = topicFilter
    ? (getTopicsFor(subjId).find(t => t.id === topicFilter)?.label || topicFilter)
    : 'All Topics';

  if (route === 'practice') {
    let questions = await fetchQuestions({
      exam: currentExam.id, subject: subjId, type: 'practice', maxCount: 500
    });
    if (topicFilter) questions = questions.filter(q => q.topic === topicFilter);
    if (questions.length === 0) { toast(`No practice questions for "${topicLabel}" yet`); return; }
    quizSource = 'subjectDash';
    quizRoute  = 'practice';
    Quiz.startQuiz(questions);
    showScreen('quizScreen');
    renderQuizTopicBar('quizTopicBar', subjId);
    renderQuiz();

  } else if (route === 'pyq') {
    let questions = await fetchQuestions({
      exam: currentExam.id, subject: subjId, type: 'pyq', maxCount: 500
    });
    if (topicFilter) questions = questions.filter(q => q.topic === topicFilter);
    if (questions.length === 0) { toast(`No PYQ for "${topicLabel}" yet`); return; }
    questions.sort((a, b) => (b.year || 0) - (a.year || 0) || (a.q_num || 0) - (b.q_num || 0));
    quizSource = 'subjectDash';
    quizRoute  = 'pyq';
    Quiz.startQuiz(questions);
    showScreen('quizScreen');
    renderQuizTopicBar('quizTopicBar', subjId);
    renderQuiz();

  } else if (route === 'notes') {
    $('notesTitle').textContent = subjName + ' — Notes';
    $('notesContextLabel').textContent = `${currentExam.name} · ${currentStage.name}`;
    $('notesSubjectName').textContent = subjName;
    showScreen('notesScreen');
    renderQuizTopicBar('notesTopicBar', subjId);

  } else if (route === 'bookmarks') {
    if (!currentUser) { toast('Sign in to view bookmarks'); return; }
    if (allBookmarkedQuestions.length === 0) {
      allBookmarkedQuestions = await fetchBookmarkedQuestions(currentUser.uid);
    }
    let subjBookmarks = allBookmarkedQuestions.filter(q =>
      q.examId === currentExam.id && q.subject === subjId
    );
    if (topicFilter) subjBookmarks = subjBookmarks.filter(q => q.topic === topicFilter);
    if (subjBookmarks.length === 0) { toast(`No bookmarks for "${topicLabel}" yet`); return; }
    quizSource = 'subjectDash';
    quizRoute  = 'bookmarks';
    Quiz.startQuiz(subjBookmarks);
    showScreen('quizScreen');
    renderQuizTopicBar('quizTopicBar', subjId);
    renderQuiz();
  }
}

$('subjDashBackBtn').addEventListener('click', () => {
  showScreen('subjectsScreen');
});

$('notesBackBtn').addEventListener('click', () => {
  showScreen('subjectDashboardScreen');
});

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
  } else if (quizSource === 'subjectDash') {
    showScreen('subjectDashboardScreen');
  } else if (quizSource === 'subject') {
    showScreen('subjectsScreen');
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
