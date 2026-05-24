// exams.js — Exam definitions for PYQ section

export const EXAMS = [
  // ── AE/JE Civil ──────────────────────────────────────────────────────────
  {
    id: 'uppsc-ae',
    name: 'UPPSC AE',
    fullName: 'UP Public Service Commission – Assistant Engineer',
    icon: '🏛️',
    state: 'Uttar Pradesh',
    section: 'civil',
  },
  {
    id: 'uppsc-polytechnic',
    name: 'UPPSC Polytechnic Lecturer',
    fullName: 'UPPSC Polytechnic Lecturer – Civil Engineering',
    icon: '🎓',
    state: 'Uttar Pradesh',
    section: 'civil',
  },
  {
    id: 'bpsc-ae',
    name: 'BPSC AE',
    fullName: 'Bihar PSC – Assistant Engineer',
    icon: '🏢',
    state: 'Bihar',
    section: 'civil',
  },
  {
    id: 'cgpsc-ae',
    name: 'CGPSC AE',
    fullName: 'Chhattisgarh PSC – Assistant Engineer',
    icon: '🏗️',
    state: 'Chhattisgarh',
    section: 'civil',
  },
  {
    id: 'gpsc-ae',
    name: 'GPSC Civil Engineering Exam',
    fullName: 'Gujarat Engineering Service (Civil) Class-1 & Class-2',
    icon: '🏬',
    state: 'Gujarat',
    section: 'civil',
  },
  {
    id: 'tspsc-ae',
    name: 'TSPSC AE',
    fullName: 'Telangana PSC – Assistant Engineer',
    icon: '🏘️',
    state: 'Telangana',
    section: 'civil',
  },

  // ── Pollution Control Board ───────────────────────────────────────────────
  {
    id: 'uppcb-aee',
    name: 'UPPCB AEE',
    fullName: 'UP Pollution Control Board – Assistant Environmental Engineer',
    icon: '🌿',
    state: 'Uttar Pradesh',
    section: 'pcb',
  },
  {
    id: 'gpcb-aee',
    name: 'GPCB AEE',
    fullName: 'Gujarat Pollution Control Board – Assistant Environmental Engineer',
    icon: '🌱',
    state: 'Gujarat',
    section: 'pcb',
  },
  {
    id: 'cpcb-scientist',
    name: 'CPCB Scientist-B',
    fullName: 'Central Pollution Control Board – Scientist B (Environmental)',
    icon: '🔬',
    state: 'Central',
    section: 'pcb',
  },
  {
    id: 'rspcb-aee',
    name: 'RSPCB AEE/JEE',
    fullName: 'Rajasthan State Pollution Control Board – AEE/JEE',
    icon: '🏜️',
    state: 'Rajasthan',
    section: 'pcb',
  },
  {
    id: 'bpsc-aee',
    name: 'BPSC AEE',
    fullName: 'Bihar PSC – Assistant Environmental Engineer',
    icon: '🌊',
    state: 'Bihar',
    section: 'pcb',
  },
];

export function getExamById(id) {
  return EXAMS.find(e => e.id === id) || null;
}

export function getExamsBySection(section) {
  return EXAMS.filter(e => e.section === section);
}
