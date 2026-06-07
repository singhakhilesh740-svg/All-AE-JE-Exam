// app.js — v12
// Flow:
//   Login → Home → [AE/JE Civil | PCB | Non-Tech]
//   AE/JE Civil  → Notes | Practice | PYQ | Bookmarks
//   PCB          → Notes | Practice | PYQ | Bookmarks
//   Non-Tech     → GS | Hindi | Practice | PYQ

import { watchAuth, logout, sendOTP, verifyOTP, saveUserProfile, getUserProfile, loginWithGoogle } from './auth.js';
import {
  fetchQuestions,
  fetchPracticeQuestions,
  saveAttempt,
  addBookmark,
  removeBookmark,
  isQuestionBookmarked,
  fetchBookmarkedQuestions,
  submitQuestionReport,
  startSessionTracker,
} from './db.js';
import * as Quiz from './quiz.js';
import { EXAMS, getAllExams, getExamById, loadDynamicExams } from './exams.js';
import { db } from './firebase-config.js';
import {
  collection, getDocs, orderBy, query, limit, where, doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initNotifications } from './notifications.js';
import { SUBJECTS_UPPSC_MAINS, getTopicsFor } from './subjects.js';
import { renderNotesContent, loadNotesForSubject } from './notes.js';
import { SUBJECTS_PCB_NOTES, loadPCBUnit, renderPCBNotesContent } from './pcb-notes.js';
import { loadGSNotes, loadHindiNotes, renderGSNotesContent, getSubSubjects, getSubSubjectData } from './gs-notes.js';

// ── State ──────────────────────────────────────────────────────────────────
let currentUser     = null;
let currentSubject  = null;
let currentTopic    = 'all';
let currentExam     = null;
let allBookmarks    = [];
let quizSource      = 'homeScreen';
let quizRoute       = null;
// Which category section we're in: 'civil' | 'pcb' | 'nontech'
let activeSection   = 'civil';

// Non-tech subject IDs — used to filter GS/Hindi PYQ questions
const NONTECH_SUBJECT_IDS = [
  'polity','history','geography','general-science','economy',
  'current-affairs','environment','hindi-grammar','hindi-sahitya',
  'reasoning','quantitative-aptitude','english'
];

// ── GS Subjects & Sub-subjects ─────────────────────────────────────────────
const GS_SUB_SUBJECTS = {
  'history': [
    { id: 'ancient',           icon: '🏺', name: 'Ancient India',        description: 'Prehistoric, Indus Valley, Vedic, Maurya, Gupta' },
    { id: 'medieval',          icon: '🏰', name: 'Medieval India',        description: 'Delhi Sultanate, Vijayanagara, Mughal, Bhakti-Sufi' },
    { id: 'modern',            icon: '🏛️', name: 'Modern India',          description: 'European arrival, British rule, Social reforms, 1857' },
    { id: 'freedom',           icon: '🇮🇳', name: 'Freedom Struggle',      description: 'Moderates, Extremists, Gandhi era, Quit India, INA' },
    { id: 'post-independence', icon: '🗺️', name: 'Post-Independence',      description: 'Integration, Constitution, Wars, Five Year Plans' },
    { id: 'culture',           icon: '🎭', name: 'Art & Culture',         description: 'Architecture, Painting, Dance, Music, Literature' },
  ],
  'polity': [
    { id: 'constitution',      icon: '📜', name: 'Constitution',          description: 'Making, Preamble, Schedules, Features borrowed' },
    { id: 'fundamental-rights',icon: '⚖️', name: 'Fundamental Rights',   description: 'Articles 12-35, Writs, Restrictions' },
    { id: 'dpsp',              icon: '📋', name: 'DPSP & Duties',         description: 'Directive Principles, Fundamental Duties' },
    { id: 'parliament',        icon: '🏛️', name: 'Parliament',            description: 'Lok Sabha, Rajya Sabha, Sessions, Bills' },
    { id: 'executive',         icon: '👤', name: 'Executive',             description: 'President, PM, Council of Ministers, Governor' },
    { id: 'judiciary',         icon: '⚔️', name: 'Judiciary',            description: 'Supreme Court, High Courts, Writs, Doctrines' },
    { id: 'federalism',        icon: '🗺️', name: 'Federalism',            description: 'Centre-State, Three Lists, Finance Commission' },
    { id: 'elections',         icon: '🗳️', name: 'Elections & Bodies',    description: 'ECI, CAG, UPSC, Constitutional Commissions' },
    { id: 'amendments',        icon: '✏️', name: 'Amendments',            description: 'Key amendments 1st to 105th' },
    { id: 'emergency',         icon: '🚨', name: 'Emergency Provisions',  description: 'National, President Rule, Financial Emergency' },
  ],
  'geography': [
    { id: 'physical',   icon: '⛰️', name: 'Physical Features',  description: 'Mountains, Plateaus, Plains, Passes' },
    { id: 'climate',    icon: '🌦️', name: 'Climate',             description: 'Monsoon, Climate zones, El Nino, Seasons' },
    { id: 'rivers',     icon: '🌊', name: 'Rivers & Drainage',  description: 'Himalayan rivers, Peninsular rivers, Lakes' },
    { id: 'soils',      icon: '🌱', name: 'Soils & Vegetation', description: 'Soil types, Natural vegetation zones' },
    { id: 'resources',  icon: '⛏️', name: 'Natural Resources',  description: 'Minerals, Energy, Forest resources' },
    { id: 'agriculture',icon: '🌾', name: 'Agriculture',         description: 'Crops, Seasons, Revolutions, MSP' },
    { id: 'industry',   icon: '🏭', name: 'Industry',            description: 'Major industries, Industrial corridors' },
    { id: 'population', icon: '👥', name: 'Population & Census', description: 'Census 2011, Density, Sex ratio, Literacy' },
    { id: 'world',      icon: '🌍', name: 'World Geography',     description: 'Continents, Oceans, International boundaries' },
  ],
  'general-science': [
    { id: 'physics',    icon: '⚡', name: 'Physics',             description: 'Laws of motion, Light, Electricity, Sound' },
    { id: 'chemistry',  icon: '🧪', name: 'Chemistry',           description: 'Periodic table, Acids-Bases, Compounds' },
    { id: 'biology',    icon: '🧬', name: 'Biology',             description: 'Cell, Human body, Classification, Plants' },
    { id: 'technology', icon: '🚀', name: 'Science & Technology',description: 'ISRO missions, Inventions, Defence' },
    { id: 'health',     icon: '🏥', name: 'Health & Disease',    description: 'Vitamins, Deficiencies, Communicable diseases' },
    { id: 'space',      icon: '🌌', name: 'Space Science',       description: 'Solar system, Planets, Space missions' },
  ],
};

// ══════════════════════════════════════════════════════════════════════════
// NON-TECH SECTION CONFIG
// Subsections are loaded from Firestore (nt_config) so admin can add/delete.
// These are the hard-coded DEFAULTS used if Firestore has no data yet.
// ══════════════════════════════════════════════════════════════════════════

// Default subsections for General Studies (subjects from image — no Hindi/English)
const NT_GS_DEFAULT = [
  { id: 'polity',          icon: '⚖️',  name: 'Polity',          subjects: ['Constitution','Fundamental Rights','Parliament','Judiciary','DPSP','Elections','Amendments','Emergency'] },
  { id: 'history',         icon: '🏛️',  name: 'History',         subjects: ['Ancient India','Medieval India','Modern India','Freedom Struggle','Art & Culture'] },
  { id: 'geography',       icon: '🗺️',  name: 'Geography',       subjects: ['Physical Geography','Indian Geography','World Geography','Climate','Rivers','Resources'] },
  { id: 'general-science', icon: '🔬',  name: 'General Science', subjects: ['Physics','Chemistry','Biology','Technology','Health & Disease'] },
  { id: 'economy',         icon: '💹',  name: 'Economy',         subjects: ['Indian Economy','Banking','Budget','Agriculture','Trade'] },
  { id: 'current-affairs', icon: '📰',  name: 'Current Affairs', subjects: ['National','International','Awards','Sports','Science & Tech'] },
  { id: 'environment',     icon: '🌿',  name: 'Environment',     subjects: ['Ecology','Biodiversity','Climate Change','Pollution','Conservation'] },
  { id: 'reasoning',       icon: '🧩',  name: 'Reasoning',       subjects: ['Analogy','Series','Coding-Decoding','Blood Relations','Direction'] },
];

// Default subsections for State GK
const NT_STATEGK_DEFAULT = [
  { id: 'mp',          icon: '🟠', name: 'Madhya Pradesh',  subjects: ['History','Geography','Culture','Economy','Polity','Current Affairs'] },
  { id: 'chhattisgarh',icon: '🟡', name: 'Chhattisgarh',   subjects: ['History','Geography','Culture','Economy','Polity','Current Affairs'] },
];

