// app.js — v10 Orchestrator
// Flow: Login → Home → [Notes | Practice | PYQ | Bookmarks]
//   Notes:    Home → notesSubjectsScreen → notesContentScreen (topic chips)
//   Practice: Home → practiceSubjectsScreen → quizScreen (topic chips)
//   PYQ:      Home → pyqExamsScreen → pyqSubjectsScreen → quizScreen (topic chips)
//   Bookmarks:Home → bookmarksScreen → quizScreen

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
import { EXAMS, getExamById } from './exams.js';
import { SUBJECTS_UPPSC_MAINS, getTopicsFor } from './subjects.js';
import { renderNotesContent, loadNotesForSubject } from './notes.js';

// ── State ──────────────────────────────────────────────────────────────────
let currentUser         = null;
let currentSubject      = null;    // selected subject object
let currentTopic        = 'all';   // active topic chip
let currentExam         = null;    // selected exam (PYQ)
let allBookmarks        = [];
let quizSource          = 'home';  // where to go back from quiz
let quizRoute           = null;    // 'practice' | 'pyq' | 'bookmarks'

// ── DOM helper ─────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo(0, 0);
}

function toast(msg, ms = 2000) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), ms);
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = String(str || '');
  return d.innerHTML;
}

// ── Back buttons (declarative via data-back attribute) ──────────────────────
document.querySelectorAll('.back-btn[data-back]').forEach(btn => {
  btn.addEventListener('click', () => showScreen(btn.dataset.back));
});

// ── Auth ───────────────────────────────────────────────────────────────────
watchAuth(
  async user => {
    currentUser = user;
    $('userName').textContent = user.name.split(' ')[0];
    if (user.photo) $('userAvatar').src = user.photo;
    await saveUserProfile(user);
    showScreen('homeScreen');
  },
  () => {
    currentUser = null;
    showScreen('loginScreen');
  }
);

$('googleLoginBtn').addEventListener('click', async () => {
  try { await loginWithGoogle(); }
  catch { toast('Login failed. Try again.'); }
});

$('logoutBtn').addEventListener('click', async () => {
  await logout();
  toast('Logged out');
});

// ══════════════════════════════════════════════════════════════════════════════
// HOME — 4 tiles
// ══════════════════════════════════════════════════════════════════════════════

$('homeNotes').addEventListener('click', () => {
  renderSubjectList('notesSubjectList', SUBJECTS_UPPSC_MAINS, openNotesSubject);
  showScreen('notesSubjectsScreen');
});

$('homePractice').addEventListener('click', () => {
  renderSubjectList('practiceSubjectList', SUBJECTS_UPPSC_MAINS, openPracticeSubject);
  showScreen('practiceSubjectsScreen');
});

$('homePYQ').addEventListener('click', () => {
  renderExamList();
  showScreen('pyqExamsScreen');
});

$('homeBookmarks').addEventListener('click', async () => {
  await loadAndShowBookmarks();
  showScreen('bookmarksScreen');
});

// ══════════════════════════════════════════════════════════════════════════════
// SUBJECT LIST RENDERER (shared by Notes + Practice)
// ══════════════════════════════════════════════════════════════════════════════

