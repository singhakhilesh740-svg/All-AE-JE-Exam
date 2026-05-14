// ===== NOTES RENDERING & TOPIC FILTERING =====
// Called from app.js — renders notes inside #notesScreen

let _notesCache = null;

/**
 * Load notes JSON (cached after first fetch)
 */
export async function loadNotesForSubject(subjectId) {
  try {
    if (!_notesCache) {
      const response = await fetch('data/notes-combined.json');
      _notesCache = await response.json();
    }
    return _notesCache[subjectId] || null;
  } catch (error) {
    console.error('Error loading notes:', error);
    return null;
  }
}

/**
 * Render notes inside #notesScreen
 * Called from app.js which handles showScreen, header text, etc.
 * This function ONLY builds DOM inside the notes <main>.
 */
export function renderNotesContent(notesData, selectedTopicId) {
  const screen = document.getElementById('notesScreen');
  const container = screen.querySelector('main');
  const topicBar = document.getElementById('notesTopicBar');

  // Clear previous notes content (everything after topicBar)
  while (topicBar.nextSibling) {
    container.removeChild(topicBar.nextSibling);
  }

  // Build topic chips
  topicBar.innerHTML = '';

  if (notesData.topics && notesData.topics.length > 0) {
    // "All" chip
    const allChip = document.createElement('button');
    allChip.className = 'topic-chip' + (selectedTopicId == null ? ' active' : '');
    allChip.textContent = 'All';
    allChip.addEventListener('click', () => {
      setActiveChip(topicBar, allChip);
      filterSections(container, 'all');
    });
    topicBar.appendChild(allChip);

    notesData.topics.forEach(t => {
      const chip = document.createElement('button');
      chip.className = 'topic-chip' + (selectedTopicId == t.id ? ' active' : '');
      chip.textContent = t.name;
      chip.addEventListener('click', () => {
        setActiveChip(topicBar, chip);
        filterSections(container, t.id);
      });
      topicBar.appendChild(chip);
    });
  }

  // Build notes cards grouped by topic
  if (!notesData.notes || notesData.notes.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<div class="empty-icon">📝</div><h3>No notes available</h3>';
    container.appendChild(empty);
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'notes-container';

  notesData.notes.forEach(section => {
    if (!section.cards || section.cards.length === 0) return;

    const sec = document.createElement('div');
    sec.className = 'notes-section';
    sec.dataset.topicId = section.topic_id;

    const h = document.createElement('h3');
    h.className = 'notes-topic-header';
    h.textContent = section.topic_name;
    sec.appendChild(h);

    section.cards.forEach(c => sec.appendChild(buildCard(c)));
    wrap.appendChild(sec);
  });

  container.appendChild(wrap);

  // apply initial filter
  filterSections(container, selectedTopicId != null ? selectedTopicId : 'all');
}

// ── card builder ──────────────────────────────────────────────

function buildCard(card) {
  const el = document.createElement('div');
  el.className = 'notes-card notes-card-' + (card.color || 'blue');

  // heading
  const h = document.createElement('h4');
  h.className = 'notes-card-heading';
  h.textContent = card.heading;
  el.appendChild(h);

  // formulas
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

  // points
  if (card.points && card.points.length) {
    const ul = document.createElement('ul');
    ul.className = 'notes-points';
    card.points.forEach(p => {
      const li = document.createElement('li');
      li.textContent = p;
      ul.appendChild(li);
    });
    el.appendChild(ul);
  }

  // table
  if (card.table) {
    const tw = document.createElement('div');
    tw.className = 'notes-table-wrapper';
    const tbl = document.createElement('table');
    tbl.className = 'notes-table';

    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    card.table.headers.forEach(hdr => {
      const th = document.createElement('th');
      th.textContent = hdr;
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    tbl.appendChild(thead);

    const tbody = document.createElement('tbody');
    card.table.rows.forEach(row => {
      const tr = document.createElement('tr');
      row.forEach(cell => {
        const td = document.createElement('td');
        td.textContent = cell;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    tw.appendChild(tbl);
    el.appendChild(tw);
  }

  // alert
  if (card.alert) {
    const a = document.createElement('div');
    a.className = 'notes-alert';
    a.textContent = card.alert;
    el.appendChild(a);
  }

  // image
  if (card.image) {
    const img = document.createElement('img');
    img.src = card.image;
    img.className = 'notes-image';
    el.appendChild(img);
  }

  return el;
}

// ── helpers ───────────────────────────────────────────────────

function filterSections(container, topicId) {
  container.querySelectorAll('.notes-section').forEach(sec => {
    sec.style.display = (topicId === 'all' || sec.dataset.topicId == topicId) ? '' : 'none';
  });
}

function setActiveChip(bar, active) {
  bar.querySelectorAll('.topic-chip').forEach(c => c.classList.remove('active'));
  active.classList.add('active');
}