// Default subsections for Language
const NT_LANGUAGE_DEFAULT = [
  { id: 'hindi',   icon: '📖', name: 'Hindi',   subjects: ['व्याकरण','संधि-समास','अलंकार','रस-छंद','साहित्य','कवि','उपन्यास'] },
  { id: 'english', icon: '🔤', name: 'English', subjects: ['Grammar','Vocabulary','Comprehension','Error Spotting','Sentence Improvement'] },
];

// Fixed subsections for General Aptitude (not admin-editable)
const NT_APTITUDE_FIXED = [
  { id: 'logical-reasoning',     icon: '🧠', name: 'Logical Reasoning',     subjects: ['Analogy','Series','Coding-Decoding','Blood Relations','Direction','Syllogism','Puzzle','Clock & Calendar'] },
  { id: 'quantitative-aptitude', icon: '🔢', name: 'Quantitative Aptitude', subjects: ['Number System','Percentage','Ratio','Profit & Loss','Time & Work','Time & Distance','SI & CI','Geometry','Mensuration','Data Interpretation'] },
];

// Live config — populated from Firestore, falls back to defaults
let ntGsSubsections     = [...NT_GS_DEFAULT];
let ntStateGkSubsections = [...NT_STATEGK_DEFAULT];
let ntLanguageSubsections = [...NT_LANGUAGE_DEFAULT];

// ── Load NT config from Firestore ─────────────────────────────────────────
let _ntConfigLoaded = false;
async function loadNTConfig(force = false) {
  if (_ntConfigLoaded && !force) return;
  try {
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const snap = await getDoc(doc(db, 'nt_config', 'subsections'));
    if (snap.exists()) {
      const d = snap.data();
      if (Array.isArray(d.gs)       && d.gs.length)       ntGsSubsections      = d.gs;
      if (Array.isArray(d.stategk)  && d.stategk.length)  ntStateGkSubsections = d.stategk;
      if (Array.isArray(d.language) && d.language.length) ntLanguageSubsections = d.language;
    }
    _ntConfigLoaded = true;
  } catch (e) {
    console.warn('[NT] loadNTConfig error (using defaults):', e);
  }
}

// Legacy compatibility (some functions reference GS_SUBJECTS)
const GS_SUBJECTS = NT_GS_DEFAULT;
const HINDI_SUBJECTS = NT_LANGUAGE_DEFAULT;

// ── Subjects per section ────────────────────────────────────────────────────
// Civil uses SUBJECTS_UPPSC_MAINS (imported from subjects.js)
// PCB uses SUBJECTS_PCB_NOTES (unit1–unit11) for Practice and PYQ subject-wise


// ── DOM helper ─────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo(0, 0);
}

// ══════════════════════════════════════════════════════════════════════════
// INBOX — Notification Bell + Message Icon
// Reliable approach:
//   Notifications → compare createdAt of each notif vs stored lastNotifSeenAt
//   Messages      → store array of seen IDs (seenReportIds, seenFeedbackIds)
//   Badges clear ONLY when user opens the drawer (marks as read)
// ══════════════════════════════════════════════════════════════════════════

let _notifPopupShown = false;  // prevents duplicate popups in same page session
async function checkAndShowNotifications(uid) {
  // Shows a one-time popup for newest unseen notification.
  // Guards: JS flag (per page load) + localStorage (per session) + Firestore (cross-device)
  if (_notifPopupShown) return;

  try {
    const userRef  = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data() || {};
    const lastNotifSeenAt = userData.lastNotifSeenAt || 0;

    // Also check localStorage for faster guard (survives page refresh)
    const localSeen = parseInt(localStorage.getItem('lastNotifSeenAt') || '0', 10);
    const effectiveSeenAt = Math.max(lastNotifSeenAt, localSeen);

    const snap = await getDocs(
      query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(5))
    );

    let latestUnseen = null;
    let unseenCount  = 0;
    snap.forEach(d => {
      const n  = d.data();
      const ts = n.createdAt?.toMillis ? n.createdAt.toMillis() : 0;
      if (n.sent && ts > effectiveSeenAt) {
        unseenCount++;
        if (!latestUnseen) latestUnseen = { title: n.title || '', body: n.body || '' };
      }
    });

    if (!latestUnseen) return;

    // Mark as seen BEFORE showing popup — prevents race condition if auth fires twice
    _notifPopupShown = true;
    const nowMs = Date.now();
    localStorage.setItem('lastNotifSeenAt', String(nowMs));
    await setDoc(userRef, { lastNotifSeenAt: nowMs }, { merge: true }).catch(() => {});

    showNotifPopup(latestUnseen.title, latestUnseen.body, unseenCount);
  } catch (err) { console.log('[Notif] popup error:', err.message); }
}

function showNotifPopup(title, body, count) {
  const existing = document.getElementById('notifPopup');
  if (existing) existing.remove();
  const popup = document.createElement('div');
  popup.id = 'notifPopup';
  popup.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  popup.innerHTML = `
    <div style="background:#1e293b;border:1px solid #f59e0b;border-radius:16px;padding:22px;max-width:360px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.5);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <span style="font-size:13px;font-weight:700;color:#f59e0b;">🔔 ${count > 1 ? count + ' New Notifications' : 'New Notification'}</span>
        <button onclick="document.getElementById('notifPopup').remove()" style="background:none;border:none;color:#64748b;font-size:20px;cursor:pointer;line-height:1;padding:0 4px;">✕</button>
      </div>
      <div style="font-size:16px;font-weight:700;color:#f1f5f9;margin-bottom:8px;line-height:1.4;">${title}</div>
      <div style="font-size:13px;color:#94a3b8;line-height:1.6;">${body}</div>
    </div>`;
  popup.addEventListener('click', e => { if (e.target === popup) popup.remove(); });
  document.body.appendChild(popup);
}

// ── Load badge counts ─────────────────────────────────────────────────────
async function loadInboxCounts(uid) {
  try {
    const userRef  = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data() || {};

    // ── Notification badge ─────────────────────────────────────────────
    // Compare each notification's createdAt vs lastNotifBadgeCleared
    // Use max of Firestore and localStorage (localStorage is faster/more reliable)
    const fsNotifCleared    = userData.lastNotifBadgeCleared || 0;
    const localNotifCleared = parseInt(localStorage.getItem('lastNotifBadgeCleared') || '0', 10);
    const lastNotifBadgeCleared = Math.max(fsNotifCleared, localNotifCleared);

    const notifSnap = await getDocs(
      query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(20))
    );
    let notifCount = 0;
    notifSnap.forEach(d => {
      const n  = d.data();
      const ts = n.createdAt?.toMillis ? n.createdAt.toMillis() : 0;
      if (n.sent && ts > lastNotifBadgeCleared) notifCount++;
    });

    // ── Message badge ─────────────────────────────────────────────────
    // Use arrays of seen IDs — merge Firestore + localStorage
    const fsSeenRpt  = userData.seenReportIds   || [];
    const fsSeenFb   = userData.seenFeedbackIds || [];
    const localSeenRpt = JSON.parse(localStorage.getItem('seenReportIds') || '[]');
    const localSeenFb  = JSON.parse(localStorage.getItem('seenFeedbackIds') || '[]');
    const seenReportIds   = [...new Set([...fsSeenRpt, ...localSeenRpt])];
    const seenFeedbackIds = [...new Set([...fsSeenFb, ...localSeenFb])];

    let msgCount = 0;

    const rSnap = await getDocs(
      query(collection(db, 'reports'), where('user_uid', '==', uid))
    );
    rSnap.forEach(d => {
      if (d.data().admin_reply && !seenReportIds.includes(d.id)) msgCount++;
    });

    const fSnap = await getDocs(
      query(collection(db, 'feedback'), where('user_uid', '==', uid))
    );
    fSnap.forEach(d => {
      if (d.data().admin_reply && !seenFeedbackIds.includes(d.id)) msgCount++;
    });

    _setBadge('notifBadge', notifCount);
    _setBadge('msgBadge',   msgCount);
  } catch (err) { console.log('[Inbox] count error:', err.message); }
}