function renderSubjectList(containerId, subjects, onSelect) {
  const container = $(containerId);
  container.innerHTML = '';
  subjects.forEach(subj => {
    const btn = document.createElement('button');
    btn.className = 'subject-card';
    btn.innerHTML = `
      <div class="subject-icon">${subj.icon || '📖'}</div>
      <div class="subject-info">
        <div class="subject-name">${escapeHtml(subj.name)}</div>
        <div class="subject-desc">${escapeHtml(subj.description || '')}</div>
      </div>
      <div class="subject-arrow">›</div>
    `;
    btn.addEventListener('click', () => onSelect(subj));
    container.appendChild(btn);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTES FLOW
// ══════════════════════════════════════════════════════════════════════════════

async function openNotesSubject(subj) {
  currentSubject = subj;

  $('notesContentTitle').textContent = subj.name + ' — Notes';
  $('notesContentSub').textContent   = 'Topic-wise study material';

  // notes.js owns the topic bar (#notesTopicBar) + content (#notesMain)
  // It reads topics from the JSON (numeric IDs: 0,1,2...) not from subjects.js
  const data = await loadNotesForSubject(subj.id);
  if (!data) {
    const old = $('notesRendered');
    if (old) old.remove();
    $('notesTopicBar').innerHTML = '';
    $('notesPlaceholder').style.display = '';
    showScreen('notesContentScreen');
    return;
  }

  // renderNotesContent: builds chips in #notesTopicBar + renders cards in #notesMain
  renderNotesContent(data, null);
  showScreen('notesContentScreen');
}

// ══════════════════════════════════════════════════════════════════════════════
// PRACTICE FLOW (subject-wise important questions)
// ══════════════════════════════════════════════════════════════════════════════

async function openPracticeSubject(subj) {
  currentSubject = subj;
  currentTopic   = 'all';
  quizRoute      = 'practice';
  quizSource     = 'practiceSubjectsScreen';

  let questions = await fetchQuestions({
    exam: 'uppsc-ae', subject: subj.id, type: 'practice', maxCount: 500
  });

  if (!questions || questions.length === 0) {
    toast('No practice questions for this subject yet');
    return;
  }

  Object.keys(quizAnswerMap).forEach(k => delete quizAnswerMap[k]);
  Quiz.startQuiz(questions);
  showScreen('quizScreen');
  buildTopicChips('quizTopicBar', subj.id, async topicId => {
    currentTopic = topicId;
    let qs = await fetchQuestions({ exam: 'uppsc-ae', subject: subj.id, type: 'practice', maxCount: 500 });
    if (topicId !== 'all') qs = qs.filter(q => !q.topic || q.topic === 'all' || q.topic === topicId);
    if (!qs.length) { toast('No questions for this topic yet'); return; }
    Quiz.resetToQuestions(qs);
    renderQuiz();
  });
  renderQuiz();
}

// ══════════════════════════════════════════════════════════════════════════════
// PYQ FLOW  →  Exam  →  Subject  →  Quiz
// ══════════════════════════════════════════════════════════════════════════════

function renderExamList() {
  const container = $('pyqExamList');
  container.innerHTML = '';
  EXAMS.forEach(exam => {
    const btn = document.createElement('button');
    btn.className = 'exam-card';
    btn.innerHTML = `
      <div class="exam-icon">${exam.icon}</div>
      <div class="exam-info">
        <div class="exam-name">${escapeHtml(exam.name)}</div>
        <div class="exam-state">${escapeHtml(exam.state)}</div>
      </div>
      <div class="exam-arrow">›</div>
    `;
    btn.addEventListener('click', () => openPyqExam(exam));
    container.appendChild(btn);
  });
}

function openPyqExam(exam) {
  currentExam = exam;
  $('pyqModeTitle').textContent = '📜 ' + exam.name + ' PYQ';
  showScreen('pyqModeScreen');
}

// ── PYQ Mode buttons ────────────────────────────────────────────────────────
$('pyqModeYear').addEventListener('click', () => {
  $('pyqYearsTitle').textContent = '📅 ' + currentExam.name + ' — Year-wise';
  $('pyqYearsSub').textContent   = 'Pick a year';
  renderYearList();
  showScreen('pyqYearsScreen');
});

$('pyqModeSubject').addEventListener('click', () => {
  $('pyqSubjectsTitle').textContent = currentExam.name + ' — Subject-wise';
  $('pyqSubjectsSub').textContent   = 'Pick a subject';
  renderSubjectList('pyqSubjectList', SUBJECTS_UPPSC_MAINS, openPyqSubject);
  showScreen('pyqSubjectsScreen');
});

// ── Year-wise PYQ ──────────────────────────────────────────────────────────
async function renderYearList() {
  const container = $('pyqYearList');
  container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-dim)">Loading years...</div>';

  try {
    const questions = await fetchQuestions({ exam: currentExam.id, type: 'pyq', maxCount: 1000 });
    // Extract unique years
    const years = [...new Set(questions.map(q => q.year).filter(Boolean))].sort((a,b) => b-a);

    if (!years.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><h3>No PYQ uploaded yet</h3><p>Upload questions via admin panel first.</p></div>';
      return;
    }

    container.innerHTML = '';
    years.forEach(year => {
      const count = questions.filter(q => q.year === year).length;
      const btn = document.createElement('button');
      btn.className = 'subject-card';
      btn.innerHTML = `
        <div class="subject-icon">📅</div>
        <div class="subject-info">
          <div class="subject-name">${year}</div>
          <div class="subject-desc">${currentExam.name} Paper</div>
        </div>
        <div class="subject-count">${count}Q</div>
        <div class="subject-arrow">›</div>
      `;
      btn.addEventListener('click', () => openPyqYear(year, questions.filter(q => q.year === year)));
      container.appendChild(btn);
    });
  } catch(e) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Error loading</h3><p>' + e.message + '</p></div>';
  }
}

async function openPyqYear(year, questions) {
  currentTopic = 'all';
  quizRoute    = 'pyq';
  quizSource   = 'pyqYearsScreen';

  if (!questions || !questions.length) { toast('No questions for this year'); return; }

  // Sort by subject then q_num
  questions.sort((a,b) => (a.subject||'').localeCompare(b.subject||'') || (a.q_num||0)-(b.q_num||0));

  Quiz.startQuiz(questions);
  showScreen('quizScreen');

  // Build subject chips for year-wise view (subjects as filter)
  buildYearSubjectChips(questions);
  renderQuiz();
}

function buildYearSubjectChips(allQs) {
  const bar = $('quizTopicBar');
  bar.innerHTML = '';
  const subjects = [...new Set(allQs.map(q => q.subject).filter(Boolean))];

  // Use data-topic consistently (same as buildTopicChips) to avoid conflicts
  // Value prefix 'subj:' distinguishes from regular topic IDs
  const allChip = document.createElement('button');
  allChip.className = 'topic-chip active';
  allChip.textContent = 'All Subjects';
  allChip.dataset.topic = 'subj:all';
  bar.appendChild(allChip);

  subjects.forEach(subjId => {
    const subj = SUBJECTS_UPPSC_MAINS.find(s => s.id === subjId);
    const chip = document.createElement('button');
    chip.className = 'topic-chip';
    chip.textContent = (subj?.icon || '') + ' ' + (subj?.name || subjId);
    chip.dataset.topic = 'subj:' + subjId;
    bar.appendChild(chip);
  });

  bar.querySelectorAll('.topic-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      // Only update chips inside this bar (not global selector)
      bar.querySelectorAll('.topic-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const val = chip.dataset.topic; // 'subj:all' or 'subj:fluid-mechanics' etc
      const subjId = val.replace('subj:', '');
      const filtered = subjId === 'all' ? allQs : allQs.filter(q => q.subject === subjId);
      if (!filtered.length) { toast('No questions for this subject'); return; }
      Quiz.resetToQuestions(filtered);
      renderQuiz();
    });
  });
}

