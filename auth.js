// exams.js — Exam definitions for PYQ section
// Flow: PYQ → Exam → Subject → Questions (with year tag)

export const EXAMS = [
  {
    id: 'uppsc-ae',
    name: 'UPPSC AE',
    fullName: 'UP Public Service Commission – Assistant Engineer',
    icon: '🏛️',
    state: 'Uttar Pradesh',
  },
  {
    id: 'uppsc-polytechnic',
    name: 'UPPSC Polytechnic Lecturer',
    fullName: 'UPPSC Polytechnic Lecturer – Civil Engineering',
    icon: '🎓',
    state: 'Uttar Pradesh',
  },
  {
    id: 'bpsc-ae',
    name: 'BPSC AE',
    fullName: 'Bihar PSC – Assistant Engineer',
    icon: '🏢',
    state: 'Bihar',
  },
  {
    id: 'cgpsc-ae',
    name: 'CGPSC AE',
    fullName: 'Chhattisgarh PSC – Assistant Engineer',
    icon: '🏗️',
    state: 'Chhattisgarh',
  },
  {
    id: 'gpsc-ae',
    name: 'GPSC Civil Engineering Exam',
    fullName: 'Gujarat Engineering Service (Civil) Class-1 & Class-2',
    icon: '🏬',
    state: 'Gujarat',
  },
  {
    id: 'tspsc-ae',
    name: 'TSPSC AE',
    fullName: 'Telangana PSC – Assistant Engineer',
    icon: '🏘️',
    state: 'Telangana',
  },
];

export function getExamById(id) {
  return EXAMS.find(e => e.id === id) || null;
}