function _setBadge(id, count) {
  const el = document.getElementById(id);
  if (!el) return;
  if (count > 0) {
    el.textContent = count > 9 ? '9+' : count;
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}

// ── Open Notification Drawer ──────────────────────────────────────────────
async function openNotifDrawer(uid) {
  const drawer = document.getElementById('notifDrawer');
  const body   = document.getElementById('notifDrawerBody');
  if (!drawer) return;
  drawer.classList.remove('hidden');
  body.innerHTML = '<div class="inbox-empty">Loading…</div>';

  try {
    const snap = await getDocs(
      query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(20))
    );

    if (snap.empty) { body.innerHTML = '<div class="inbox-empty">No notifications yet.</div>'; return; }

    // Read lastNotifBadgeCleared to know which are "new"
    const userSnap = await getDoc(doc(db, 'users', uid));
    const lastCleared = (userSnap.data() || {}).lastNotifBadgeCleared || 0;

    body.innerHTML = '';
    snap.forEach(d => {
      const n  = d.data();
      if (!n.sent) return;
      const ts    = n.createdAt?.toMillis ? n.createdAt.toMillis() : 0;
      const isNew = ts > lastCleared;
      const date  = n.createdAt?.toDate
        ? n.createdAt.toDate().toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
        : '';
      const item = document.createElement('div');
      item.className = 'inbox-item' + (isNew ? ' unread' : '');
      item.innerHTML = `
        <div class="inbox-item-tag">📢 Announcement</div>
        <div class="inbox-item-title">${n.title || ''}</div>
        <div class="inbox-item-body">${n.body || ''}</div>
        <div class="inbox-item-meta">🕐 ${date}</div>`;
      body.appendChild(item);
    });

    // Clear badge — store current time so future logins start fresh from here
    const clearedAt = Date.now();
    localStorage.setItem('lastNotifBadgeCleared', String(clearedAt));
    await setDoc(doc(db, 'users', uid), { lastNotifBadgeCleared: clearedAt }, { merge: true });
    _setBadge('notifBadge', 0);
  } catch (err) {
    body.innerHTML = '<div class="inbox-empty">Failed to load.</div>';
    console.error('[NotifDrawer]', err);
  }
}

// ── Open Message Drawer ───────────────────────────────────────────────────
async function openMsgDrawer(uid) {
  const drawer = document.getElementById('msgDrawer');
  const body   = document.getElementById('msgDrawerBody');
  if (!drawer) return;
  drawer.classList.remove('hidden');
  body.innerHTML = '<div class="inbox-empty">Loading…</div>';

  try {
    const messages   = [];
    const newRptIds  = [];
    const newFbIds   = [];

    const rSnap = await getDocs(
      query(collection(db, 'reports'), where('user_uid', '==', uid))
    );
    rSnap.forEach(d => {
      const r = d.data();
      if (!r.admin_reply) return;
      const date = r.updatedAt?.toDate
        ? r.updatedAt.toDate().toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
        : '';
      messages.push({
        tag: '🚩 Report Reply', tagClass: '',
        title: r.admin_reply,
        body: r.question ? `Re: "${r.question.substring(0, 80)}…"` : '',
        date, sortKey: r.updatedAt?.toMillis ? r.updatedAt.toMillis() : 0
      });
      newRptIds.push(d.id);
    });

    const fSnap = await getDocs(
      query(collection(db, 'feedback'), where('user_uid', '==', uid))
    );
    fSnap.forEach(d => {
      const f = d.data();
      if (!f.admin_reply) return;
      const date = f.repliedAt?.toDate
        ? f.repliedAt.toDate().toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
        : '';
      messages.push({
        tag: '💬 Feedback Reply', tagClass: 'msg-tag',
        title: f.admin_reply,
        body: f.message ? `Re: "${f.message.substring(0, 80)}…"` : '',
        date, sortKey: f.repliedAt?.toMillis ? f.repliedAt.toMillis() : 0
      });
      newFbIds.push(d.id);
    });

    if (messages.length === 0) {
      body.innerHTML = '<div class="inbox-empty">No messages from admin yet.</div>';
      return;
    }

    messages.sort((a, b) => b.sortKey - a.sortKey);
    body.innerHTML = '';
    messages.forEach(m => {
      const item = document.createElement('div');
      item.className = 'inbox-item';
      item.innerHTML = `
        <div class="inbox-item-tag ${m.tagClass}">${m.tag}</div>
        <div class="inbox-item-title">${m.title}</div>
        ${m.body ? `<div class="inbox-item-body">${m.body}</div>` : ''}
        ${m.date ? `<div class="inbox-item-meta">🕐 ${m.date}</div>` : ''}`;
      body.appendChild(item);
    });

    // Mark all as seen — save IDs so badge won't reappear next login
    localStorage.setItem('seenReportIds', JSON.stringify(newRptIds));
    localStorage.setItem('seenFeedbackIds', JSON.stringify(newFbIds));
    await setDoc(doc(db, 'users', uid), {
      seenReportIds:   newRptIds,
      seenFeedbackIds: newFbIds,
    }, { merge: true });
    _setBadge('msgBadge', 0);
  } catch (err) {
    body.innerHTML = '<div class="inbox-empty">Failed to load.</div>';
    console.error('[MsgDrawer]', err);
  }
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

// ── Declarative back buttons ───────────────────────────────────────────────
document.querySelectorAll('.back-btn[data-back]').forEach(btn => {
  btn.addEventListener('click', () => showScreen(btn.dataset.back));
});

// ── Auth ───────────────────────────────────────────────────────────────────
watchAuth(
  async user => {
    currentUser = user;
    startSessionTracker(user.uid);
    initNotifications(user.uid, toast).catch(() => {});
    // Load custom exams FIRST so they appear in exam lists
    await loadDynamicExams(db).catch(() => {});
    try {
      const displayName = user.name ? user.name.split(' ')[0] : (user.mobile || 'Student');
      const nameEl = $('userName');
      if (nameEl) nameEl.textContent = displayName;
      if (!user.hasProfile) {
        toast('Welcome! Please add your details');
        await openProfileScreen();
      } else {
        showScreen('homeScreen');
        // Show any unseen notifications as popup
        checkAndShowNotifications(user.uid).catch(() => {});
        loadInboxCounts(user.uid).catch(() => {});
      }
    } catch (e) {
      console.error('[Auth] routing error:', e);
      showScreen('homeScreen');
    }
  },
  () => {
    currentUser = null;
    showAuthStep('loginPhoneStep');
    showScreen('loginScreen');
  }
);

function authMsg(msg, color = '#f59e0b') {
  const el = $('authMsg');
  if (!el) return;
  el.textContent = msg;
  el.style.color = color;
}

function showAuthStep(stepId) {
  ['loginPhoneStep', 'loginOtpStep'].forEach(id => {
    const el = $(id);
    if (el) el.style.display = (id === stepId) ? 'block' : 'none';
  });
  authMsg('');
}

function on(id, fn) {
  const el = $(id);
  if (el) el.addEventListener('click', fn);
}

// ── Login: OTP ─────────────────────────────────────────────────────────────
on('loginSendOtpBtn', async () => {
  const mobile = $('loginMobileInput').value.trim();
  if (!/^\d{10}$/.test(mobile)) { authMsg('Enter valid 10-digit mobile number', '#ef4444'); return; }
  authMsg('Sending OTP…');
  const btn = $('loginSendOtpBtn'); btn.disabled = true;
  try {
    await sendOTP('+91' + mobile);
    $('loginOtpSentTo').textContent = '+91 ' + mobile;
    showAuthStep('loginOtpStep');
    authMsg('OTP sent ✓', '#10b981');
  } catch(e) {
    authMsg(e.code === 'auth/too-many-requests' ? 'Too many attempts. Wait a few minutes.'
          : e.code === 'auth/invalid-phone-number' ? 'Invalid phone number.'
          : 'Failed: ' + (e.message || e.code), '#ef4444');
  } finally { btn.disabled = false; }
});

on('loginVerifyOtpBtn', async () => {
  const otp = $('loginOtpInput').value.trim();
  if (otp.length !== 6) { authMsg('Enter 6-digit OTP', '#ef4444'); return; }
  authMsg('Verifying OTP…');
  const btn = $('loginVerifyOtpBtn'); btn.disabled = true;
  try {
    await verifyOTP(otp);
    authMsg('Login successful! 🎉', '#10b981');
  } catch(e) {
    authMsg(e.code === 'auth/invalid-verification-code' ? 'Incorrect OTP. Try again.'
          : e.code === 'auth/code-expired' ? 'OTP expired. Resend.'
          : 'Verification failed: ' + (e.message || e.code), '#ef4444');
  } finally { btn.disabled = false; }
});

on('loginResendOtpBtn', async () => {
  const mobile = $('loginMobileInput').value.trim();
  if (!mobile) { showAuthStep('loginPhoneStep'); return; }
  authMsg('Resending OTP…');
  try { await sendOTP('+91' + mobile); authMsg('OTP resent ✓', '#10b981'); }
  catch(e) { authMsg('Failed: ' + (e.message || e.code), '#ef4444'); }
});

on('backToLoginPhone', () => showAuthStep('loginPhoneStep'));

on('googleLoginBtn', async () => {
  authMsg('Opening Google sign-in…');
  try {
    await loginWithGoogle();
    authMsg('Login successful! 🎉', '#10b981');
  } catch(e) {
    authMsg(e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request'
          ? 'Google sign-in cancelled.'
          : e.code === 'auth/popup-blocked' ? 'Popup blocked. Allow popups and retry.'
          : 'Google login failed: ' + (e.message || e.code), '#ef4444');
  }
});

// ── Profile ────────────────────────────────────────────────────────────────
function profileMsg(msg, color = '#10b981') {
  const el = $('profileMsg');
  if (!el) return;
  el.textContent = msg; el.style.color = color;
}

async function openProfileScreen() {
  if (!currentUser) return;
  let profile = null;
  try { profile = await getUserProfile(currentUser.uid); } catch(e) {}
  const mEl = $('profileMobile'), nEl = $('profileName'), eEl = $('profileEmail');
  const sEl = $('profileState'), xEl = $('profileExam');
  if (mEl) mEl.value = profile?.mobile || currentUser.mobile || '';
  if (nEl) nEl.value = profile?.name   || currentUser.name   || '';
  if (eEl) eEl.value = profile?.email  || currentUser.email  || '';
  if (sEl) sEl.value = profile?.state  || '';
  if (xEl) xEl.value = profile?.preparingFor || '';
  profileMsg('');
  showScreen('profileScreen');
}

on('editProfileBtn', () => openProfileScreen());

on('saveProfileBtn', async () => {
  if (!currentUser) return;
  const name  = $('profileName').value.trim();
  const email = $('profileEmail').value.trim();
  const state = $('profileState').value;
  const preparingFor = $('profileExam').value;
  if (!name) { profileMsg('Please enter your name', '#ef4444'); return; }
  if (!state) { profileMsg('Please select your state', '#ef4444'); return; }
  if (!preparingFor) { profileMsg('Please select the exam you are preparing for', '#ef4444'); return; }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    profileMsg('Please enter a valid email ID', '#ef4444'); return;
  }
  profileMsg('Saving…', '#f59e0b');
  const btn = $('saveProfileBtn'); btn.disabled = true;
  try {
    await saveUserProfile({ uid: currentUser.uid, name, email, mobile: currentUser.mobile, state, preparingFor });
    currentUser.name = name; currentUser.email = email; currentUser.hasProfile = true;
    $('userName').textContent = name.split(' ')[0];
    profileMsg('Saved! ✓', '#10b981');
    toast('Details saved');
    setTimeout(() => showScreen('homeScreen'), 800);
  } catch(e) { profileMsg('Save failed: ' + (e.message || e.code), '#ef4444'); }
  finally { btn.disabled = false; }
});

