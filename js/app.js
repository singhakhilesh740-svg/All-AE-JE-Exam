// app.js — v10 Orchestrator
// Flow: Login → Home → [Notes | Practice | PYQ | Bookmarks]
//   Notes:    Home → notesSubjectsScreen → notesContentScreen (topic chips)
//   Practice: Home → practiceSubjectsScreen → quizScreen (topic chips)
//   PYQ:      Home → pyqExamsScreen → pyqSubjectsScreen → quizScreen (topic chips)
//   Bookmarks:Home → bookmarksScreen → quizScreen

import { watchAuth, loginWithGoogle, loginWithEmail, loginWithMobile, registerWithEmail, linkGoogleToCurrentUser, sendPasswordResetLink, logout, saveUserProfile } from './auth.js';
import {
  fetchQuestions,
  fetchPracticeQuestions,
  applyPyqFreeCap,
  saveAttempt,
  addBookmark,
  removeBookmark,
  isQuestionBookmarked,
  fetchBookmarkedQuestions
} from './db.js';
import { isPremiumUser, getPremiumExpiry, openPayment, PLANS } from './payment.js';
import * as Quiz from './quiz.js';
import { EXAMS, getExamById } from './exams.js';
import { SUBJECTS_UPPSC_MAINS, getTopicsFor } from './subjects.js';
import { renderNotesContent, loadNotesForSubject } from './notes.js';
import { loadGSNotes, loadHindiNotes, renderGSNotesContent, getSubSubjects, getSubSubjectData } from './gs-notes.js';

// ── State ──────────────────────────────────────────────────────────────────
let currentUser         = null;
let currentSubject      = null;    // selected subject object
let currentTopic        = 'all';   // active topic chip
let currentExam         = null;    // selected exam (PYQ)
let allBookmarks        = [];
let quizSource          = 'home';  // where to go back from quiz
let quizRoute           = null;    // 'practice' | 'pyq' | 'bookmarks'

// ── Premium state ──────────────────────────────────────────────────────────
let _isPremium          = false;   // cached premium flag
let _subBackTarget      = 'homeScreen'; // where sub screen goes back to

async function refreshPremiumStatus() {
  if (!currentUser) { _isPremium = false; return false; }
  _isPremium = await isPremiumUser(currentUser.uid);
  updatePremiumUI();
  return _isPremium;
}

function updatePremiumUI() {
  const badge = $('premiumBadge');
  const lockBadge = $('bookmarkLockBadge');
  if (badge)     badge.classList.toggle('hidden', !_isPremium);
  if (lockBadge) lockBadge.classList.toggle('hidden', _isPremium);
  // Show/hide upgrade button
  const upgradeBtn = $('headerUpgradeBtn');
  if (_isPremium) {
    if (upgradeBtn) upgradeBtn.style.display = 'none';
  } else {
    // Inject on next tick so home screen DOM is ready
    setTimeout(injectUpgradeBtn, 100);
  }
}

