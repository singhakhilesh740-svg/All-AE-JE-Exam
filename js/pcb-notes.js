// pcb-notes.js — loads unit HTML files for PCB Exam notes screen

export const SUBJECTS_PCB_NOTES = [
  { id: 'unit1',  file: 'data/pcb/unit1.html',  icon: '💧', name: 'Unit 1 — Water Supply Engineering',         description: '~15–18 Qs · Water quality, Treatment, Distribution' },
  { id: 'unit2',  file: 'data/pcb/unit2.html',  icon: '🚰', name: 'Unit 2 — Wastewater Treatment',             description: '~13–16 Qs · BOD, ASP, Trickling filter, Sludge' },
  { id: 'unit3',  file: 'data/pcb/unit3.html',  icon: '💨', name: 'Unit 3 — Air Pollution & Control',          description: '~10–13 Qs · Pollutants, Dispersion, ESP, Scrubbers' },
  { id: 'unit4',  file: 'data/pcb/unit4.html',  icon: '🗑️', name: 'Unit 4 — Solid & Hazardous Waste Mgmt',    description: '~8–10 Qs · MSW, Landfill, E-waste, Biomedical' },
  { id: 'unit5',  file: 'data/pcb/unit5.html',  icon: '⚖️', name: 'Unit 5 — Environmental Legislation',       description: '~8–10 Qs · EPA, Water Act, Air Act, NGT, EIA' },
  { id: 'unit6',  file: 'data/pcb/unit6.html',  icon: '📋', name: 'Unit 6 — EIA & Environmental Mgmt',        description: '~5–7 Qs · EIA process, ISO 14001, AQI, LCA' },
  { id: 'unit7',  file: 'data/pcb/unit7.html',  icon: '🔊', name: 'Unit 7 — Noise Pollution & Radiation',     description: '~3–5 Qs · dB scale, Noise Rules, Ionising radiation' },
  { id: 'unit8',  file: 'data/pcb/unit8.html',  icon: '🌿', name: 'Unit 8 — Ecology & Natural Resources',     description: '~5–7 Qs · Ecosystems, Biodiversity, Climate change' },
  { id: 'unit9',  file: 'data/pcb/unit9.html',  icon: '🏭', name: 'Unit 9 — Industrial Pollution & CP',       description: '~4–6 Qs · CETP, ZLD, LCA, Green chemistry' },
  { id: 'unit10', file: 'data/pcb/unit10.html', icon: '🧪', name: 'Unit 10 — Environmental Chemistry & Lab',  description: '~4–5 Qs · DO, BOD, COD, AAS, Air monitoring' },
  { id: 'unit11', file: 'data/pcb/unit11.html', icon: '🌊', name: 'Unit 11 — Fluid Mechanics & Hydraulics',   description: '~3–5 Qs · Reynolds, Darcy-Weisbach, Manning, Pumps' },
];

// Units that use div.section-header instead of <h2> for topics
const SECTION_HEADER_UNITS = ['unit7', 'unit11'];

const _cache = {};

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
    const h1 = container.querySelector('h1');
    if (h1) h1.remove();
    const subtitle = container.querySelector('.subtitle');
    if (subtitle) subtitle.remove();

    const sections = [{ id: 'all', label: 'All Topics' }];
    const usesDivHeaders = SECTION_HEADER_UNITS.includes(unitId);

    if (usesDivHeaders) {
      // Units 7 & 11: extract div.section-header WITHOUT a color class as main sections
      const allHeaders = container.querySelectorAll('div.section-header');
      allHeaders.forEach((div, i) => {
        // Only pick ones without extra color classes (these are top-level)
        const cls = div.className.trim();
        if (cls === 'section-header') {
          const label = div.textContent.trim();
          const sectionId = 'pcb-sh-' + i;
          div.setAttribute('data-pcb-section-id', sectionId);
          sections.push({ id: sectionId, label, isDivHeader: true });
        }
      });
    } else {
      // Units 1–6, 8–10: extract <h2> tags
      container.querySelectorAll('h2').forEach((h2, i) => {
        const rawText = h2.textContent.trim();
        const label = rawText
          .replace(/^SECTION\s+\d+:\s*/i, '')
          .replace(/^HIGH-YIELD\s+/i, '⭐ ')
          .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        const sectionId = 'pcb-h2-' + i;
        h2.setAttribute('data-pcb-section-id', sectionId);
        sections.push({ id: sectionId, label });
      });
    }

    const bodyHtml = container.innerHTML;
    const result = { bodyHtml, sections, usesDivHeaders };
    _cache[unitId] = result;
    return result;
  } catch (e) {
    console.error('[pcb-notes] Failed to load', unitId, e);
    return null;
  }
}

export function renderPCBNotesContent(data, mainId, topicBarId, placeholderId) {
  const main        = document.getElementById(mainId);
  const topicBar    = document.getElementById(topicBarId);
  const placeholder = document.getElementById(placeholderId);
  if (!main || !data) return;

  const old = document.getElementById('pcb-notes-rendered');
  if (old) old.remove();
  if (placeholder) placeholder.style.display = 'none';

  const wrapper = document.createElement('div');
  wrapper.id = 'pcb-notes-rendered';
  wrapper.className = 'pcb-notes-content';
  wrapper.innerHTML = data.bodyHtml;

  // Re-assign IDs from data-pcb-section-id attributes to actual ids for scroll
  wrapper.querySelectorAll('[data-pcb-section-id]').forEach(el => {
    el.id = el.getAttribute('data-pcb-section-id');
  });

  main.appendChild(wrapper);

  // Build topic chip bar
  if (topicBar) {
    topicBar.innerHTML = '';
    data.sections.forEach(sec => {
      const chip = document.createElement('button');
      chip.className = 'topic-chip' + (sec.id === 'all' ? ' active' : '');
      chip.textContent = sec.label;
      chip.dataset.section = sec.id;
      chip.addEventListener('click', () => {
        topicBar.querySelectorAll('.topic-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        if (sec.id === 'all') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          const target = wrapper.querySelector('#' + sec.id);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      topicBar.appendChild(chip);
    });
  }
}