on('logoutBtn', async () => { await logout(); toast('Logged out'); });

// Inbox drawer wiring
const _notifBtn = document.getElementById('notifBtn');
const _msgBtn   = document.getElementById('msgBtn');
if (_notifBtn) _notifBtn.addEventListener('click', () => { if (currentUser) openNotifDrawer(currentUser.uid); });
if (_msgBtn)   _msgBtn.addEventListener('click',   () => { if (currentUser) openMsgDrawer(currentUser.uid); });
['notifDrawerClose','notifBackdrop'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', () => document.getElementById('notifDrawer').classList.add('hidden'));
});
['msgDrawerClose','msgBackdrop'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', () => document.getElementById('msgDrawer').classList.add('hidden'));
});

// ══════════════════════════════════════════════════════════════════════════════
// HOME — 3 category tiles
// ══════════════════════════════════════════════════════════════════════════════

on('homeCivil', () => {
  activeSection = 'civil';
  showScreen('civilHomeScreen');
});

on('homePCB', () => {
  activeSection = 'pcb';
  showScreen('pcbHomeScreen');
});

on('homeNonTech', () => {
  activeSection = 'nontech';
  showScreen('nonTechHomeScreen');
});

// ══════════════════════════════════════════════════════════════════════════════
// CIVIL — 4 tiles
// ══════════════════════════════════════════════════════════════════════════════

on('civilNotes', () => {
  $('notesSubjectsBackBtn').onclick = () => showScreen('civilHomeScreen');
  renderSubjectList('notesSubjectList', SUBJECTS_UPPSC_MAINS, openNotesSubject);
  showScreen('notesSubjectsScreen');
});

on('civilPractice', () => {
  $('practiceSubjectsBackBtn').onclick = () => showScreen('civilHomeScreen');
  renderSubjectList('practiceSubjectList', SUBJECTS_UPPSC_MAINS, openPracticeSubject);
  showScreen('practiceSubjectsScreen');
});

on('civilPYQ', () => {
  $('pyqExamsBackBtn').onclick = () => showScreen('civilHomeScreen');
  $('pyqExamsTitle').textContent = '📜 AE/JE Civil — PYQ';
  renderExamList('civil');
  showScreen('pyqExamsScreen');
});

on('civilBookmarks', async () => {
  $('bookmarksBackBtn').onclick = () => showScreen('civilHomeScreen');
  await loadAndShowBookmarks();
  showScreen('bookmarksScreen');
});

// ══════════════════════════════════════════════════════════════════════════════
// PCB — 4 tiles (same flow, different subjects/exams)
// ══════════════════════════════════════════════════════════════════════════════

on('pcbNotes', () => {
  renderSubjectList('pcbNotesSubjectList', SUBJECTS_PCB_NOTES, openPCBNotesUnit);
  showScreen('pcbNotesSubjectsScreen');
});

on('pcbPractice', () => {
  $('practiceSubjectsBackBtn').onclick = () => showScreen('pcbHomeScreen');
  renderSubjectList('practiceSubjectList', SUBJECTS_PCB_NOTES, openPCBPracticeUnit);
  showScreen('practiceSubjectsScreen');
});

on('pcbPYQ', () => {
  $('pyqExamsBackBtn').onclick = () => showScreen('pcbHomeScreen');
  $('pyqExamsTitle').textContent = '📜 PCB — PYQ';
  renderExamList('pcb');
  showScreen('pyqExamsScreen');
});

on('pcbBookmarks', async () => {
  $('bookmarksBackBtn').onclick = () => showScreen('pcbHomeScreen');
  await loadAndShowBookmarks();
  showScreen('bookmarksScreen');
});

// ══════════════════════════════════════════════════════════════════════════════
// NON-TECH — 4 section tiles
// ══════════════════════════════════════════════════════════════════════════════

on('nonTechGS', async () => {
  await loadNTConfig();
  renderNTSubsectionList('ntGsSubjectList', ntGsSubsections, 'gs', 'ntGsHomeScreen');
  showScreen('ntGsHomeScreen');
});

on('nonTechStateGK', async () => {
  await loadNTConfig();
  renderNTSubsectionList('ntStateGkList', ntStateGkSubsections, 'stategk', 'ntStateGkHomeScreen');
  showScreen('ntStateGkHomeScreen');
});

on('nonTechLanguage', async () => {
  await loadNTConfig();
  renderNTSubsectionList('ntLanguageList', ntLanguageSubsections, 'language', 'ntLanguageHomeScreen');
  showScreen('ntLanguageHomeScreen');
});

on('nonTechAptitude', () => {
  renderNTSubsectionList('ntAptitudeList', NT_APTITUDE_FIXED, 'aptitude', 'ntAptitudeHomeScreen');
  showScreen('ntAptitudeHomeScreen');
});

// ══════════════════════════════════════════════════════════════════════════════
// SHARED: SUBJECT LIST RENDERER
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

  // Wire back button to go back to subject list (already at notesSubjectsScreen)
  $('notesContentBackBtn').onclick = () => showScreen('notesSubjectsScreen');

  const data = await loadNotesForSubject(subj.id);
  if (!data) {
    const old = $('notesRendered');
    if (old) old.remove();
    $('notesTopicBar').innerHTML = '';
    $('notesPlaceholder').style.display = '';
    showScreen('notesContentScreen');
    return;
  }
  renderNotesContent(data, null);
  showScreen('notesContentScreen');
}

// ── PCB Notes ──────────────────────────────────────────────────────────────

async function openPCBNotesUnit(subj) {
  // Show the PCB notes screen
  $('pcbNotesContentTitle').textContent = subj.name;
  $('pcbNotesContentSub').textContent   = subj.description || 'Topic-wise notes';

  // Clear old content and show loading state
  const old = document.getElementById('pcb-notes-rendered');
  if (old) old.remove();
  $('pcbNotesTopicBar').innerHTML = '';
  $('pcbNotesPlaceholder').style.display = '';
  $('pcbNotesPlaceholder').querySelector('h3').textContent = 'Loading…';

  showScreen('pcbNotesContentScreen');

  const data = await loadPCBUnit(subj.id);
  if (!data) {
    $('pcbNotesPlaceholder').querySelector('h3').textContent = 'Notes coming soon';
    $('pcbNotesPlaceholder').querySelector('p').textContent  = 'This unit will be added shortly.';
    return;
  }
  renderPCBNotesContent(data, 'pcbNotesMain', 'pcbNotesTopicBar', 'pcbNotesPlaceholder');
}

// ══════════════════════════════════════════════════════════════════════════════
// PRACTICE FLOW
// ══════════════════════════════════════════════════════════════════════════════

async function openPracticeSubject(subj) {
  currentSubject = subj;
  currentTopic   = 'all';
  quizRoute      = 'practice';
  quizSource     = 'practiceSubjectsScreen';

  let questions = await fetchPracticeQuestions({ subject: subj.id, section: activeSection, maxCount: 10000 });
  if (!questions || !questions.length) { toast('No practice questions for this subject yet'); return; }

  Object.keys(quizAnswerMap).forEach(k => delete quizAnswerMap[k]);
  Quiz.startQuiz(questions);
  showScreen('quizScreen');
  buildTopicChips('quizTopicBar', subj.id, async topicId => {
    currentTopic = topicId;
    let qs = await fetchPracticeQuestions({ subject: subj.id, section: activeSection, maxCount: 10000 });
    if (topicId !== 'all') qs = qs.filter(q => !q.topic || q.topic === 'all' || q.topic === topicId);
    if (!qs.length) { toast('No questions for this topic yet'); return; }
    Quiz.resetToQuestions(qs);
    renderQuiz();
  });
  renderQuiz();
}