// ── General Studies Subjects ───────────────────────────────────────────────
// Sub-subject definitions for each GS subject
const GS_SUB_SUBJECTS = {
  'history': [
    { id: 'ancient',          icon: '🏺', name: 'Ancient India',          description: 'Prehistoric, Indus Valley, Vedic, Maurya, Gupta' },
    { id: 'medieval',         icon: '🏰', name: 'Medieval India',          description: 'Delhi Sultanate, Vijayanagara, Mughal, Bhakti-Sufi' },
    { id: 'modern',           icon: '🏛️', name: 'Modern India',            description: 'European arrival, British rule, Social reforms, 1857' },
    { id: 'freedom',          icon: '🇮🇳', name: 'Freedom Struggle',        description: 'Moderates, Extremists, Gandhi era, Quit India, INA' },
    { id: 'post-independence',icon: '🗺️', name: 'Post-Independence',        description: 'Integration, Constitution, Wars, Five Year Plans' },
    { id: 'culture',          icon: '🎭', name: 'Art & Culture',           description: 'Architecture, Painting, Dance, Music, Literature' },
  ],
  'polity': [
    { id: 'constitution',     icon: '📜', name: 'Constitution',            description: 'Making, Preamble, Schedules, Features borrowed' },
    { id: 'fundamental-rights', icon: '⚖️', name: 'Fundamental Rights',   description: 'Articles 12-35, Writs, Restrictions' },
    { id: 'dpsp',             icon: '📋', name: 'DPSP & Duties',           description: 'Directive Principles, Fundamental Duties' },
    { id: 'parliament',       icon: '🏛️', name: 'Parliament',              description: 'Lok Sabha, Rajya Sabha, Sessions, Bills' },
    { id: 'executive',        icon: '👤', name: 'Executive',               description: 'President, PM, Council of Ministers, Governor' },
    { id: 'judiciary',        icon: '⚔️', name: 'Judiciary',              description: 'Supreme Court, High Courts, Writs, Doctrines' },
    { id: 'federalism',       icon: '🗺️', name: 'Federalism',              description: 'Centre-State, Three Lists, Finance Commission' },
    { id: 'elections',        icon: '🗳️', name: 'Elections & Bodies',      description: 'ECI, CAG, UPSC, Constitutional Commissions' },
    { id: 'amendments',       icon: '✏️', name: 'Amendments',              description: 'Key amendments 1st to 105th' },
    { id: 'emergency',        icon: '🚨', name: 'Emergency Provisions',    description: 'National, President Rule, Financial Emergency' },
  ],
  'geography': [
    { id: 'physical',         icon: '⛰️', name: 'Physical Features',       description: 'Mountains, Plateaus, Plains, Passes' },
    { id: 'climate',          icon: '🌦️', name: 'Climate',                 description: 'Monsoon, Climate zones, El Nino, Seasons' },
    { id: 'rivers',           icon: '🌊', name: 'Rivers & Drainage',       description: 'Himalayan rivers, Peninsular rivers, Lakes' },
    { id: 'soils',            icon: '🌱', name: 'Soils & Vegetation',      description: 'Soil types, Natural vegetation zones' },
    { id: 'resources',        icon: '⛏️', name: 'Natural Resources',       description: 'Minerals, Energy, Forest resources' },
    { id: 'agriculture',      icon: '🌾', name: 'Agriculture',             description: 'Crops, Seasons, Revolutions, MSP' },
    { id: 'industry',         icon: '🏭', name: 'Industry',                description: 'Major industries, Industrial corridors' },
    { id: 'population',       icon: '👥', name: 'Population & Census',     description: 'Census 2011, Density, Sex ratio, Literacy' },
    { id: 'world',            icon: '🌍', name: 'World Geography',         description: 'Continents, Oceans, International boundaries' },
  ],
  'general-science': [
    { id: 'physics',          icon: '⚡', name: 'Physics',                 description: 'Laws of motion, Light, Electricity, Sound' },
    { id: 'chemistry',        icon: '🧪', name: 'Chemistry',               description: 'Periodic table, Acids-Bases, Compounds' },
    { id: 'biology',          icon: '🧬', name: 'Biology',                 description: 'Cell, Human body, Classification, Plants' },
    { id: 'technology',       icon: '🚀', name: 'Science & Technology',    description: 'ISRO missions, Inventions, Defence' },
    { id: 'health',           icon: '🏥', name: 'Health & Disease',        description: 'Vitamins, Deficiencies, Communicable diseases' },
    { id: 'space',            icon: '🌌', name: 'Space Science',           description: 'Solar system, Planets, Space missions' },
  ],
};

const GS_SUBJECTS = [
  { id: 'polity',          icon: '⚖️',  name: 'Polity',           description: 'Constitution, Parliament, Judiciary, Elections' },
  { id: 'geography',       icon: '🗺️',  name: 'Geography',        description: 'Physical, Climate, Rivers, Resources, World' },
  { id: 'history',         icon: '🏛️',  name: 'History',          description: 'Ancient, Medieval, Modern, Freedom Struggle, Culture' },
  { id: 'general-science', icon: '🔬',  name: 'General Science',  description: 'Physics, Chemistry, Biology, Technology, Health' },
];

