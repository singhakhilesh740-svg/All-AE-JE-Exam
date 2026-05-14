// ===== NOTES MODULE =====
// Renders notes cards inside #notesScreen.
// Exports: loadNotesForSubject, renderNotesContent

let _cache = null;

/** Fetch + cache the combined notes JSON */
export async function loadNotesForSubject(subjectId) {
  try {
    if (!_cache) {
      const r = await fetch('data/notes-combined.json');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      _cache = await r.json();
    }
    return _cache[subjectId] || null;
  } catch (e) {
    console.error('[notes] load error:', e);
    return null;
  }
}

/**
 * Build the notes UI inside #notesMain.
 * - Hides the "Notes coming soon" placeholder
 * - Fills #notesTopicBar with topic chips
 * - Appends colour-coded cards
 *
 * @param {Object} data  — one subject entry from notes-combined.json
 * @param {*} activeTopic — pre-selected topic id, or null for "All"
 */
export function renderNotesContent(data, activeTopic) {
  var main      = document.getElementById('notesMain');
  var topicBar  = document.getElementById('notesTopicBar');
  var placeholder = document.getElementById('notesPlaceholder');

  // 1. Hide the static placeholder
  if (placeholder) placeholder.style.display = 'none';

  // 2. Remove any previously rendered notes container
  var old = document.getElementById('notesRendered');
  if (old) old.remove();

  // 3. Build topic chips
  topicBar.innerHTML = '';
  if (data.topics && data.topics.length) {
    addChip(topicBar, 'All', 'all', activeTopic == null);
    data.topics.forEach(function (t) {
      addChip(topicBar, t.name, t.id, activeTopic == t.id);
    });
  }

  // 4. Build notes container
  var wrap = document.createElement('div');
  wrap.id = 'notesRendered';
  wrap.className = 'notes-container';

  if (!data.notes || !data.notes.length) {
    wrap.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><h3>No notes content</h3></div>';
    main.appendChild(wrap);
    return;
  }

  data.notes.forEach(function (section) {
    if (!section.cards || !section.cards.length) return;

    var sec = document.createElement('div');
    sec.className = 'notes-section';
    sec.setAttribute('data-topic-id', section.topic_id);

    var h3 = document.createElement('h3');
    h3.className = 'notes-topic-header';
    h3.textContent = section.topic_name;
    sec.appendChild(h3);

    section.cards.forEach(function (c) { sec.appendChild(buildCard(c)); });
    wrap.appendChild(sec);
  });

  main.appendChild(wrap);

  // 5. Apply initial filter
  applyFilter(wrap, activeTopic != null ? activeTopic : 'all');
}

// ── chip builder ──────────────────────────────────────────────

function addChip(bar, label, id, isActive) {
  var btn = document.createElement('button');
  btn.className = 'topic-chip' + (isActive ? ' active' : '');
  btn.textContent = label;
  btn.addEventListener('click', function () {
    bar.querySelectorAll('.topic-chip').forEach(function (c) { c.classList.remove('active'); });
    btn.classList.add('active');
    var wrap = document.getElementById('notesRendered');
    if (wrap) applyFilter(wrap, id);
  });
  bar.appendChild(btn);
}

// ── card builder ──────────────────────────────────────────────

function buildCard(card) {
  var el = document.createElement('div');
  el.className = 'notes-card notes-card-' + (card.color || 'blue');

  var h4 = document.createElement('h4');
  h4.className = 'notes-card-heading';
  h4.textContent = card.heading;
  el.appendChild(h4);

  // formulas
  if (card.formulas) card.formulas.forEach(function (f) {
    var d = document.createElement('div');
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

  // points
  if (card.points && card.points.length) {
    var ul = document.createElement('ul');
    ul.className = 'notes-points';
    card.points.forEach(function (p) {
      var li = document.createElement('li');
      li.textContent = p;
      ul.appendChild(li);
    });
    el.appendChild(ul);
  }

  // table
  if (card.table) {
    var tw = document.createElement('div');
    tw.className = 'notes-table-wrapper';
    var tbl = document.createElement('table');
    tbl.className = 'notes-table';
    var thead = document.createElement('thead');
    var hr = document.createElement('tr');
    card.table.headers.forEach(function (h) {
      var th = document.createElement('th'); th.textContent = h; hr.appendChild(th);
    });
    thead.appendChild(hr); tbl.appendChild(thead);
    var tbody = document.createElement('tbody');
    card.table.rows.forEach(function (row) {
      var tr = document.createElement('tr');
      row.forEach(function (cell) {
        var td = document.createElement('td'); td.textContent = cell; tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody); tw.appendChild(tbl); el.appendChild(tw);
  }

  // alert
  if (card.alert) {
    var a = document.createElement('div');
    a.className = 'notes-alert';
    a.textContent = card.alert;
    el.appendChild(a);
  }

  // image
  if (card.image) {
    var img = document.createElement('img');
    img.src = card.image; img.className = 'notes-image';
    el.appendChild(img);
  }

  return el;
}

// ── filter ────────────────────────────────────────────────────

function applyFilter(wrap, topicId) {
  wrap.querySelectorAll('.notes-section').forEach(function (sec) {
    var tid = sec.getAttribute('data-topic-id');
    sec.style.display = (topicId === 'all' || tid == topicId) ? '' : 'none';
  });
}