async function openPyqSubject(subj) {
  currentSubject = subj;
  currentTopic   = 'all';
  quizRoute      = 'pyq';
  quizSource     = 'pyqSubjectsScreen';

  let questions = await fetchQuestions({
    exam: currentExam.id, subject: subj.id, type: 'pyq', maxCount: 500
  });

  if (!questions || questions.length === 0) {
    toast('No PYQ for this subject yet');
    return;
  }

  // Sort: latest year first
  questions.sort((a, b) => (b.year || 0) - (a.year || 0) || (a.q_num || 0) - (b.q_num || 0));

  Object.keys(quizAnswerMap).forEach(k => delete quizAnswerMap[k]);
  Quiz.startQuiz(questions);
  showScreen('quizScreen');

  buildTopicChips('quizTopicBar', subj.id, async topicId => {
    currentTopic = topicId;
    let qs = await fetchQuestions({ exam: currentExam.id, subject: subj.id, type: 'pyq', maxCount: 500 });
    if (topicId !== 'all') qs = qs.filter(q => !q.topic || q.topic === 'all' || q.topic === topicId);
    if (!qs.length) { toast('No questions for this topic yet'); return; }
    qs.sort((a, b) => (b.year || 0) - (a.year || 0) || (a.q_num || 0) - (b.q_num || 0));
    Quiz.resetToQuestions(qs);
    renderQuiz();
  });

  renderQuiz();
}

// ══════════════════════════════════════════════════════════════════════════════
// TOPIC CHIPS BUILDER
// ══════════════════════════════════════════════════════════════════════════════