// ── Hindi Subjects ─────────────────────────────────────────────────────────
const HINDI_SUBJECTS = [
  { id: 'hindi-grammar',  icon: '📝', name: 'Hindi Grammar (व्याकरण)',  description: 'वर्णमाला · संधि · समास · कारक · काल · अलंकार · रस' },
  { id: 'hindi-sahitya',  icon: '📚', name: 'Hindi Literature (साहित्य)', description: 'भक्तिकाल · रीतिकाल · आधुनिककाल · कवि · उपन्यास' },
];

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
    console.log('[Auth] watchAuth fired, isNew:', user.isNew, 'uid:', user.uid);
    if (user.isNew) {
      // No profile in Firestore — stay on login screen, show message
      console.log('[Auth] No profile found, staying on login');
      authMsg('⚠️ Account not found. Please register first.', '#ef4444');
      showAuthStep('authChoice');
      await logout();
      return;
    }
    currentUser = user;
    $('userName').textContent = user.name.split(' ')[0];
    if (user.photo) $('userAvatar').src = user.photo;
    await refreshPremiumStatus();
    showScreen('homeScreen');
  },
  () => {
    currentUser = null;
    showScreen('loginScreen');
  }
);

// ── Auth UI helpers ────────────────────────────────────────────────────────
function authMsg(msg, color='#f59e0b') {
  const el = $('authMsg');
  if (!el) return;
  el.textContent = msg;
  el.style.color = color;
}
function showAuthStep(stepId) {
  ['authChoice','loginOptions','loginEmailStep','loginMobileStep',
   'regStep1','forgotStep','linkGoogleStep'].forEach(id => {
    const el = $(id);
    if (el) el.style.display = (id === stepId) ? 'block' : 'none';
  });
  authMsg('');
}

let _regData = {}; // temporary store during registration

// ── Safely attach click with null check ────────────────────────────────────
function on(id, fn) {
  const el = $(id);
  if (el) el.addEventListener('click', fn);
}

// ── Choice buttons ───────────────────────────────────────────────────────
on('goLoginBtn',         () => showAuthStep('loginOptions'));
on('goRegisterBtn',      () => showAuthStep('regStep1'));
on('backToChoice1',      () => showAuthStep('authChoice'));
on('backToChoice2',      () => showAuthStep('authChoice'));
on('backToLoginOptions1',() => showAuthStep('loginOptions'));
on('backToLoginOptions2',() => showAuthStep('loginOptions'));

// ── Google Login ──────────────────────────────────────────────────────────
on('googleLoginBtn', async () => {
  authMsg('Signing in with Google…');
  try {
    await loginWithGoogle();
    // watchAuth handles navigation
  } catch(e) {
    if (e.message === 'NOT_REGISTERED') {
      authMsg('⚠️ This Google account is not registered. Please register first.', '#ef4444');
      showAuthStep('loginOptions');
    } else if (e.message && e.message.startsWith('LINK_REQUIRED:')) {
      // Same email exists under email+password — ask for password to link
      const email = e.message.split('LINK_REQUIRED:')[1];
      showLinkGooglePrompt(email);
    } else {
      authMsg('Login failed: ' + e.message, '#ef4444');
      showAuthStep('loginOptions');
    }
  }
});

// ── Link Google Prompt ────────────────────────────────────────────────────
// Shown when user tries Google login but same email is registered with password
function showLinkGooglePrompt(email) {
  showAuthStep('linkGoogleStep');
  $('linkGoogleEmail').textContent = email;
  $('linkGooglePasswordInput').value = '';
  authMsg('');
}

on('linkGoogleConfirmBtn', async () => {
  const email    = $('linkGoogleEmail').textContent.trim();
  const password = $('linkGooglePasswordInput').value;
  if (!password) { authMsg('Enter your password to continue', '#ef4444'); return; }
  authMsg('Verifying password…');
  try {
    // Step 1: Login with email+password
    await loginWithEmail(email, password);
    authMsg('Linking Google account…');
    // Step 2: Link Google to this account
    await linkGoogleToCurrentUser();
    authMsg('✅ Google linked! You can now login with either method.', '#10b981');
    // watchAuth fires and shows homeScreen
  } catch(e) {
    if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
      authMsg('⚠️ Incorrect password.', '#ef4444');
    } else if (e.code === 'auth/credential-already-in-use') {
      // Google account already linked to another account — just log in normally
      authMsg('Logging in…');
      try { await loginWithGoogle(); } catch(e2) { authMsg('Login failed: ' + e2.message, '#ef4444'); }
    } else {
      authMsg('Failed: ' + e.message, '#ef4444');
    }
  }
});

on('backFromLinkGoogle', () => showAuthStep('loginOptions'));

