// app.js — Main app orchestrator (with stage selection: Prelims/Mains/Interview)
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
  getStagesForExam,
  getStageFromExam,
  getSubjectsForStage,
  getSubjectFromStage,
  findSubjectInExam
} from './exams.js';

// ========== State ==========
let currentUser = null;
let currentExam = null;
let currentStage = null;
let allBookmarkedQuestions = [];
let bookmarksFilter = 'this';

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

// ========== Auth ==========
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

// ========== Exam selector ==========
function renderExamSelector() {
  const container = $('examList');
  container.innerHTML = '';
  EXAMS.forEach(exam => {
    const btn = document.createElement('button');
    btn.className = 'exam-card';
    // Count subjects across all stages
    let totalSubjects = 0;
    (exam.stages || []).forEach(s => totalSubjects += (s.subjects || []).length);
    const info = totalSubjects > 0 ? `${totalSubjects} subjects` : 'Coming soon';
    btn.innerHTML = `
      <div class="exam-icon">${exam.icon}</div>
      <div class="exam-info">
        <div class="exam-name">${exam.name}</div>
        <div class="exam-state">${exam.state} · ${info}</div>
      </div>
      <div class="exam-arrow">›</div>
    `;
    btn.addEventListener('click', () => selectExam(exam.id));
    container.appendChild(btn);
  });
}

function selectExam(examId) {
  const exam = getExamById(examId);
  if (!exam) { toast('Invalid exam'); return; }
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

  // Total subjects across all stages
  let totalSubjects = 0;
  (currentExam.stages || []).forEach(s => totalSubjects += (s.subjects || []).length);
  $('subjectCount').textContent = totalSubjects;
}

document.querySelectorAll('.feature-card').forEach(card => {
  card.addEventListener('click', () => handleRoute(card.dataset.route));
});

async function handleRoute(route) {
  if (route === 'subjects') {
    // NEW: show stage selector first
    renderStagesList();
    showScreen('stagesScreen');
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
    bookmarksFilter = 'this';
    await loadBookmarks();
    showScreen('bookmarksScreen');
  } else {
    toast('Coming soon');
  }
}

// ========== Stages screen (NEW) ==========
function renderStagesList() {
  const container = $('stagesList');
  container.innerHTML = '';

  $('stagesExamLabel').textContent = currentExam.name;

  const stages = getStagesForExam(currentExam.id);

  stages.forEach(stage => {
    const subjectCount = (stage.subjects || []).length;
    const card = document.createElement('button');
    card.className = 'stage-card';
    const status = subjectCount > 0
      ? `${subjectCount} subjects`
      : 'Coming soon';
    card.innerHTML = `
      <div class="stage-icon">${stage.icon}</div>
      <div class="stage-info">
        <div class="stage-name">${stage.name}</div>
        <div class="stage-desc">${stage.description}</div>
        <div class="stage-status">${status}</div>
      </div>
      <div class="stage-arrow">›</div>
    `;
    card.addEventListener('click', () => openStage(stage.id));
    container.appendChild(card);
  });
}

function openStage(stageId) {
  const stage = getStageFromExam(currentExam.id, stageId);
  if (!stage) { toast('Invalid stage'); return; }
  currentStage = stage;
  renderSubjectsList();
  showScreen('subjectsScreen');
}

$('stagesBackBtn').addEventListener('click', () => {
  showScreen('homeScreen');
});

// ========== Subjects screen ==========
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
  // Note: questions are fetched by exam + subject (not stage in DB query — stage is metadata)
  const questions = await fetchQuestions({
    exam: currentExam.id,
    subject: subjectId,
    maxCount: 100
  });

  if (questions.length === 0) {
    const subj = getSubjectFromStage(currentExam.id, currentStage.id, subjectId);
    toast(`No questions in ${subj?.name || 'this subject'} yet`);
    return;
  }

  Quiz.startQuiz(questions);
  showScreen('quizScreen');
  renderQuiz();
}

$('subjectsBackBtn').addEventListener('click', () => {
  showScreen('stagesScreen');
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

  let visible;
  if (bookmarksFilter === 'this') {
    visible = allBookmarkedQuestions.filter(q => q.examId === currentExam.id);
  } else {
    visible = allBookmarkedQuestions;
  }

  const thisCount = allBookmarkedQuestions.filter(q => q.examId === currentExam.id).length;
  const allCount = allBookmarkedQuestions.length;
  tabThis.textContent = `This Exam (${thisCount})`;
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

$('tabThisExam').addEventListener('click', () => {
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
    visible = allBookmarkedQuestions.filter(q => q.examId === currentExam.id);
  } else {
    visible = allBookmarkedQuestions;
  }
  if (visible.length === 0) { toast('No bookmarks to practice'); return; }
  Quiz.startQuiz(visible);
  showScreen('quizScreen');
  renderQuiz();
});

function openBookmarkedQuestion(index, list) {
  Quiz.startQuiz(list);
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
    btn.addEventListener('click', () => onOptionClick(i, btn));
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
  // If quiz came from bookmarks, return there; else subjects screen
  const fromBookmarks = Quiz.getCurrent()?.savedAt;
  if (fromBookmarks) {
    showScreen('bookmarksScreen');
  } else {
    showScreen('subjectsScreen');
  }
});

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