function buildTopicChips(containerId, subjectId, onSelect) {
  const container = $(containerId);
  if (!container) return;
  const topics = getTopicsFor(subjectId); // always starts with {id:'all', label:'All'}

  container.innerHTML = topics.map(t =>
    `<button class="topic-chip${t.id === currentTopic ? ' active' : ''}" data-topic="${t.id}">${escapeHtml(t.label)}</button>`
  ).join('');

  container.querySelectorAll('.topic-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      // Only sync chips in same bar (avoid interfering with year-subject chips)
      const bar = chip.closest('.topic-bar-scroll');
      if (bar) bar.querySelectorAll('.topic-chip').forEach(c =>
        c.classList.toggle('active', c.dataset.topic === chip.dataset.topic)
      );
      currentTopic = chip.dataset.topic;
      if (onSelect) onSelect(currentTopic);
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// BOOKMARKS FLOW
// ══════════════════════════════════════════════════════════════════════════════

async function loadAndShowBookmarks() {
  if (!currentUser) { toast('Please sign in to view bookmarks'); return; }
  allBookmarks = await fetchBookmarkedQuestions(currentUser.uid);
  renderBookmarksList();
}

function renderBookmarksList() {
  const list    = $('bookmarksList');
  const empty   = $('bookmarksEmpty');
  const practiceBtn = $('practiceBookmarksBtn');

  list.innerHTML = '';

  if (!allBookmarks || allBookmarks.length === 0) {
    list.classList.add('hidden');
    empty.classList.remove('hidden');
    practiceBtn.classList.add('hidden');
    return;
  }

  list.classList.remove('hidden');
  empty.classList.add('hidden');
  practiceBtn.classList.remove('hidden');
  practiceBtn.textContent = `Practice all (${allBookmarks.length})`;

  allBookmarks.forEach((q, idx) => {
    const preview = q.question.length > 100 ? q.question.substring(0, 100) + '…' : q.question;
    const subjectLabel = q.subject ? q.subject.replace(/-/g, ' ') : '';
    const examLabel = q.examId ? q.examId.replace(/-/g, ' ').toUpperCase() : '';

    const card = document.createElement('button');
    card.className = 'bookmark-card';
    card.innerHTML = `
      <div class="bookmark-num">${idx + 1}</div>
      <div class="bookmark-content">
        <div class="bookmark-subject">${escapeHtml(examLabel)} · ${escapeHtml(subjectLabel)}</div>
        <div class="bookmark-text">${escapeHtml(preview)}</div>
      </div>
      <div class="bookmark-arrow">›</div>
    `;
    card.addEventListener('click', () => {
      quizSource = 'bookmarksScreen';
      quizRoute  = 'bookmarks';
      Quiz.startQuiz(allBookmarks);
      // Jump to clicked question
      for (let i = 0; i < idx; i++) Quiz.next();
      showScreen('quizScreen');
      $('quizTopicBar').innerHTML = '';
      renderQuiz();
    });
    list.appendChild(card);
  });
}

$('practiceBookmarksBtn').addEventListener('click', () => {
  if (!allBookmarks.length) { toast('No bookmarks to practice'); return; }
  quizSource = 'bookmarksScreen';
  quizRoute  = 'bookmarks';
  Quiz.startQuiz(allBookmarks);
  showScreen('quizScreen');
  $('quizTopicBar').innerHTML = '';
  renderQuiz();
});

// ══════════════════════════════════════════════════════════════════════════════
// QUIZ RENDERER
// ══════════════════════════════════════════════════════════════════════════════

// Track answered state for jump panel colours
const quizAnswerMap = {}; // index → 'correct' | 'wrong'

async function renderQuiz() {
  const q = Quiz.getCurrent();
  if (!q) {
    toast('No question to show');
    goBackFromQuiz();
    return;
  }

  const { current, total } = Quiz.getProgress();
  $('quizProgress').textContent = `${current} / ${total}`;

  // Sr No
  $('quizSrNo').textContent = `Q.${current}`;

  // Progress bar fill
  const fill = $('quizProgressFill');
  if (fill) fill.style.width = `${(current / total) * 100}%`;

  // Meta tags
  $('quizSubjectTag').textContent = q.subject
    ? q.subject.replace(/-/g, ' ').split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
    : 'General';

  $('quizYearTag').textContent = q.year ? `${q.year}` : '—';

  const examTag = $('quizExamTag');
  if (quizRoute === 'pyq' && q.examId) {
    examTag.textContent = q.examId.toUpperCase().replace(/-/g, ' ');
    examTag.classList.remove('hidden');
  } else {
    examTag.classList.add('hidden');
  }

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

  await updateBookmarkBtn(q);
}

// ── Jump Panel ─────────────────────────────────────────────────────────────
function openJumpPanel() {
  const { total } = Quiz.getProgress();
  const { current } = Quiz.getProgress();
  const grid = $('jumpGrid');
  grid.innerHTML = '';

  for (let i = 1; i <= total; i++) {
    const btn = document.createElement('button');
    btn.className = 'jump-btn';
    btn.textContent = i;
    const state = quizAnswerMap[i - 1];
    if (i === current)        btn.classList.add('current');
    else if (state === 'correct') btn.classList.add('answered');
    else if (state === 'wrong')   btn.classList.add('wrong');
    btn.addEventListener('click', () => {
      Quiz.jumpTo(i - 1);
      closeJumpPanel();
      renderQuiz();
    });
    grid.appendChild(btn);
  }
  $('jumpPanel').classList.remove('hidden');
}

function closeJumpPanel() {
  $('jumpPanel').classList.add('hidden');
}

$('quizGridBtn').addEventListener('click', openJumpPanel);
$('jumpCloseBtn').addEventListener('click', closeJumpPanel);
$('jumpPanel').addEventListener('click', e => {
  if (e.target === $('jumpPanel')) closeJumpPanel();
});

async function updateBookmarkBtn(q) {
  if (!currentUser) { $('quizBookmarkBtn').textContent = '☆'; return; }
  // attach examId to question for bookmark lookup
  const qWithExam = { ...q, examId: q.examId || (currentExam ? currentExam.id : 'uppsc-ae') };
  const marked = await isQuestionBookmarked(currentUser.uid, qWithExam);
  $('quizBookmarkBtn').textContent = marked ? '★' : '☆';
  $('quizBookmarkBtn').dataset.marked = marked ? '1' : '0';
}

function onOptionClick(index) {
  const result = Quiz.selectOption(index);
  if (!result) return;

  const q = Quiz.getCurrent();
  const { current } = Quiz.getProgress();

  // Track answer for jump panel colours
  quizAnswerMap[current - 1] = result.isCorrect ? 'correct' : 'wrong';

  document.querySelectorAll('.quiz-option').forEach((b, i) => {
    b.disabled = true;
    if (i === result.correctIndex) b.classList.add('correct');
    if (i === index && !result.isCorrect) b.classList.add('wrong');
  });

  if (q.explanation) {
    $('quizExplanationText').textContent = q.explanation;
    $('quizExplanation').classList.remove('hidden');
  }

  if (currentUser) {
    const examId = q.examId || (currentExam ? currentExam.id : 'uppsc-ae');
    saveAttempt(currentUser.uid, examId, q.id, index, result.isCorrect);
  }
}

$('quizNextBtn').addEventListener('click', () => {
  if (Quiz.next()) {
    renderQuiz();
  } else {
    toast('Quiz complete! 🎉');
    setTimeout(goBackFromQuiz, 800);
  }
});

$('quizPrevBtn').addEventListener('click', () => {
  if (Quiz.prev()) renderQuiz();
});

$('quizBackBtn').addEventListener('click', goBackFromQuiz);

function goBackFromQuiz() {
  showScreen(quizSource || 'homeScreen');
}

$('quizBookmarkBtn').addEventListener('click', async () => {
  const q = Quiz.getCurrent();
  if (!q || !currentUser) { toast('Sign in to bookmark'); return; }
  if (!q.id) { toast('Cannot bookmark this question'); return; }

  const qWithExam = { ...q, examId: q.examId || (currentExam ? currentExam.id : 'uppsc-ae') };
  const marked = $('quizBookmarkBtn').dataset.marked === '1';

  if (marked) {
    const ok = await removeBookmark(currentUser.uid, qWithExam);
    if (ok) {
      $('quizBookmarkBtn').textContent = '☆';
      $('quizBookmarkBtn').dataset.marked = '0';
      allBookmarks = allBookmarks.filter(b => b.id !== q.id);
      toast('Removed from bookmarks');
    } else { toast('Failed to remove bookmark'); }
  } else {
    const ok = await addBookmark(currentUser.uid, qWithExam);
    if (ok) {
      $('quizBookmarkBtn').textContent = '★';
      $('quizBookmarkBtn').dataset.marked = '1';
      allBookmarks.unshift(qWithExam);
      toast('Bookmarked ★');
    } else { toast('Failed to bookmark'); }
  }
});
