// ===== NOTES MODULE =====
// Reads from Firestore first (admin-uploaded), falls back to bundled JSON.
// Exports: loadNotesForSubject, renderNotesContent

import { db } from './firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const _fsCache  = {};   // subjectId → Firestore data
const _jsonCache = {};  // subjectId → JSON data
const NOTES_VERSION = 'v11-notes-1';

/** Load notes for a subject — Firestore first, JSON fallback */
export async function loadNotesForSubject(subjectId) {
  // 1. Firestore cache
  if (_fsCache[subjectId] !== undefined) return _fsCache[subjectId];

  // 2. Try Firestore
  try {
    const snap = await getDoc(doc(db, 'notes', subjectId));
    if (snap.exists()) {
      const d = snap.data();
      _fsCache[subjectId] = d;
      console.log(`[notes] Loaded "${subjectId}" from Firestore (${d.totalCards||'?'} cards)`);
      return d;
    }
  } catch(e) {
    console.warn('[notes] Firestore fetch failed, falling back to JSON:', e.message);
  }

  // 3. JSON fallback
  if (_jsonCache['_all'] === undefined) {
    try {
      const url = 'data/notes-combined.json?v=' + NOTES_VERSION;
      const r   = await fetch(url, { cache: 'no-cache' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      _jsonCache['_all'] = await r.json();
    } catch(e) {
      console.error('[notes] JSON fallback failed:', e);
      _jsonCache['_all'] = {};
    }
  }

  const jsonData = _jsonCache['_all'][subjectId] || null;
  _fsCache[subjectId] = jsonData; // cache null too to avoid repeat attempts
  if (jsonData) console.log(`[notes] Loaded "${subjectId}" from JSON fallback`);
  return jsonData;
}

/** Invalidate cache for a subject (call after admin edits) */
export function invalidateNotesCache(subjectId) {
  delete _fsCache[subjectId];
}

/**
 * Build the notes UI inside #notesMain.
 */
export function renderNotesContent(data, activeTopic) {
  var main        = document.getElementById('notesMain');
  var topicBar    = document.getElementById('notesTopicBar');
  var placeholder = document.getElementById('notesPlaceholder');

  if (placeholder) placeholder.style.display = 'none';

  var old = document.getElementById('notesRendered');
  if (old) old.remove();

  topicBar.innerHTML = '';
  if (data.topics && data.topics.length) {
    addChip(topicBar, 'All', 'all', activeTopic == null);
    data.topics.forEach(function(t) {
      addChip(topicBar, t.name, t.id, activeTopic == t.id);
    });
  }

  var wrap = document.createElement('div');
  wrap.id = 'notesRendered';
  wrap.className = 'notes-container';

  if (!data.notes || !data.notes.length) {
    wrap.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><h3>No notes content</h3></div>';
    main.appendChild(wrap);
    return;
  }

  data.notes.forEach(function(section) {
    if (!section.cards || !section.cards.length) return;
    var sec = document.createElement('div');
    sec.className = 'notes-section';
    sec.setAttribute('data-topic-id', section.topic_id);
    var h3 = document.createElement('h3');
    h3.className = 'notes-topic-header';
    h3.textContent = section.topic_name;
    sec.appendChild(h3);
    section.cards.forEach(function(c) { sec.appendChild(buildCard(c)); });
    wrap.appendChild(sec);
  });

  main.appendChild(wrap);
  applyFilter(wrap, activeTopic != null ? activeTopic : 'all');
}

// ── helpers ──────────────────────────────────────────────────

function addChip(bar, label, id, isActive) {
  var btn = document.createElement('button');
  btn.className = 'topic-chip' + (isActive ? ' active' : '');
  btn.textContent = label;
  btn.addEventListener('click', function() {
    bar.querySelectorAll('.topic-chip').forEach(function(c) { c.classList.remove('active'); });
    btn.classList.add('active');
    var wrap = document.getElementById('notesRendered');
    if (wrap) applyFilter(wrap, id);
  });
  bar.appendChild(btn);
}

function buildCard(card) {
  var el = document.createElement('div');
  el.className = 'notes-card notes-card-' + (card.color || 'blue');

  var h4 = document.createElement('h4');
  h4.className = 'notes-card-heading';
  h4.textContent = card.heading;
  el.appendChild(h4);

  if (card.formulas) card.formulas.forEach(function(f) {
    var d   = document.createElement('div');
    d.className = 'notes-formula';
    var lbl = document.createElement('div');
    lbl.className = 'notes-formula-label';
    lbl.textContent = f.label;
    d.appendChild(lbl);
    var pre = document.createElement('pre');
    pre.className = 'notes-formula-text';
    pre.textContent = f.text;
    d.appendChild(pre);
    el.appendChild(d);
  });

  if (card.points && card.points.length) {
    var ul = document.createElement('ul');
    ul.className = 'notes-points';
    card.points.forEach(function(p) {
      var li = document.createElement('li');
      li.textContent = p;
      ul.appendChild(li);
    });
    el.appendChild(ul);
  }

  if (card.table) {
    var tw   = document.createElement('div');
    tw.className = 'notes-table-wrapper';
    var tbl  = document.createElement('table');
    tbl.className = 'notes-table';
    var thead = document.createElement('thead');
    var hr    = document.createElement('tr');
    card.table.headers.forEach(function(h) {
      var th = document.createElement('th'); th.textContent = h; hr.appendChild(th);
    });
    thead.appendChild(hr); tbl.appendChild(thead);
    var tbody = document.createElement('tbody');
    card.table.rows.forEach(function(row) {
      var tr = document.createElement('tr');
      row.forEach(function(cell) {
        var td = document.createElement('td'); td.textContent = cell; tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody); tw.appendChild(tbl); el.appendChild(tw);
  }

  if (card.alert) {
    var a = document.createElement('div');
    a.className = 'notes-alert';
    a.textContent = card.alert;
    el.appendChild(a);
  }

  if (card.image) {
    var img = document.createElement('img');
    img.src = card.image; img.className = 'notes-image';
    el.appendChild(img);
  }

  return el;
}

function applyFilter(wrap, topicId) {
  wrap.querySelectorAll('.notes-section').forEach(function(sec) {
    var tid = sec.getAttribute('data-topic-id');
    sec.style.display = (topicId === 'all' || tid == topicId) ? '' : 'none';
  });
  var main = document.getElementById('notesMain');
  if (main) main.scrollTop = 0;
}