// ── PCB Practice — unit-based with PCB topic chips ──────────────────────────

// PCB unit topic sections (match the h2 sections in each unit HTML)
const PCB_UNIT_TOPICS = {
  unit1:  [{id:'all',label:'All Topics'},{id:'s1',label:'Water Quality Parameters'},{id:'s2',label:'Sources & Population Forecasting'},{id:'s3',label:'Water Treatment Processes'},{id:'s4',label:'Distribution System'},{id:'s5',label:'GATE ES Additions'},{id:'s6',label:'Key Formulae & Exam Strategy'}],
  unit2:  [{id:'all',label:'All Topics'},{id:'s1',label:'Sewage Characteristics'},{id:'s2',label:'Sewer System Design'},{id:'s3',label:'Wastewater Treatment Processes'},{id:'s4',label:'Sludge Treatment & Disposal'},{id:'s5',label:'Effluent Standards'},{id:'s6',label:'MCQ Revision List'}],
  unit3:  [{id:'all',label:'All Topics'},{id:'s1',label:'Fundamentals of Air Pollution'},{id:'s2',label:'Specific Pollutants & Health Effects'},{id:'s3',label:'Meteorology & Dispersion'},{id:'s4',label:'Air Pollution Control Equipment'},{id:'s5',label:'Standards & Monitoring'},{id:'s6',label:'MCQ Revision List'}],
  unit4:  [{id:'all',label:'All Topics'},{id:'s1',label:'Municipal Solid Waste'},{id:'s2',label:'Collection & Transport'},{id:'s3',label:'Treatment & Disposal'},{id:'s4',label:'Hazardous Waste'},{id:'s5',label:'Bio-Medical Waste'},{id:'s6',label:'E-Waste & Plastic Waste'},{id:'s7',label:'MCQ Revision List'}],
  unit5:  [{id:'all',label:'All Topics'},{id:'s1',label:'Constitutional Provisions'},{id:'s2',label:'Key Environmental Acts'},{id:'s3',label:'Rules & Notifications'},{id:'s4',label:'International Conventions'},{id:'s5',label:'Key Institutions'},{id:'s6',label:'MCQ Revision List'}],
  unit6:  [{id:'all',label:'All Topics'},{id:'s1',label:'EIA Concept, History & Process'},{id:'s2',label:'Environmental Management Systems'},{id:'s3',label:'Environmental Indices'},{id:'s4',label:'CSR, EPR & Green Initiatives'},{id:'s5',label:'MCQ Revision List'}],
  unit7:  [{id:'all',label:'All Topics'},{id:'s1',label:'Sound & Noise Basics'},{id:'s2',label:'Must-Memorise Standards & Values'},{id:'s3',label:'Noise Reduction Quick Tips'},{id:'s4',label:'Radiation Quick Facts'},{id:'s5',label:'Exam Strategies'}],
  unit8:  [{id:'all',label:'All Topics'},{id:'s1',label:'Ecosystem Concepts'},{id:'s2',label:'Types of Ecosystems'},{id:'s3',label:'Biodiversity'},{id:'s4',label:'Climate Change & Global Issues'},{id:'s5',label:'Natural Resources'},{id:'s6',label:'MCQ Revision List'}],
  unit9:  [{id:'all',label:'All Topics'},{id:'s1',label:'Sector-Specific Industrial Pollution'},{id:'s2',label:'Zero Liquid Discharge (ZLD)'},{id:'s3',label:'CETP'},{id:'s4',label:'Cleaner Production & End-of-Pipe'},{id:'s5',label:'Green Chemistry & Industrial Ecology'},{id:'s6',label:'Carbon Trading & CDM'},{id:'s7',label:'MCQ Revision List'}],
  unit10: [{id:'all',label:'All Topics'},{id:'s1',label:'Water Analysis Methods'},{id:'s2',label:'Microbiological Analysis'},{id:'s3',label:'Heavy Metals & Advanced Analysis'},{id:'s4',label:'Air Monitoring Methods'},{id:'s5',label:'Environmental Chemistry Fundamentals'},{id:'s6',label:'Toxicology & Risk Assessment'},{id:'s7',label:'Key Standards & Critical Values'},{id:'s8',label:'Exam Strategy & High-Yield Topics'}],
  unit11: [{id:'all',label:'All Topics'},{id:'s1',label:'Fluid Properties & Hydrostatics'},{id:'s2',label:'Must-Memorise Constants & Formulas'},{id:'s3',label:'Quick Design Checklist'},{id:'s4',label:'Exam Strategies'}],
};

async function openPCBPracticeUnit(subj) {
  currentSubject = subj;
  currentTopic   = 'all';
  quizRoute      = 'practice';
  quizSource     = 'practiceSubjectsScreen';

  // Fetch practice questions where subject = unit id (e.g. 'unit3')
  let questions = await fetchPracticeQuestions({ subject: subj.id, section: 'pcb', maxCount: 10000 });
  if (!questions || !questions.length) {
    toast('No practice questions for this unit yet');
    return;
  }

  Object.keys(quizAnswerMap).forEach(k => delete quizAnswerMap[k]);
  Quiz.startQuiz(questions);
  showScreen('quizScreen');

  // Build PCB topic chips from unit's section list
  buildPCBTopicChips('quizTopicBar', subj.id, questions, async topicId => {
    currentTopic = topicId;
    let qs = await fetchPracticeQuestions({ subject: subj.id, section: 'pcb', maxCount: 10000 });
    if (topicId !== 'all') qs = qs.filter(q => !q.topic || q.topic === 'all' || q.topic === topicId);
    if (!qs.length) { toast('No questions for this section yet'); return; }
    Quiz.resetToQuestions(qs);
    renderQuiz();
  });

  renderQuiz();
}

