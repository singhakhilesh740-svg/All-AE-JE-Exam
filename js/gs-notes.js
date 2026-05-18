// gs-notes.js — General Studies & Hindi Notes Module
// Handles loading, rendering, topic filtering for GS and Hindi notes

const GS_VERSION  = 'v1-gs-notes-1';
const HI_VERSION  = 'v1-hi-notes-1';
let _gsCache  = null;
let _hiCache  = null;

// ── Loaders ────────────────────────────────────────────────────────────────

export async function loadGSNotes(subjectId) {
  try {
    if (!_gsCache) {
      const r = await fetch('data/gs-notes.json?v=' + GS_VERSION, { cache: 'no-cache' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      _gsCache = await r.json();
    }
    return _gsCache[subjectId] || null;
  } catch (e) {
    console.error('[gs-notes] load error:', e);
    return null;
  }
}

export async function loadHindiNotes(subjectId) {
  try {
    if (!_hiCache) {
      const r = await fetch('data/hindi-notes.json?v=' + HI_VERSION, { cache: 'no-cache' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      _hiCache = await r.json();
    }
    return _hiCache[subjectId] || null;
  } catch (e) {
    console.error('[hindi-notes] load error:', e);
    return null;
  }
}

// ── Renderer (shared for GS + Hindi) ─────────────────────────────────────

/**
 * @param {Object} data        — subject notes data from JSON
 * @param {string} mainId      — DOM id of the <main> element
 * @param {string} topicBarId  — DOM id of the topic bar container
 * @param {string} placeholderId
 */
export function renderGSNotesContent(data, mainId, topicBarId, placeholderId) {
  const main        = document.getElementById(mainId);
  const topicBar    = document.getElementById(topicBarId);
  const placeholder = document.getElementById(placeholderId);

  if (placeholder) placeholder.style.display = 'none';

  // Remove old rendered content
  const old = document.getElementById(mainId + '-rendered');
  if (old) old.remove();

  // Build topic chips
  topicBar.innerHTML = '';
  if (data.topics && data.topics.length) {
    _addChip(topicBar, 'All', 'all', true, mainId);
    data.topics.forEach(t => _addChip(topicBar, t.name, t.id, false, mainId));
  }

  // Build notes container
  const wrap = document.createElement('div');
  wrap.id = mainId + '-rendered';
  wrap.className = 'notes-container';

  if (!data.notes || !data.notes.length) {
    wrap.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><h3>No content yet</h3></div>';
    main.appendChild(wrap);
    return;
  }

  data.notes.forEach(section => {
    if (!section.cards || !section.cards.length) return;
    const sec = document.createElement('div');
    sec.className = 'notes-section';
    sec.setAttribute('data-topic-id', section.topic_id);

    const h3 = document.createElement('h3');
    h3.className = 'notes-topic-header';
    h3.textContent = section.topic_name;
    sec.appendChild(h3);

    section.cards.forEach(c => sec.appendChild(_buildCard(c)));
    wrap.appendChild(sec);
  });

  main.appendChild(wrap);
  _applyFilter(wrap, 'all');
}

// ── Internal helpers ───────────────────────────────────────────────────────

function _addChip(bar, label, id, isActive, mainId) {
  const btn = document.createElement('button');
  btn.className = 'topic-chip' + (isActive ? ' active' : '');
  btn.textContent = label;
  btn.addEventListener('click', () => {
    bar.querySelectorAll('.topic-chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const wrap = document.getElementById(mainId + '-rendered');
    if (wrap) _applyFilter(wrap, id);
    // scroll back to top
    const m = document.getElementById(mainId);
    if (m) m.scrollTop = 0;
  });
  bar.appendChild(btn);
}

function _applyFilter(wrap, topicId) {
  wrap.querySelectorAll('.notes-section').forEach(sec => {
    const tid = sec.getAttribute('data-topic-id');
    sec.style.display = (topicId === 'all' || tid === topicId) ? '' : 'none';
  });
}

function _buildCard(card) {
  const el = document.createElement('div');
  el.className = 'notes-card notes-card-' + (card.color || 'blue');

  // Heading
  const h4 = document.createElement('h4');
  h4.className = 'notes-card-heading';
  h4.textContent = card.heading;
  el.appendChild(h4);

  // Formula blocks
  if (card.formulas) {
    card.formulas.forEach(f => {
      const d = document.createElement('div');
      d.className = 'notes-formula';
      const lbl = document.createElement('div');
      lbl.className = 'notes-formula-label';
      lbl.textContent = f.label;
      d.appendChild(lbl);
      const pre = document.createElement('pre');
      pre.className = 'notes-formula-text';
      pre.textContent = f.text;
      d.appendChild(pre);
      el.appendChild(d);
    });
  }

  // Points
  if (card.points && card.points.length) {
    const ul = document.createElement('ul');
    ul.className = 'notes-points';
    card.points.forEach(p => {
      const li = document.createElement('li');
      // Support inline highlighting: **text** → yellow highlight
      li.innerHTML = _parseHighlights(p);
      ul.appendChild(li);
    });
    el.appendChild(ul);
  }

  // Table
  if (card.table) {
    const tw = document.createElement('div');
    tw.className = 'notes-table-wrapper';
    const tbl = document.createElement('table');
    tbl.className = 'notes-table';

    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    card.table.headers.forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    tbl.appendChild(thead);

    const tbody = document.createElement('tbody');
    card.table.rows.forEach(row => {
      const tr = document.createElement('tr');
      row.forEach((cell, ci) => {
        const td = document.createElement('td');
        // First column gets accent color
        if (ci === 0) td.style.color = 'var(--accent)';
        td.innerHTML = _parseHighlights(cell);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    tw.appendChild(tbl);
    el.appendChild(tw);
  }

  // Alert / important note — shown in coloured box
  if (card.alert) {
    const a = document.createElement('div');
    a.className = 'notes-alert';
    a.innerHTML = _parseHighlights(card.alert);
    el.appendChild(a);
  }

  return el;
}

// Parse **text** → highlighted span, and ★/⭐ lines get special treatment
function _parseHighlights(str) {
  if (!str) return '';
  // Escape HTML first
  const escaped = str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // Bold **text** → yellow highlight
  return escaped.replace(/\*\*(.+?)\*\*/g,
    '<span class="hi-yellow">$1</span>');
}
