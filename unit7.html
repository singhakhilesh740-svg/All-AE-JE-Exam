// pcb-notes.js — uniform <h2>-based topic chips for all PCB units

export const SUBJECTS_PCB_NOTES = [
  { id: 'unit1',  file: 'data/pcb/unit1.html',  icon: '💧', name: 'Unit 1 — Water Supply Engineering',       description: '~15–18 Qs · Water quality, Treatment, Distribution' },
  { id: 'unit2',  file: 'data/pcb/unit2.html',  icon: '🚰', name: 'Unit 2 — Wastewater Treatment',           description: '~13–16 Qs · BOD, ASP, Trickling filter, Sludge' },
  { id: 'unit3',  file: 'data/pcb/unit3.html',  icon: '💨', name: 'Unit 3 — Air Pollution & Control',        description: '~10–13 Qs · Pollutants, Dispersion, ESP, Scrubbers' },
  { id: 'unit4',  file: 'data/pcb/unit4.html',  icon: '🗑️', name: 'Unit 4 — Solid & Hazardous Waste',       description: '~8–10 Qs · MSW, Landfill, E-waste, Biomedical' },
  { id: 'unit5',  file: 'data/pcb/unit5.html',  icon: '⚖️', name: 'Unit 5 — Environmental Legislation',     description: '~8–10 Qs · EPA, Water Act, Air Act, NGT, EIA' },
  { id: 'unit6',  file: 'data/pcb/unit6.html',  icon: '📋', name: 'Unit 6 — EIA & Environmental Mgmt',      description: '~5–7 Qs · EIA process, ISO 14001, AQI, LCA' },
  { id: 'unit7',  file: 'data/pcb/unit7.html',  icon: '🔊', name: 'Unit 7 — Noise Pollution & Radiation',   description: '~3–5 Qs · dB scale, Noise Rules, Ionising radiation' },
  { id: 'unit8',  file: 'data/pcb/unit8.html',  icon: '🌿', name: 'Unit 8 — Ecology & Natural Resources',   description: '~5–7 Qs · Ecosystems, Biodiversity, Climate change' },
  { id: 'unit9',  file: 'data/pcb/unit9.html',  icon: '🏭', name: 'Unit 9 — Industrial Pollution & CP',     description: '~4–6 Qs · CETP, ZLD, LCA, Green chemistry' },
  { id: 'unit10', file: 'data/pcb/unit10.html', icon: '🧪', name: 'Unit 10 — Environmental Chemistry & Lab', description: '~4–5 Qs · DO, BOD, COD, AAS, Air monitoring' },
  { id: 'unit11', file: 'data/pcb/unit11.html', icon: '🌊', name: 'Unit 11 — Fluid Mechanics & Hydraulics', description: '~3–5 Qs · Reynolds, Darcy-Weisbach, Manning, Pumps' },
];

const _cache = {};

/**
 * Load a PCB unit HTML file.
 * Extracts body content and builds topic list from <h2> tags — uniform across all units.
 */
export async function loadPCBUnit(unitId) {
  if (_cache[unitId]) return _cache[unitId];
  const subj = SUBJECTS_PCB_NOTES.find(s => s.id === unitId);
  if (!subj) return null;

  try {
    const res = await fetch(subj.file);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    doc.querySelectorAll('script').forEach(s => s.remove());

    const container = doc.querySelector('.container') || doc.body;
    // Remove title and subtitle already shown in app header
    container.querySelector('h1')?.remove();
    container.querySelector('.subtitle')?.remove();

    // Build topic list from <h2> tags (uniform across all units)
    const sections = [{ id: 'all', label: 'All Topics' }];
    container.querySelectorAll('h2').forEach((h2, i) => {
      const raw = h2.textContent.trim();
      // "SECTION 3: AIR POLLUTION CONTROL" → "Air Pollution Control"
      // "HIGH-YIELD MCQ REVISION LIST"     → "⭐ Mcq Revision List"
      let label = raw
        .replace(/^SECTION\s+\d+:\s*/i, '')
        .replace(/^HIGH-YIELD\s+/i, '⭐ ');
      label = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()
        .replace(/\b(eq|bod|cod|do|mcq|msw|eia|ems|esp|voc|epr|csr|zld|cetp|cdm|aas|ndir|ldp|rbc|uasb|mbbr|mbr|nrc|svl|ntu|gwp|pan|no|co|so|ph|toc|tn|tp|ss|vss|c:n|r:n|naaqs|is|aqr|aqi|wqi|cpheeo|un|epr|iucn|ipcc|ndc|cbdr|ngt|pil|eac|seac|cetp|tsdf|hdpe|rdf|mrf|ltl|srts|hm|jtu|ntu|bcf|ld50|lc50)\b/gi, m => m.toUpperCase());
      const id = 'pcb-s' + i;
      h2.setAttribute('data-sid', id);
      sections.push({ id, label });
    });

    const bodyHtml = container.innerHTML;
    const result = { bodyHtml, sections };
    _cache[unitId] = result;
    return result;
  } catch (e) {
    console.error('[pcb-notes] Failed to load', unitId, e);
    return null;
  }
}

/**
 * Render PCB unit notes into the screen.
 * Same function will be reused for practice question HTML files.
 */
export function renderPCBContent(data, mainId, topicBarId, placeholderId) {
  const main        = document.getElementById(mainId);
  const topicBar    = document.getElementById(topicBarId);
  const placeholder = document.getElementById(placeholderId);
  if (!main || !data) return;

  document.getElementById('pcb-notes-rendered')?.remove();
  if (placeholder) placeholder.style.display = 'none';

  const wrapper = document.createElement('div');
  wrapper.id = 'pcb-notes-rendered';
  wrapper.className = 'pcb-notes-content';
  wrapper.innerHTML = data.bodyHtml;

  // Stamp IDs onto h2 elements so chip scrolling works
  wrapper.querySelectorAll('h2[data-sid]').forEach(h2 => {
    h2.id = h2.getAttribute('data-sid');
  });

  main.appendChild(wrapper);

  // Build topic chips
  if (!topicBar) return;
  topicBar.innerHTML = '';
  data.sections.forEach(sec => {
    const chip = document.createElement('button');
    chip.className = 'topic-chip' + (sec.id === 'all' ? ' active' : '');
    chip.textContent = sec.label;
    chip.addEventListener('click', () => {
      topicBar.querySelectorAll('.topic-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      if (sec.id === 'all') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        wrapper.querySelector('#' + sec.id)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    topicBar.appendChild(chip);
  });
}

// Alias for notes (same function, reused for practice questions too)
export const renderPCBNotesContent = renderPCBContent;
