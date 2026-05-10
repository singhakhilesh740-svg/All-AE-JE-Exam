// exams.js — Master list of exams AND their subjects (single source of truth)
//
// 🎯 HOW TO ADD A NEW EXAM:
// 1. Copy any existing exam block below
// 2. Paste in the EXAMS array, change id/name/icon/state/description
// 3. Add subjects inside its "subjects" array (or leave empty [])
// 4. Save, push to GitHub. Done.
//
// 🎯 HOW TO ADD/EDIT SUBJECTS FOR AN EXAM:
// 1. Find the exam block (e.g. uppsc-ae)
// 2. Edit its "subjects" array
// 3. Each subject needs: id, name, icon, description
// 4. Save, push to GitHub. Done.
//
// ⚠️ RULES:
// - Subject "id" must be unique within an exam (lowercase, hyphens only, no spaces)
// - Same subject id can be reused across different exams (e.g. "fluid-mechanics" in UPPSC AE and BPSC AE)
// - When you upload questions, use both "exam" and "subject" fields matching IDs here

export const EXAMS = [
  {
    id: 'uppsc-ae',
    name: 'UPPSC AE',
    fullName: 'UP Public Service Commission - Assistant Engineer',
    icon: '🏛️',
    state: 'Uttar Pradesh',
    description: 'Civil Engineering preparation',
    subjects: [
      // Add UPPSC AE subjects here. Example:
      // {
      //   id: 'fluid-mechanics',
      //   name: 'Fluid Mechanics & Hydraulics',
      //   icon: '💧',
      //   description: 'Bernoulli, pipes, channels, pumps'
      // },
    ]
  },
  {
    id: 'uppsc-polytechnic',
    name: 'UPPSC Polytechnic',
    fullName: 'UPPSC Polytechnic Lecturer',
    icon: '🎓',
    state: 'Uttar Pradesh',
    description: 'Lecturer recruitment',
    subjects: []
  },
  {
    id: 'bpsc-ae',
    name: 'BPSC AE',
    fullName: 'Bihar Public Service Commission - Assistant Engineer',
    icon: '🏢',
    state: 'Bihar',
    description: 'Civil Engineering preparation',
    subjects: []
  },
  {
    id: 'cgpsc-ae',
    name: 'CGPSC AE',
    fullName: 'Chhattisgarh PSC - Assistant Engineer',
    icon: '🏗️',
    state: 'Chhattisgarh',
    description: 'Civil Engineering preparation',
    subjects: []
  },
  {
    id: 'tspsc-ae',
    name: 'TSPSC AE',
    fullName: 'Telangana PSC - Assistant Engineer',
    icon: '🏘️',
    state: 'Telangana',
    description: 'Civil Engineering preparation',
    subjects: []
  },
  {
    id: 'gpsc-ae',
    name: 'GPSC AE',
    fullName: 'Gujarat PSC - Assistant Engineer',
    icon: '🏬',
    state: 'Gujarat',
    description: 'Civil Engineering preparation',
    subjects: []
  }
];

// ============= Helper Functions (don't edit) =============

export function getExamById(id) {
  return EXAMS.find(e => e.id === id) || null;
}

export function getValidExamIds() {
  return EXAMS.map(e => e.id);
}

export function getSubjectsForExam(examId) {
  const exam = getExamById(examId);
  return exam ? exam.subjects : [];
}

export function getSubjectFromExam(examId, subjectId) {
  const subjects = getSubjectsForExam(examId);
  return subjects.find(s => s.id === subjectId) || null;
}

export function getValidSubjectIdsForExam(examId) {
  return getSubjectsForExam(examId).map(s => s.id);
}

// Selected exam persistence
const STORAGE_KEY = 'selectedExam';

export function getSelectedExam() {
  const id = localStorage.getItem(STORAGE_KEY);
  if (!id) return null;
  return getExamById(id);
}

export function setSelectedExam(examId) {
  if (getExamById(examId)) {
    localStorage.setItem(STORAGE_KEY, examId);
    return true;
  }
  return false;
}

export function clearSelectedExam() {
  localStorage.removeItem(STORAGE_KEY);
}