// ── Email login button → show email step ──────────────────────────────────
on('loginEmailBtn', () => showAuthStep('loginEmailStep'));

// ── Email + Password Login ────────────────────────────────────────────────
on('loginEmailBtn2', async () => {
  const email    = $('loginEmailInput').value.trim();
  const password = $('loginPasswordInput').value;
  if (!email)    { authMsg('Enter your email ID', '#ef4444'); return; }
  if (!password) { authMsg('Enter your password', '#ef4444'); return; }
  authMsg('Logging in…');
  try {
    await loginWithEmail(email, password);
    // watchAuth fires and shows homeScreen
  } catch(e) {
    if (e.message === 'NOT_REGISTERED') {
      authMsg('⚠️ Email not registered. Please register first.', '#ef4444');
    } else if (e.code === 'auth/user-not-found') {
      authMsg('⚠️ Email not registered. Please register first.', '#ef4444');
    } else if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
      authMsg('⚠️ Incorrect password. Use Forgot Password to reset.', '#ef4444');
    } else if (e.code === 'auth/too-many-requests') {
      authMsg('⚠️ Too many attempts. Please wait a few minutes.', '#ef4444');
    } else if (e.code === 'auth/invalid-email') {
      authMsg('⚠️ Invalid email format.', '#ef4444');
    } else {
      authMsg('Login failed: ' + e.message, '#ef4444');
    }
  }
});

// ── Mobile login button → show mobile step ────────────────────────────────
on('loginMobileBtn', () => showAuthStep('loginMobileStep'));

// ── Forgot Password ────────────────────────────────────────────────────────
on('forgotPasswordLink', () => {
  showAuthStep('forgotStep');
  const box = $('forgotSuccessBox');
  if (box) box.style.display = 'none';
  const inp = $('forgotEmailInput');
  // Pre-fill with whatever was typed in email login
  if (inp) inp.value = ($('loginEmailInput')?.value || '');
  authMsg('');
});

on('backFromForgot', () => showAuthStep('loginEmailStep'));

on('forgotSendBtn', async () => {
  const email = $('forgotEmailInput').value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    authMsg('Enter a valid email ID', '#ef4444'); return;
  }
  authMsg('Sending reset link…');
  const btn = $('forgotSendBtn');
  btn.disabled = true;

  try {
    await sendPasswordResetLink(email);
    authMsg('');
    const box = $('forgotSuccessBox');
    if (box) box.style.display = 'block';
    btn.textContent = '✓ Link Sent';
  } catch(e) {
    btn.disabled = false;
    if (e.message === 'NOT_REGISTERED') {
      authMsg('⚠️ This email is not registered. Please register first.', '#ef4444');
    } else {
      authMsg('Failed to send: ' + e.message, '#ef4444');
    }
  }
});


// ── Mobile + Password Login ───────────────────────────────────────────────
on('loginMobileBtn2', async () => {
  const mobile   = $('loginMobileInput').value.trim();
  const password = $('loginMobilePasswordInput').value;
  if (!/^\d{10}$/.test(mobile)) { authMsg('Enter valid 10-digit mobile number', '#ef4444'); return; }
  if (!password) { authMsg('Enter your password', '#ef4444'); return; }
  authMsg('Logging in…');
  try {
    await loginWithMobile(mobile, password);
    // watchAuth handles navigation
  } catch(e) {
    if (e.message === 'MOBILE_NOT_FOUND') {
      authMsg('⚠️ Mobile number not registered. Please register first.', '#ef4444');
    } else if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
      authMsg('⚠️ Incorrect password. Try again.', '#ef4444');
    } else if (e.code === 'auth/too-many-requests') {
      authMsg('⚠️ Too many attempts. Please wait and try again.', '#ef4444');
    } else {
      authMsg('Login failed: ' + e.message, '#ef4444');
    }
  }
});

