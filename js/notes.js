// ===== NOTES RENDERING & TOPIC FILTERING =====

let currentNotesData = null;
let currentFilteredTopicId = null;

/**
 * Render notes for a specific subject with topic filtering
 * @param {string} subjectId - Subject ID (e.g., 'building-materials')
 * @param {string} subjectName - Display name
 * @param {Object} notesData - Full notes data for this subject
 * @param {number} selectedTopicId - Optional: pre-select a topic
 */
export function renderNotes(subjectId, subjectName, notesData, selectedTopicId = null) {
  currentNotesData = notesData;
  
  // Update header
  const $ = id => document.getElementById(id);
  $('notesTitle').textContent = subjectName + ' — Notes';
  $('notesContextLabel').textContent = `${currentExam.name} · ${currentStage.name}`;
  $('notesSubjectName').textContent = subjectName;
  
  // Render topic filter chips (from notesData.topics)
  const topicBar = $('notesTopicBar');
  topicBar.innerHTML = '';
  
  if (notesData.topics && notesData.topics.length > 0) {
    // "All Topics" chip
    const allChip = document.createElement('button');
    allChip.className = 'topic-chip active';
    allChip.textContent = 'All Topics';
    allChip.dataset.topicId = 'all';
    allChip.addEventListener('click', () => {
      filterNotes('all');
      updateTopicChips('all');
    });
    topicBar.appendChild(allChip);
    
    // Individual topic chips
    notesData.topics.forEach(topic => {
      const chip = document.createElement('button');
      chip.className = 'topic-chip';
      chip.textContent = topic.name;
      chip.dataset.topicId = topic.id;
      chip.addEventListener('click', () => {
        filterNotes(topic.id);
        updateTopicChips(topic.id);
      });
      topicBar.appendChild(chip);
    });
  }
  
  // Render notes cards
  renderNotesCards(notesData);
  
  // Apply initial filter if provided
  if (selectedTopicId !== null) {
    filterNotes(selectedTopicId);
    updateTopicChips(selectedTopicId);
  } else {
    filterNotes('all');
    updateTopicChips('all');
  }
  
  showScreen('notesScreen');
}

/**
 * Render all notes cards (before filtering)
 */
function renderNotesCards(notesData) {
  const container = document.querySelector('.subjects-main');
  
  // Clear placeholder
  container.innerHTML = '';
  
  // Render topic filter bar (already done above)
  const topicBar = document.createElement('div');
  topicBar.id = 'notesTopicBar';
  topicBar.className = 'quiz-topic-bar';
  topicBar.style.padding = '0 0 8px';
  container.appendChild(topicBar);
  
  // Main notes container
  const notesContainer = document.createElement('div');
  notesContainer.className = 'notes-container';
  
  if (!notesData.notes || notesData.notes.length === 0) {
    container.innerHTML += '<div class="empty-state"><div class="empty-icon">📝</div><h3>No notes available</h3></div>';
    return;
  }
  
  notesData.notes.forEach(section => {
    if (!section.cards || section.cards.length === 0) return;
    
    // Topic section wrapper
    const topicSection = document.createElement('div');
    topicSection.className = 'notes-section';
    topicSection.dataset.topicId = section.topic_id;
    
    // Topic header
    const topicHeader = document.createElement('h3');
    topicHeader.className = 'notes-topic-header';
    topicHeader.textContent = section.topic_name;
    topicSection.appendChild(topicHeader);
    
    // Cards for this topic
    section.cards.forEach(card => {
      const cardEl = renderCard(card);
      topicSection.appendChild(cardEl);
    });
    
    notesContainer.appendChild(topicSection);
  });
  
  container.appendChild(notesContainer);
}

/**
 * Render a single card
 */
function renderCard(card) {
  const cardEl = document.createElement('div');
  cardEl.className = `notes-card notes-card-${card.color || 'blue'}`;
  
  // Heading
  const heading = document.createElement('h4');
  heading.className = 'notes-card-heading';
  heading.textContent = card.heading;
  cardEl.appendChild(heading);
  
  // Formulas/key content
  if (card.formulas && Array.isArray(card.formulas)) {
    card.formulas.forEach(formula => {
      const formulaDiv = document.createElement('div');
      formulaDiv.className = 'notes-formula';
      
      const label = document.createElement('div');
      label.className = 'notes-formula-label';
      label.textContent = formula.label;
      formulaDiv.appendChild(label);
      
      const text = document.createElement('pre');
      text.className = 'notes-formula-text';
      text.textContent = formula.text;
      formulaDiv.appendChild(text);
      
      cardEl.appendChild(formulaDiv);
    });
  }
  
  // Points/bullets
  if (card.points && Array.isArray(card.points)) {
    const pointsList = document.createElement('ul');
    pointsList.className = 'notes-points';
    
    card.points.forEach(point => {
      const li = document.createElement('li');
      li.textContent = point;
      pointsList.appendChild(li);
    });
    
    cardEl.appendChild(pointsList);
  }
  
  // Table
  if (card.table) {
    const tableDiv = document.createElement('div');
    tableDiv.className = 'notes-table-wrapper';
    
    const table = document.createElement('table');
    table.className = 'notes-table';
    
    // Headers
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    card.table.headers.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Rows
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
    table.appendChild(tbody);
    
    tableDiv.appendChild(table);
    cardEl.appendChild(tableDiv);
  }
  
  // Alert box
  if (card.alert) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'notes-alert';
    alertDiv.textContent = card.alert;
    cardEl.appendChild(alertDiv);
  }
  
  // Image
  if (card.image) {
    const img = document.createElement('img');
    img.src = card.image;
    img.className = 'notes-image';
    cardEl.appendChild(img);
  }
  
  return cardEl;
}

/**
 * Filter notes by topic
 */
function filterNotes(topicId) {
  currentFilteredTopicId = topicId;
  
  const sections = document.querySelectorAll('.notes-section');
  sections.forEach(section => {
    if (topicId === 'all') {
      section.style.display = 'block';
    } else {
      section.style.display = section.dataset.topicId == topicId ? 'block' : 'none';
    }
  });
}

/**
 * Update active state of topic chips
 */
function updateTopicChips(topicId) {
  const chips = document.querySelectorAll('#notesTopicBar .topic-chip');
  chips.forEach(chip => {
    if (chip.dataset.topicId == topicId) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

/**
 * Get notes data for a subject (called from db.js)
 */
export async function loadNotesForSubject(subjectId) {
  try {
    const response = await fetch('data/notes-combined.json');
    const allNotes = await response.json();
    return allNotes[subjectId] || null;
  } catch (error) {
    console.error('Error loading notes:', error);
    return null;
  }
}