function buildPCBTopicChips(containerId, unitId, allQs, onSelect) {
  const container = $(containerId);
  if (!container) return;
  const topics = PCB_UNIT_TOPICS[unitId] || [{id:'all',label:'All Topics'}];
  container.innerHTML = topics.map(t =>
    `<button class="topic-chip${t.id === 'all' ? ' active' : ''}" data-topic="${t.id}">${escapeHtml(t.label)}</button>`
  ).join('');
  container.querySelectorAll('.topic-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.topic-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentTopic = chip.dataset.topic;
      if (onSelect) onSelect(currentTopic);
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// PYQ FLOW
// ══════════════════════════════════════════════════════════════════════════════

function renderExamList(section) {
  const container = $('pyqExamList');
  container.innerHTML = '';
  // Filter exams by section field (now properly set in exams.js)
  const filtered = section === 'nontech'
    ? getAllExams()  // non-tech questions can be uploaded to any exam
    : getAllExams().filter(e => e.section === section);
  if (!filtered.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📜</div><h3>No exams yet</h3><p>Exams will appear here.</p></div>';
    return;
  }
  filtered.forEach(exam => {
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

on('pyqModeYear', () => {
  $('pyqYearsTitle').textContent = '📅 ' + currentExam.name + ' — Year-wise';
  $('pyqYearsSub').textContent   = 'Pick an exam paper';
  renderYearList();
  showScreen('pyqYearsScreen');
});

on('pyqModeSubject', () => {
  const GS_SUBJ_LIST = NONTECH_SUBJECT_IDS.map(id => ({
    id, name: { polity:'Polity', history:'History', geography:'Geography',
      'general-science':'General Science', economy:'Economy',
      'current-affairs':'Current Affairs', environment:'Environment',
      'hindi-grammar':'Hindi Grammar', 'hindi-sahitya':'Hindi Literature',
      reasoning:'Reasoning', 'quantitative-aptitude':'Quantitative Aptitude', english:'English'
    }[id] || id,
    icon: { polity:'⚖️', history:'🏛️', geography:'🗺️', 'general-science':'🔬',
      economy:'💰', 'current-affairs':'📰', environment:'🌍',
      'hindi-grammar':'📝', 'hindi-sahitya':'📚', reasoning:'🧠',
      'quantitative-aptitude':'🔢', english:'🔤'
    }[id] || '📖',
    description: 'PYQ Questions'
  }));
  const subjectList = activeSection === 'pcb' ? SUBJECTS_PCB_NOTES
    : activeSection === 'nontech' ? GS_SUBJ_LIST
    : SUBJECTS_UPPSC_MAINS;
  $('pyqSubjectsTitle').textContent = currentExam.name + ' — Subject-wise';
  $('pyqSubjectsSub').textContent   = 'Pick a subject';
  renderSubjectList('pyqSubjectList', subjectList, openPyqSubject);
  showScreen('pyqSubjectsScreen');
});

async function renderYearList() {
  const container = $('pyqYearList');
  container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-dim)">Loading...</div>';
  try {
    let questions = await fetchQuestions({ exam: currentExam.id, type: 'pyq', maxCount: 10000 });
    if (!questions.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><h3>No PYQ uploaded yet</h3><p>Upload questions via admin panel first.</p></div>';
      return;
    }
    const groups = {};
    questions.forEach(q => {
      const examLabel = q.exam_name || q.exam_code || `${currentExam.name} ${q.year}`;
      const key = `${q.year}__${examLabel}`;
      if (!groups[key]) groups[key] = { examLabel, year: q.year || '—', exam_code: q.exam_code || '', exam_date: q.exam_date || '', questions: [] };
      groups[key].questions.push(q);
    });
    const sorted = Object.values(groups).sort((a, b) =>
      (b.year || 0) - (a.year || 0) || a.examLabel.localeCompare(b.examLabel));
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
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Error loading</h3><p>${e.message}</p></div>`;
  }
}

async function openPyqYear(examLabel, questions) {
  currentTopic = 'all';
  quizRoute    = 'pyq';
  quizSource   = 'pyqYearsScreen';
  if (!questions?.length) { toast('No questions for this paper'); return; }
  questions.sort((a,b) => (a.subject||'').localeCompare(b.subject||'') || (a.q_num||0)-(b.q_num||0));
  Quiz.startQuiz(questions);
  showScreen('quizScreen');
  buildYearSubjectChips(questions);
  renderQuiz();
}

function buildYearSubjectChips(allQs) {
  const bar = $('quizTopicBar');
  bar.innerHTML = '';
  const subjects = [...new Set(allQs.map(q => q.subject).filter(Boolean))];
  const allChip = document.createElement('button');
  allChip.className = 'topic-chip active';
  allChip.textContent = 'All Subjects';
  allChip.dataset.topic = 'subj:all';
  bar.appendChild(allChip);
  subjects.forEach(subjId => {
    const subj = SUBJECTS_UPPSC_MAINS.find(s => s.id === subjId)
              || SUBJECTS_PCB_NOTES.find(s => s.id === subjId);
    const chip = document.createElement('button');
    chip.className = 'topic-chip';
    chip.textContent = (subj?.icon || '') + ' ' + (subj?.name || subjId);
    chip.dataset.topic = 'subj:' + subjId;
    bar.appendChild(chip);
  });
  bar.querySelectorAll('.topic-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      bar.querySelectorAll('.topic-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const subjId = chip.dataset.topic.replace('subj:', '');
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
  let questions = await fetchQuestions({ exam: currentExam.id, subject: subj.id, type: 'pyq', maxCount: 10000 });
  if (!questions?.length) { toast('No PYQ for this subject yet'); return; }
  questions.sort((a,b) => (b.year||0)-(a.year||0) || (a.q_num||0)-(b.q_num||0));
  Object.keys(quizAnswerMap).forEach(k => delete quizAnswerMap[k]);
  Quiz.startQuiz(questions);
  showScreen('quizScreen');

  // Use PCB topic chips for PCB section, civil topic chips for civil
  if (activeSection === 'pcb') {
    buildPCBTopicChips('quizTopicBar', subj.id, questions, async topicId => {
      currentTopic = topicId;
      let qs = await fetchQuestions({ exam: currentExam.id, subject: subj.id, type: 'pyq', maxCount: 10000 });
      if (topicId !== 'all') qs = qs.filter(q => !q.topic || q.topic === 'all' || q.topic === topicId);
      if (!qs.length) { toast('No questions for this section yet'); return; }
      qs.sort((a,b) => (b.year||0)-(a.year||0) || (a.q_num||0)-(b.q_num||0));
      Quiz.resetToQuestions(qs);
      renderQuiz();
    });
  } else {
    buildTopicChips('quizTopicBar', subj.id, async topicId => {
      currentTopic = topicId;
      let qs = await fetchQuestions({ exam: currentExam.id, subject: subj.id, type: 'pyq', maxCount: 10000 });
      if (topicId !== 'all') qs = qs.filter(q => !q.topic || q.topic === 'all' || q.topic === topicId);
      if (!qs.length) { toast('No questions for this topic yet'); return; }
      qs.sort((a,b) => (b.year||0)-(a.year||0) || (a.q_num||0)-(b.q_num||0));
      Quiz.resetToQuestions(qs);
      renderQuiz();
    });
  }
  renderQuiz();
}

// ══════════════════════════════════════════════════════════════════════════════
// TOPIC CHIPS
// ══════════════════════════════════════════════════════════════════════════════

function buildTopicChips(containerId, subjectId, onSelect) {
  const container = $(containerId);
  if (!container) return;
  // Check civil subjects first, then GS topics
  let topics = getTopicsFor(subjectId);
  if (topics.length <= 1 && GS_SUB_SUBJECTS[subjectId]) {
    topics = [{ id: 'all', label: 'All' }, ...GS_SUB_SUBJECTS[subjectId].map(t => ({ id: t.id, label: t.name }))];
  }
  container.innerHTML = topics.map(t =>
    `<button class="topic-chip${t.id === currentTopic ? ' active' : ''}" data-topic="${t.id}">${escapeHtml(t.label)}</button>`
  ).join('');
  container.querySelectorAll('.topic-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const bar = chip.closest('.topic-bar-scroll');
      if (bar) bar.querySelectorAll('.topic-chip').forEach(c =>
        c.classList.toggle('active', c.dataset.topic === chip.dataset.topic));
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
  const list = $('bookmarksList'), empty = $('bookmarksEmpty'), practiceBtn = $('practiceBookmarksBtn');
  list.innerHTML = '';
  if (!allBookmarks?.length) {
    list.classList.add('hidden'); empty.classList.remove('hidden'); practiceBtn.classList.add('hidden');
    return;
  }
  list.classList.remove('hidden'); empty.classList.add('hidden');
  practiceBtn.classList.remove('hidden');
  practiceBtn.textContent = `Practice all (${allBookmarks.length})`;

  // ── Subject name & icon lookup ────────────────────────────────────────
  const subjectMeta = {};
  SUBJECTS_UPPSC_MAINS.forEach(s => { subjectMeta[s.id] = { name: s.name, icon: s.icon }; });
  (SUBJECTS_PCB_NOTES || []).forEach(s => { subjectMeta[s.id] = { name: s.name, icon: s.icon || '🌿' }; });
  const nontechMap = {
    polity:'⚖️ Polity', history:'🏛️ History', geography:'🗺️ Geography',
    'general-science':'🔬 General Science', economy:'💰 Economy',
    'current-affairs':'📰 Current Affairs', environment:'🌍 Environment',
    'hindi-grammar':'📝 Hindi Grammar', 'hindi-sahitya':'📚 Hindi Literature',
    reasoning:'🧠 Reasoning', 'quantitative-aptitude':'🔢 Quantitative Aptitude', english:'🔤 English'
  };
  Object.entries(nontechMap).forEach(([id, label]) => {
    if (!subjectMeta[id]) subjectMeta[id] = { name: label.slice(2).trim(), icon: label.slice(0,2) };
  });

  // ── Group by subject ──────────────────────────────────────────────────
  const groups = {};
  allBookmarks.forEach(q => {
    const subj = q.subject || 'other';
    if (!groups[subj]) groups[subj] = [];
    groups[subj].push(q);
  });

  // Sort groups: more bookmarks first
  const sortedKeys = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);

  sortedKeys.forEach(subj => {
    const questions = groups[subj];
    const meta = subjectMeta[subj] || { name: subj.replace(/-/g, ' '), icon: '📖' };
    const groupId = 'bkmk-grp-' + subj.replace(/[^a-z0-9]/g, '-');

    // ── Subject header (collapsible) ─────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'bookmark-group-header';
    header.innerHTML = `
      <div class="bookmark-group-icon">${meta.icon}</div>
      <div class="bookmark-group-info">
        <div class="bookmark-group-name">${escapeHtml(meta.name)}</div>
        <div class="bookmark-group-count">${questions.length} question${questions.length > 1 ? 's' : ''}</div>
      </div>
      <button class="bookmark-group-practice" data-subj="${subj}">Practice</button>
      <div class="bookmark-group-chevron">▾</div>
    `;
    header.addEventListener('click', (e) => {
      if (e.target.classList.contains('bookmark-group-practice')) return;
      const body = document.getElementById(groupId);
      const chevron = header.querySelector('.bookmark-group-chevron');
      if (body.classList.contains('hidden')) {
        body.classList.remove('hidden');
        chevron.textContent = '▾';
        header.classList.remove('collapsed');
      } else {
        body.classList.add('hidden');
        chevron.textContent = '▸';
        header.classList.add('collapsed');
      }
    });
    // Practice button for this subject
    header.querySelector('.bookmark-group-practice').addEventListener('click', (e) => {
      e.stopPropagation();
      quizSource = 'bookmarksScreen';
      quizRoute  = 'bookmarks';
      Quiz.startQuiz(questions);
      showScreen('quizScreen');
      $('quizTopicBar').innerHTML = '';
      renderQuiz();
    });
    list.appendChild(header);

    // ── Question cards inside this group ──────────────────────────────────
    const body = document.createElement('div');
    body.id = groupId;
    body.className = 'bookmark-group-body';
    questions.forEach((q, idx) => {
      const preview = q.question.length > 100 ? q.question.substring(0, 100) + '…' : q.question;
      const examLabel = q.examId ? q.examId.replace(/-/g, ' ').toUpperCase() : '';
      const card = document.createElement('button');
      card.className = 'bookmark-card';
      card.innerHTML = `
        <div class="bookmark-num">${idx + 1}</div>
        <div class="bookmark-content">
          <div class="bookmark-subject">${escapeHtml(examLabel)}</div>
          <div class="bookmark-text">${escapeHtml(preview)}</div>
        </div>
        <div class="bookmark-arrow">›</div>
      `;
      card.addEventListener('click', () => {
        quizSource = 'bookmarksScreen';
        quizRoute  = 'bookmarks';
        Quiz.startQuiz(questions);
        for (let i = 0; i < idx; i++) Quiz.next();
        showScreen('quizScreen');
        $('quizTopicBar').innerHTML = '';
        renderQuiz();
      });
      body.appendChild(card);
    });
    list.appendChild(body);
  });
}

on('practiceBookmarksBtn', () => {
  if (!allBookmarks.length) { toast('No bookmarks to practice'); return; }
  quizSource = 'bookmarksScreen';
  quizRoute  = 'bookmarks';
  Quiz.startQuiz(allBookmarks);
  showScreen('quizScreen');
  $('quizTopicBar').innerHTML = '';
  renderQuiz();
});

// ══════════════════════════════════════════════════════════════════════════════
// NON-TECH SUBSECTION SYSTEM (GS, State GK, Language, Aptitude)
// ══════════════════════════════════════════════════════════════════════════════

let _ntCurrentSection    = null;
let _ntCurrentSubsection = null;
let _ntActiveTab         = 'notes';
let _ntActiveSubject     = 'all';

function renderNTSubsectionList(containerId, subsections, section, backScreen) {
  const container = $(containerId);
  if (!container) return;
  container.innerHTML = '';
  subsections.forEach(sub => {
    const btn = document.createElement('button');
    btn.className = 'subject-card';
    btn.innerHTML = `
      <div class="subject-icon">${sub.icon || '📖'}</div>
      <div class="subject-info">
        <div class="subject-name">${escapeHtml(sub.name)}</div>
        <div class="subject-desc">${escapeHtml((sub.subjects || sub.description ? (sub.subjects||[]).slice(0,4).join(' · ') || sub.description : ''))}</div>
      </div>
      <div class="subject-arrow">›</div>
    `;
    btn.addEventListener('click', () => openNTSubsection(sub, section, backScreen));
    container.appendChild(btn);
  });
}

function openNTSubsection(sub, section, backScreen) {
  _ntCurrentSection    = section;
  _ntCurrentSubsection = sub;
  _ntActiveTab         = 'notes';
  _ntActiveSubject     = 'all';

  $('ntSubsectionTitle').textContent = sub.icon + ' ' + sub.name;
  $('ntSubsectionSub').textContent   = 'Select a tab to study';
  $('ntSubsectionBackBtn').onclick   = () => showScreen(backScreen);

  _renderNTSubjectFilter(sub.subjects || []);

  document.querySelectorAll('.nt-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'notes'));
  document.querySelectorAll('.nt-tab').forEach(tabBtn => {
    tabBtn.onclick = () => {
      document.querySelectorAll('.nt-tab').forEach(t => t.classList.remove('active'));
      tabBtn.classList.add('active');
      _ntActiveTab = tabBtn.dataset.tab;
      _loadNTTabContent();
    };
  });

  showScreen('ntSubsectionScreen');
  _loadNTTabContent();
}

function _renderNTSubjectFilter(subjects) {
  const bar = $('ntSubjectFilterBar');
  if (!bar) return;
  bar.innerHTML = '';
  if (!subjects || subjects.length === 0) { bar.style.display = 'none'; return; }
  bar.style.display = '';
  _ntActiveSubject = 'all';

  const addChip = (label, value) => {
    const btn = document.createElement('button');
    btn.className = 'topic-chip' + (value === _ntActiveSubject ? ' active' : '');
    btn.textContent = label;
    btn.onclick = () => {
      bar.querySelectorAll('.topic-chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      _ntActiveSubject = value;
      _loadNTTabContent();
    };
    bar.appendChild(btn);
  };

  addChip('All', 'all');
  subjects.forEach(s => addChip(s, s));
}

async function _loadNTTabContent() {
  const main = $('ntSubsectionMain');
  const placeholder = $('ntSubsectionPlaceholder');
  if (!main || !_ntCurrentSubsection) return;
  const old = document.getElementById('ntSubsectionMain-rendered');
  if (old) old.remove();
  const oldTB = document.getElementById('ntInlineTopicBar');
  if (oldTB) oldTB.remove();
  if (placeholder) { placeholder.style.display = 'block'; placeholder.querySelector('h3').textContent = 'Loading…'; }

  const sub = _ntCurrentSubsection, section = _ntCurrentSection, tab = _ntActiveTab, subject = _ntActiveSubject;

  if      (tab === 'notes')     await _loadNTNotes(sub, section, subject, main, placeholder);
  else if (tab === 'practice')  await _loadNTQuestions(sub, section, subject, 'practice', main, placeholder);
  else if (tab === 'pyq')       await _loadNTQuestions(sub, section, subject, 'pyq', main, placeholder);
  else if (tab === 'bookmarks') await _loadNTBookmarks(sub, section, subject, main, placeholder);
}

async function _loadNTNotes(sub, section, subject, main, placeholder) {
  let notesData = null;
  try {
    // PRIMARY: Load from new nt_notes collection
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const snap = await getDoc(doc(db, 'nt_notes', sub.id));
    if (snap.exists()) {
      notesData = snap.data();
    } else if (section === 'gs') {
      // FALLBACK: try legacy GS JSON files for existing data (polity, history, etc.)
      notesData = await loadGSNotes(sub.id);
      if (notesData && subject !== 'all') {
        const sub2 = getSubSubjectData(notesData, subject.toLowerCase().replace(/\s+/g,'-'));
        if (sub2) notesData = sub2;
      }
    } else if (section === 'language' && sub.id === 'hindi') {
      notesData = await loadHindiNotes('hindi-grammar');
    }
  } catch(e) { console.warn('[NT] notes load err', e); }

  if (notesData && (notesData.notes?.length > 0 || notesData.topics?.length > 0)) {
    if (placeholder) placeholder.style.display = 'none';
    const topicBar = document.createElement('div');
    topicBar.id = 'ntInlineTopicBar';
    topicBar.className = 'notes-topic-bar';
    topicBar.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);';
    main.insertBefore(topicBar, main.firstChild);
    renderGSNotesContent(notesData, 'ntSubsectionMain', 'ntInlineTopicBar', 'ntSubsectionPlaceholder');
  } else {
    if (placeholder) { placeholder.style.display = 'block'; placeholder.querySelector('h3').textContent = 'Notes coming soon'; }
  }
}

async function _loadNTQuestions(sub, section, subject, type, main, placeholder) {
  try {
    // Load from nt_questions collection, filtered by subsection + type
    const { collection, getDocs, query, where, limit } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const filters = [where('subsection','==', sub.id), where('type','==', type), limit(500)];
    if (subject !== 'all') filters.splice(2, 0, where('subject','==', subject.toLowerCase().replace(/\s+/g,'-')));
    const q = query(collection(db, 'nt_questions'), ...filters);
    const snap = await getDocs(q);
    const questions = [];
    snap.forEach(d => questions.push({ id: d.id, ...d.data() }));

    if (placeholder) placeholder.style.display = 'none';
    const wrap = document.createElement('div');
    wrap.id = 'ntSubsectionMain-rendered';
    main.appendChild(wrap);

    if (questions.length === 0) {
      wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><h3>No questions yet</h3><p class="empty-sub">${type === 'pyq' ? 'PYQ' : 'Practice'} questions for ${escapeHtml(sub.name)} will appear here once admin uploads them.</p></div>`;
      return;
    }
    wrap.innerHTML = `<div style="padding:16px"><div class="subject-card" style="flex-direction:column;align-items:flex-start;gap:8px"><div style="font-weight:700;font-size:15px;">${escapeHtml(sub.icon + ' ' + sub.name)}</div><div style="font-size:13px;color:var(--text-dim)">${questions.length} ${type === 'pyq' ? 'PYQ' : 'practice'} questions available</div><button class="btn-primary" id="ntStartQuiz" style="margin-top:8px;width:100%">Start ${type === 'pyq' ? 'PYQ' : 'Practice'} ▶</button></div></div>`;
    document.getElementById('ntStartQuiz').onclick = () => {
      Quiz.load(questions, { subject: sub.name, type });
      $('quizBackBtn').onclick = () => showScreen('ntSubsectionScreen');
      renderQuiz();
      showScreen('quizScreen');
    };
  } catch(e) {
    console.error('[NT] questions load err', e);
    if (placeholder) { placeholder.style.display = 'block'; placeholder.querySelector('h3').textContent = 'Error loading questions'; }
  }
}

async function _loadNTBookmarks(sub, section, subject, main, placeholder) {
  if (placeholder) placeholder.style.display = 'none';
  const wrap = document.createElement('div');
  wrap.id = 'ntSubsectionMain-rendered';
  wrap.innerHTML = `<div style="padding:16px"><div class="empty-state"><div class="empty-icon">🔖</div><h3>Bookmarks</h3><p class="empty-sub">Questions you bookmark while practising ${escapeHtml(sub.name)} will appear here.</p></div></div>`;
  main.appendChild(wrap);
}

// ── Legacy compatibility functions ──────────────────────────────────────────

function renderGSSubjectList(containerId, subjects, onSelect) {
  renderNTSubsectionList(containerId, subjects, 'gs', 'ntGsHomeScreen');
}

let _currentGSSubject = null;
async function openGSSubject(subj) {
  _currentGSSubject = subj;
  openNTSubsection(subj, 'gs', 'ntGsHomeScreen');
}
async function openGSSubSubject(parentSubj, sub, preloadedData) {
  await _loadAndShowGSNotes(parentSubj.id, sub.icon + ' ' + sub.name, 'ntSubsectionScreen', sub.id, preloadedData);
}
async function _loadAndShowGSNotes(subjectId, title, backScreen, subSubjectId, preloadedData) {
  $('gsNotesTitle').textContent = title;
  $('gsNotesSub').textContent = 'Topic-wise detailed notes';
  $('gsPlaceholder').style.display = 'block';
  $('gsPlaceholder').querySelector('h3').textContent = 'Loading…';
  const oldEl = document.getElementById('gsNotesMain-rendered');
  if (oldEl) oldEl.remove();
  $('gsTopicBar').innerHTML = '';
  const backBtn = $('gsNotesBackBtn');
  if (backBtn) backBtn.onclick = () => showScreen(backScreen);
  showScreen('gsNotesScreen');
  const fullData = preloadedData || await loadGSNotes(subjectId);
  if (!fullData) { $('gsPlaceholder').querySelector('h3').textContent = 'Notes coming soon'; return; }
  let notesData = fullData;
  if (subSubjectId) { const s = getSubSubjectData(fullData, subSubjectId); if (s) notesData = s; }
  $('gsPlaceholder').style.display = 'none';
  renderGSNotesContent(notesData, 'gsNotesMain', 'gsTopicBar', 'gsPlaceholder');
}
async function openHindiSubject(subj) {
  openNTSubsection(subj, 'language', 'ntLanguageHomeScreen');
}

// ══════════════════════════════════════════════════════════════════════════════
// QUIZ RENDERER
// ══════════════════════════════════════════════════════════════════════════════

const quizAnswerMap = {};

async function renderQuiz() {
  const q = Quiz.getCurrent();
  if (!q) { toast('No question to show'); goBackFromQuiz(); return; }

  const { current, total } = Quiz.getProgress();
  $('quizProgress').textContent = `${current} / ${total}`;
  $('quizSrNo').textContent = `Q.${current}`;
  const fill = $('quizProgressFill');
  if (fill) fill.style.width = `${(current / total) * 100}%`;

  $('quizSubjectTag').textContent = q.subject
    ? q.subject.replace(/-/g, ' ').split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
    : 'General';
  $('quizYearTag').textContent = q.year ? `${q.year}` : '—';

  const examTag = $('quizExamTag');
  if (quizRoute === 'pyq') {
    const examLabel = q.exam_name || (currentExam ? (currentExam.fullName || currentExam.name) : null) || null;
    if (examLabel) { examTag.textContent = examLabel; examTag.classList.remove('hidden'); }
    else examTag.classList.add('hidden');
  } else {
    examTag.classList.add('hidden');
  }

  $('quizQuestion').textContent = q.question;

  // Show question image if present
  const imgEl = $('quizQuestionImage');
  if (q.image) {
    imgEl.src = q.image;
    imgEl.classList.remove('hidden');
    imgEl.onclick = () => {
      // Open full-screen preview on tap
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;cursor:zoom-out';
      overlay.innerHTML = `<img src="${q.image}" style="max-width:100%;max-height:90vh;border-radius:8px;object-fit:contain"/>`;
      overlay.onclick = () => overlay.remove();
      document.body.appendChild(overlay);
    };
  } else {
    imgEl.classList.add('hidden');
    imgEl.src = '';
  }

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

function openJumpPanel() {
  const { total, current } = Quiz.getProgress();
  const grid = $('jumpGrid');
  grid.innerHTML = '';
  for (let i = 1; i <= total; i++) {
    const btn = document.createElement('button');
    btn.className = 'jump-btn';
    btn.textContent = i;
    const state = quizAnswerMap[i - 1];
    if (i === current)            btn.classList.add('current');
    else if (state === 'correct') btn.classList.add('answered');
    else if (state === 'wrong')   btn.classList.add('wrong');
    btn.addEventListener('click', () => { Quiz.jumpTo(i - 1); closeJumpPanel(); renderQuiz(); });
    grid.appendChild(btn);
  }
  $('jumpPanel').classList.remove('hidden');
}

function closeJumpPanel() { $('jumpPanel').classList.add('hidden'); }

on('quizGridBtn', openJumpPanel);
on('jumpCloseBtn', closeJumpPanel);
on('jumpPanel', e => { if (e.target === $('jumpPanel')) closeJumpPanel(); });

async function updateBookmarkBtn(q) {
  if (!currentUser) { $('quizBookmarkBtn').textContent = '☆'; return; }
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

on('quizNextBtn', () => {
  if (Quiz.next()) renderQuiz();
  else { toast('Quiz complete! 🎉'); setTimeout(goBackFromQuiz, 800); }
});

on('quizPrevBtn', () => { if (Quiz.prev()) renderQuiz(); });
on('quizBackBtn', goBackFromQuiz);

function goBackFromQuiz() { showScreen(quizSource || 'homeScreen'); }

on('quizBookmarkBtn', async () => {
  const q = Quiz.getCurrent();
  if (!q || !currentUser) { toast('Sign in to bookmark'); return; }
  if (!q.id) { toast('Cannot bookmark this question'); return; }
  const qWithExam = { ...q, examId: q.examId || (currentExam ? currentExam.id : 'practice') };
  const marked = $('quizBookmarkBtn').dataset.marked === '1';
  if (marked) {
    const ok = await removeBookmark(currentUser.uid, qWithExam);
    if (ok) {
      $('quizBookmarkBtn').textContent = '☆'; $('quizBookmarkBtn').dataset.marked = '0';
      allBookmarks = allBookmarks.filter(b => b.id !== q.id);
      toast('Removed from bookmarks');
    } else toast('Failed to remove bookmark');
  } else {
    const ok = await addBookmark(currentUser.uid, qWithExam);
    if (ok) {
      $('quizBookmarkBtn').textContent = '★'; $('quizBookmarkBtn').dataset.marked = '1';
      allBookmarks.unshift(qWithExam);
      toast('Bookmarked ★');
    } else toast('Failed to bookmark');
  }
});

// ═══════════════════════════════════════════════════
// REPORT QUESTION FEATURE
// ═══════════════════════════════════════════════════

function openReportModal() {
  const q = Quiz.getCurrent();
  if (!q) return;
  const preview = q.question.length > 100 ? q.question.slice(0, 100) + '…' : q.question;
  $('reportQuestionText').textContent = preview;
  $('reportIssueType').value = 'wrong-answer';
  $('reportUserMsg').value = '';
  $('reportModal').classList.remove('hidden');
}

function closeReportModal() {
  $('reportModal').classList.add('hidden');
}

async function onSubmitReport() {
  const q = Quiz.getCurrent();
  if (!q) return;
  const issueType = $('reportIssueType').value;
  const userMsg   = $('reportUserMsg').value.trim();
  if (!issueType) { toast('Please select an issue type'); return; }
  const btn = $('reportSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Sending…';
  const ok = await submitQuestionReport({ q, issueType, userMsg, currentUser, currentExam });
  btn.disabled = false;
  btn.textContent = 'Submit Report';
  if (ok) { closeReportModal(); toast('Report sent! Thank you 🙏'); }
  else toast('Failed to send report. Try again.');
}

on('quizReportBtn',   openReportModal);
on('reportCloseBtn',  closeReportModal);
on('reportCancelBtn', closeReportModal);
on('reportSubmitBtn', onSubmitReport);
on('reportModal', e => { if (e.target === $('reportModal')) closeReportModal(); });