// ── Registration: Name + Mobile + Email + Password ────────────────────────
on('regSubmitBtn', async () => {
  const name            = $('regName').value.trim();
  const mobile          = $('regMobile').value.trim();
  const email           = $('regEmail').value.trim();
  const password        = $('regPassword').value;
  const confirmPassword = $('regConfirmPassword').value;

  // Validations
  if (!name)   { authMsg('Please enter your full name', '#ef4444'); return; }
  if (!/^\d{10}$/.test(mobile)) { authMsg('Enter valid 10-digit mobile number', '#ef4444'); return; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    authMsg('Please enter a valid email ID', '#ef4444'); return;
  }
  if (password.length < 6) { authMsg('Password must be at least 6 characters', '#ef4444'); return; }
  if (password !== confirmPassword) { authMsg('Passwords do not match', '#ef4444'); return; }

  authMsg('Creating account…');
  try {
    await registerWithEmail({ name, email, mobile, password });
    authMsg('Registration complete! 🎉', '#10b981');
    // watchAuth fires automatically and shows homeScreen
  } catch(e) {
    if (e.message === 'EMAIL_TAKEN') {
      authMsg('⚠️ This email is already registered. Please login.', '#ef4444');
    } else if (e.message === 'MOBILE_TAKEN') {
      authMsg('⚠️ This mobile number is already registered.', '#ef4444');
    } else if (e.code === 'auth/email-already-in-use') {
      authMsg('⚠️ This email is already in use. Please login.', '#ef4444');
    } else if (e.code === 'auth/weak-password') {
      authMsg('⚠️ Password too weak. Use at least 6 characters.', '#ef4444');
    } else {
      authMsg('Registration failed: ' + e.message, '#ef4444');
    }
  }
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

// ── GS tile ────────────────────────────────────────────────────────────────
$('homeGS').addEventListener('click', () => {
  renderGSSubjectList('gsSubjectList', GS_SUBJECTS, openGSSubject);
  showScreen('gsSubjectsScreen');
});

// ── Hindi tile ─────────────────────────────────────────────────────────────
$('homeHindi').addEventListener('click', () => {
  renderGSSubjectList('hindiSubjectList', HINDI_SUBJECTS, openHindiSubject);
  showScreen('hindiSubjectsScreen');
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

  let questions = await fetchPracticeQuestions({ subject: subj.id, maxCount: 10000 });

  if (!questions || questions.length === 0) {
    toast('No practice questions for this subject yet');
    return;
  }

  Object.keys(quizAnswerMap).forEach(k => delete quizAnswerMap[k]);
  Quiz.startQuiz(questions);
  showScreen('quizScreen');
  buildTopicChips('quizTopicBar', subj.id, async topicId => {
    currentTopic = topicId;
    let qs = await fetchPracticeQuestions({ subject: subj.id, maxCount: 10000 });
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
  $('pyqModeTitle').textContent = '📜 ' + exam.name;
  showScreen('pyqModeScreen');
}

// ── PYQ Mode buttons ────────────────────────────────────────────────────────
$('pyqModeYear').addEventListener('click', () => {
  $('pyqYearsTitle').textContent = '📅 ' + currentExam.name + ' — Exam & Year-wise';
  $('pyqYearsSub').textContent   = 'Pick an exam paper';
  renderYearList();
  showScreen('pyqYearsScreen');
});

$('pyqModeSubject').addEventListener('click', () => {
  $('pyqSubjectsTitle').textContent = currentExam.name + ' — Subject-wise';
  $('pyqSubjectsSub').textContent   = 'Pick a subject';
  renderSubjectList('pyqSubjectList', SUBJECTS_UPPSC_MAINS, openPyqSubject);
  showScreen('pyqSubjectsScreen');
});

// ── Exam & Year-wise PYQ ───────────────────────────────────────────────────
async function renderYearList() {
  const container = $('pyqYearList');
  container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-dim)">Loading...</div>';

  try {
    const questions = await fetchQuestions({ exam: currentExam.id, type: 'pyq', maxCount: 10000 });

    if (!questions.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><h3>No PYQ uploaded yet</h3><p>Upload questions via admin panel first.</p></div>';
      return;
    }

    // Group by exam_name + year (for exams with multiple papers/codes per year)
    const groups = {};
    questions.forEach(q => {
      const examLabel = q.exam_name || q.exam_code || `${currentExam.name} ${q.year}`;
      const key = `${q.year}__${examLabel}`;
      if (!groups[key]) {
        groups[key] = {
          examLabel,
          year: q.year || '—',
          exam_code: q.exam_code || '',
          exam_date: q.exam_date || '',
          questions: []
        };
      }
      groups[key].questions.push(q);
    });

    // Sort: latest year first, then by exam_name alphabetically
    const sorted = Object.values(groups).sort((a, b) =>
      (b.year || 0) - (a.year || 0) || a.examLabel.localeCompare(b.examLabel)
    );

    container.innerHTML = '';
    sorted.forEach(g => {
      const dateStr = g.exam_date
        ? new Date(g.exam_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : g.year;
      const codeTag = g.exam_code ? ` · ${g.exam_code}` : '';

      const btn = document.createElement('button');
      btn.className = 'subject-card';
      btn.innerHTML = `
        <div class="subject-icon">📅</div>
        <div class="subject-info">
          <div class="subject-name">${escapeHtml(g.examLabel)}</div>
          <div class="subject-desc">${dateStr}${escapeHtml(codeTag)}</div>
        </div>
        <div class="subject-count">${g.questions.length}Q</div>
        <div class="subject-arrow">›</div>
      `;
      btn.addEventListener('click', () => openPyqYear(g.examLabel, g.questions));
      container.appendChild(btn);
    });

  } catch(e) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Error loading</h3><p>' + e.message + '</p></div>';
  }
}

async function openPyqYear(examLabel, questions) {
  currentTopic = 'all';
  quizRoute    = 'pyq';
  quizSource   = 'pyqYearsScreen';

  if (!questions || !questions.length) { toast('No questions for this paper'); return; }

  // Sort by subject then q_num
  questions.sort((a,b) => (a.subject||'').localeCompare(b.subject||'') || (a.q_num||0)-(b.q_num||0));

  // Apply free user PYQ cap
  const capResult = applyPyqFreeCap(questions, _isPremium);
  questions = capResult.questions;

  Quiz.startQuiz(questions);
  showScreen('quizScreen');
  showPaywallBanner(capResult.isCapped, capResult.totalCount);

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
    exam: currentExam.id, subject: subj.id, type: 'pyq', maxCount: 10000
  });

  if (!questions || questions.length === 0) {
    toast('No PYQ for this subject yet');
    return;
  }

  // Sort: latest year first
  questions.sort((a, b) => (b.year || 0) - (a.year || 0) || (a.q_num || 0) - (b.q_num || 0));

  // Apply free user PYQ cap
  const capResult = applyPyqFreeCap(questions, _isPremium);
  questions = capResult.questions;

  Object.keys(quizAnswerMap).forEach(k => delete quizAnswerMap[k]);
  Quiz.startQuiz(questions);
  showScreen('quizScreen');
  showPaywallBanner(capResult.isCapped, capResult.totalCount);

  buildTopicChips('quizTopicBar', subj.id, async topicId => {
    currentTopic = topicId;
    let qs = await fetchQuestions({ exam: currentExam.id, subject: subj.id, type: 'pyq', maxCount: 10000 });
    if (topicId !== 'all') qs = qs.filter(q => !q.topic || q.topic === 'all' || q.topic === topicId);
    if (!qs.length) { toast('No questions for this topic yet'); return; }
    qs.sort((a, b) => (b.year || 0) - (a.year || 0) || (a.q_num || 0) - (b.q_num || 0));
    const cr = applyPyqFreeCap(qs, _isPremium);
    Quiz.resetToQuestions(cr.questions);
    showPaywallBanner(cr.isCapped, cr.totalCount);
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
// GS & HINDI SUBJECT LIST + NOTES FLOW
// ══════════════════════════════════════════════════════════════════════════════

function renderGSSubjectList(containerId, subjects, onSelect) {
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

// Current GS subject and sub-subject state
let _currentGSSubject = null;
let _currentGSSubId   = null;

async function openGSSubject(subj) {
  _currentGSSubject = subj;

  // Load the subject's data first
  const data = await loadGSNotes(subj.id);
  const subSubs = data ? getSubSubjects(data) : GS_SUB_SUBJECTS[subj.id];

  if (subSubs && subSubs.length) {
    // Show sub-subject list screen
    $('gsSubSubjectTitle').textContent = subj.icon + ' ' + subj.name;
    $('gsSubSubjectSub').textContent   = 'Choose a section';
    renderGSSubjectList('gsSubSubjectList', subSubs, (sub) => openGSSubSubject(subj, sub, data));
    showScreen('gsSubSubjectsScreen');
  } else if (data) {
    // No sub-subjects — render notes directly
    await _loadAndShowGSNotes(subj.id, subj.icon + ' ' + subj.name, 'gsSubjectsScreen', null, data);
  } else {
    toast('Notes not available yet');
  }
}

async function openGSSubSubject(parentSubj, sub, preloadedData) {
  _currentGSSubId = sub.id;
  await _loadAndShowGSNotes(
    parentSubj.id,
    sub.icon + ' ' + sub.name,
    'gsSubSubjectsScreen',
    sub.id,
    preloadedData
  );
}

async function _loadAndShowGSNotes(subjectId, title, backScreen, subSubjectId, preloadedData) {
  $('gsNotesTitle').textContent = title;
  $('gsNotesSub').textContent   = 'Topic-wise detailed notes';
  $('gsPlaceholder').style.display = 'block';
  $('gsPlaceholder').querySelector('h3').textContent = 'Loading…';

  const oldEl = document.getElementById('gsNotesMain-rendered');
  if (oldEl) oldEl.remove();
  $('gsTopicBar').innerHTML = '';

  // Wire back button dynamically
  const backBtn = $('gsNotesBackBtn');
  if (backBtn) backBtn.onclick = () => showScreen(backScreen);

  showScreen('gsNotesScreen');

  // Load full data if not preloaded
  const fullData = preloadedData || await loadGSNotes(subjectId);
  if (!fullData) {
    $('gsPlaceholder').querySelector('h3').textContent = 'Notes coming soon';
    return;
  }

  // If sub-subject requested, get that slice of data
  let notesData = fullData;
  if (subSubjectId) {
    const sub = getSubSubjectData(fullData, subSubjectId);
    if (sub) notesData = sub;
  }

  $('gsPlaceholder').style.display = 'none';
  renderGSNotesContent(notesData, 'gsNotesMain', 'gsTopicBar', 'gsPlaceholder');
}

async function openHindiSubject(subj) {
  $('hindiNotesTitle').textContent = subj.icon + ' ' + subj.name;
  $('hindiNotesSub').textContent   = 'Topic-wise notes';
  $('hindiPlaceholder').style.display = 'block';
  $('hindiPlaceholder').querySelector('h3').textContent = 'Loading…';

  const old = document.getElementById('hindiNotesMain-rendered');
  if (old) old.remove();
  $('hindiTopicBar').innerHTML = '';

  showScreen('hindiNotesScreen');

  const data = await loadHindiNotes(subj.id);
  if (!data) {
    $('hindiPlaceholder').querySelector('h3').textContent = 'Notes coming soon';
    return;
  }
  $('hindiPlaceholder').style.display = 'none';
  renderGSNotesContent(data, 'hindiNotesMain', 'hindiTopicBar', 'hindiPlaceholder');
}

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
  if (quizRoute === 'pyq') {
    // exam_name from question data, fallback to currentExam name
    const examLabel = q.exam_name
      || (currentExam ? (currentExam.fullName || currentExam.name) : null)
      || null;
    if (examLabel) {
      examTag.textContent = examLabel;
      examTag.classList.remove('hidden');
    } else {
      examTag.classList.add('hidden');
    }
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
  const qWithExam = { ...q, examId: q.examId || (currentExam ? currentExam.id : 'practice') };
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
    const examId = q.examId || (currentExam ? currentExam.id : 'practice');
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
  hidePaywallBanner();
  showScreen(quizSource || 'homeScreen');
}

$('quizBookmarkBtn').addEventListener('click', async () => {
  const q = Quiz.getCurrent();
  if (!q || !currentUser) { toast('Sign in to bookmark'); return; }
  if (!q.id) { toast('Cannot bookmark this question'); return; }

  const qWithExam = { ...q, examId: q.examId || (currentExam ? currentExam.id : 'practice') };
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


// ══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION SCREEN
// ══════════════════════════════════════════════════════════════════════════════

function showSubscriptionScreen() {
  showScreen('subscriptionScreen');
  renderSubscriptionStatus();
}

async function renderSubscriptionStatus() {
  const msg = $('subMsg');
  if (!msg) return;
  if (_isPremium) {
    const expiry = await getPremiumExpiry(currentUser?.uid);
    if (expiry) {
      const dateStr = expiry.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
      msg.style.color = '#22c55e';
      msg.textContent = `✅ You are Premium — active until ${dateStr}`;
    }
  } else {
    msg.style.color = '#94a3b8';
    msg.textContent = '';
  }
}

// Back button for subscription screen
$('subBackBtn').addEventListener('click', () => {
  showScreen(_subBackTarget || 'homeScreen');
});

// Plan subscribe buttons
document.querySelectorAll('.sub-plan-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!currentUser) { toast('Please sign in first'); return; }
    const planId = btn.dataset.plan;
    const msg = $('subMsg');
    msg.style.color = '#f59e0b';
    msg.textContent = 'Opening payment…';

    openPayment({
      uid: currentUser.uid,
      name: currentUser.name,
      email: currentUser.email,
      mobile: currentUser.mobile,
      planId,
      onSuccess: async ({ expiry, paymentId, planId }) => {
        await refreshPremiumStatus();
        const plan = PLANS[planId];
        const dateStr = expiry
          ? expiry.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
          : '';
        msg.style.color = '#22c55e';
        msg.textContent = `✅ Payment successful! Premium active${dateStr ? ' until ' + dateStr : ''}.`;
        toast('🎉 Welcome to Premium!', 3000);
      },
      onFailure: (reason) => {
        msg.style.color = '#ef4444';
        msg.textContent = '❌ ' + (reason || 'Payment failed. Please try again.');
      }
    });
  });
});

// ── Upgrade link from home (add to header) ────────────────────────────────

// Show "Upgrade" button in home header for free users
function injectUpgradeBtn() {
  const headerRight = document.querySelector('#homeScreen .header-right');
  if (!headerRight || $('headerUpgradeBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'headerUpgradeBtn';
  btn.className = 'btn-icon';
  btn.title = 'Go Premium';
  btn.style.cssText = 'font-size:11px;font-weight:700;color:#f59e0b;padding:4px 8px;border:1px solid #f59e0b;border-radius:8px;background:transparent;cursor:pointer;margin-right:4px;';
  btn.textContent = '⭐ Upgrade';
  btn.addEventListener('click', () => {
    _subBackTarget = 'homeScreen';
    showSubscriptionScreen();
  });
  headerRight.insertBefore(btn, headerRight.firstChild);
}

// ══════════════════════════════════════════════════════════════════════════════
// PAYWALL BANNER
// ══════════════════════════════════════════════════════════════════════════════

function showPaywallBanner(isCapped, totalCount) {
  const banner = $('paywallBanner');
  if (!banner) return;
  if (!isCapped) { banner.classList.add('hidden'); return; }
  // Update text with total count
  const textEl = banner.querySelector('.paywall-text span');
  if (textEl && totalCount) {
    textEl.textContent = `You've seen the 10 free PYQ questions (${totalCount} total). Upgrade to unlock all.`;
  }
  banner.classList.remove('hidden');
}

function hidePaywallBanner() {
  const banner = $('paywallBanner');
  if (banner) banner.classList.add('hidden');
}

$('paywallUpgradeBtn').addEventListener('click', () => {
  _subBackTarget = 'quizScreen';
  showSubscriptionScreen();
});

// ── Post-login: inject upgrade button and show lock badge ─────────────────
// Called after refreshPremiumStatus in watchAuth
(function patchUpdatePremiumUI_withUpgradeBtn() {
  const orig = updatePremiumUI;
  // We already call updatePremiumUI from refreshPremiumStatus —
  // also inject the upgrade button
  window.__updatePremiumUIFull = function() {
    orig();
    const upgradeBtn = $('headerUpgradeBtn');
    if (_isPremium) {
      if (upgradeBtn) upgradeBtn.style.display = 'none';
    } else {
      injectUpgradeBtn();
    }
  };
})();

// Override refreshPremiumStatus to also call full UI update
const _origRefresh = refreshPremiumStatus;
// Re-assign is not possible for let in module scope; patch watchAuth flow via:
// After watchAuth fires and refreshPremiumStatus resolves, call the upgrade btn logic
// This is handled by calling injectUpgradeBtn() from updatePremiumUI directly:

// ── Password show/hide toggle ──────────────────────────────────────────────
document.querySelectorAll('.toggle-pw').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      btn.textContent = '🙈';
    } else {
      input.type = 'password';
      btn.textContent = '👁';
    }
  });
});
