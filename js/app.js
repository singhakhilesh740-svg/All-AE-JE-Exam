// app.js — Main app orchestrator. Wires UI to auth/db/quiz modules.
import { watchAuth, loginWithGoogle, logout } from './auth.js';
import { fetchQuestions, saveUserProfile, saveAttempt, toggleBookmark as dbToggleBookmark } from './db.js';
import * as Quiz from './quiz.js';
import { SUBJECTS, getSubjectById } from './subjects.js';

// ========== State ==========
let currentUser = null;

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
    showScreen('homeScreen');
    loadHomeData();
  },
  () => {
    currentUser = null;
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

// ========== Home screen ==========
async function loadHomeData() {
  // Just pre-warm the cache, but show count of all available
  const questions = await fetchQuestions({ maxCount: 200 });
  $('qCount').textContent = questions.length || '0';
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
    // For now, fetch all questions for these
    const questions = await fetchQuestions({ maxCount: 100 });
    if (questions.length === 0) {
      toast('No questions available yet');
      return;
    }
    Quiz.startQuiz(questions);
    showScreen('quizScreen');
    renderQuiz();
  } else {
    toast('Coming soon');
  }
}

// ========== Subjects screen ==========
function renderSubjectsList() {
  const container = $('subjectsList');
  container.innerHTML = '';

  SUBJECTS.forEach(subject => {
    const btn = document.createElement('button');
    btn.className = 'subject-card';
    btn.innerHTML = `
      <div class="subject-icon">${subject.icon}</div>
      <div class="subject-info">
        <div class="subject-name">${subject.name}</div>
        <div class="subject-desc">${subject.description}</div>
      </div>
      <div class="subject-arrow">›</div>
    `;
    btn.addEventListener('click', () => openSubject(subject.id));
    container.appendChild(btn);
  });
}

async function openSubject(subjectId) {
  toast('Loading questions...');
  const questions = await fetchQuestions({ subject: subjectId, maxCount: 100 });

  if (questions.length === 0) {
    const subj = getSubjectById(subjectId);
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

// ========== Quiz screen ==========
function renderQuiz() {
  const q = Quiz.getCurrent();
  if (!q) {
    toast('No question to show');
    showScreen('homeScreen');
    return;
  }

  const { current, total } = Quiz.getProgress();
  $('quizProgress').textContent = `${current} / ${total}`;

  // Show subject name (look up friendly name)
  const subjData = getSubjectById(q.subject);
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

  $('quizBookmarkBtn').textContent = Quiz.isBookmarked(q.id) ? '★' : '☆';
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

  if (currentUser) {
    saveAttempt(currentUser.uid, q.id, index, result.isCorrect);
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
  // Go back to subjects list (smarter than home)
  showScreen('subjectsScreen');
});

$('quizBookmarkBtn').addEventListener('click', () => {
  const q = Quiz.getCurrent();
  if (!q) return;
  const isNow = Quiz.toggleBookmark(q.id);
  $('quizBookmarkBtn').textContent = isNow ? '★' : '☆';
  toast(isNow ? 'Bookmarked' : 'Removed');
  if (currentUser && isNow) {
    dbToggleBookmark(currentUser.uid, q.id, true);
  }
});

// ========== Helpers ==========
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
