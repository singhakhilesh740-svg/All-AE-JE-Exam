// exams.js — Master list of exams + their stages + each stage's subjects
//
// 🎯 STRUCTURE:
//   Exam → Stages (Prelims/Mains/Interview) → Subjects → Questions
//
// 🎯 HOW TO ADD A SUBJECT:
//   1. Find the exam (e.g., uppsc-ae)
//   2. Find the stage (e.g., 'mains')
//   3. Add a subject object inside that stage's "subjects" array
//
// 🎯 HOW TO ADD A NEW STAGE:
//   Some exams may have only 2 stages, or different stages.
//   Just modify the "stages" array for that exam.
//
// ⚠️ RULES:
//   - Subject "id" must be unique within a stage (lowercase, hyphens, no spaces)
//   - When uploading questions, JSON needs: exam, stage, subject (all required)
//   - Once a subject id is used in uploaded questions, DON'T change it (orphans data)

// ─── Shared subject lists (reused across exams) ───────────────────────────────

const CIVIL_MAINS_SUBJECTS = [
  // ===== Paper-I =====
  {
    id: 'engg-mechanics',
    name: 'Engineering Mechanics',
    icon: '⚙️',
    description: 'Forces, equilibrium, kinematics, kinetics'
  },
  {
    id: 'strength-of-materials',
    name: 'Strength of Materials',
    icon: '💪',
    description: 'Stress, strain, beams, columns, springs'
  },
  {
    id: 'structural-analysis',
    name: 'Structural Analysis',
    icon: '🏛️',
    description: 'Indeterminate structures, plastic analysis, arches'
  },
  {
    id: 'steel-design',
    name: 'Steel Design',
    icon: '🔩',
    description: 'Joints, plate girders, columns, bridges'
  },
  {
    id: 'concrete-design',
    name: 'Concrete & Masonry Design',
    icon: '🏢',
    description: 'RCC, slabs, prestressed, water tanks, masonry'
  },
  {
    id: 'building-materials',
    name: 'Building Materials',
    icon: '🧱',
    description: 'Cement, concrete, timber, special concretes'
  },
  {
    id: 'construction-tech',
    name: 'Construction Technology',
    icon: '🏗️',
    description: 'Estimation, CPM/PERT, project planning'
  },
  {
    id: 'geotech-foundation',
    name: 'Geotech & Foundation',
    icon: '⛰️',
    description: 'Soil mechanics, bearing capacity, piles, rafts'
  },

  // ===== Paper-II =====
  {
    id: 'fluid-mechanics',
    name: 'Fluid Mechanics',
    icon: '💧',
    description: 'Pipe flow, turbines, pumps, hydropower'
  },
  {
    id: 'hydrology',
    name: 'Hydrology & Water Resources',
    icon: '🌊',
    description: 'Hydrology, irrigation, dams, river training'
  },
  {
    id: 'transportation',
    name: 'Transportation Engineering',
    icon: '🛣️',
    description: 'Highway, railway, airport engineering'
  },
  {
    id: 'environmental',
    name: 'Environmental Engineering',
    icon: '🌱',
    description: 'Water supply, sewerage, solid waste, pollution'
  },
  {
    id: 'surveying-geology',
    name: 'Surveying & Geology',
    icon: '📐',
    description: 'Survey methods, GIS, engineering geology'
  }
];

// Interview subjects — personality test prep (shared)
const CIVIL_INTERVIEW_SUBJECTS = [
  {
    id: 'interview-tech',
    name: 'Technical Review',
    icon: '🔬',
    description: 'Core civil engineering concepts quick revision'
  },
  {
    id: 'interview-hr',
    name: 'HR & Personality',
    icon: '🤝',
    description: 'Common HR questions, situational answers'
  },
  {
    id: 'interview-current-affairs',
    name: 'Current Affairs',
    icon: '📰',
    description: 'Govt schemes, infrastructure news, UP-specific GK'
  }
];

// ─── Exam definitions ─────────────────────────────────────────────────────────

export const EXAMS = [
  // ── 1. UPPSC AE ──────────────────────────────────────────────────────────
  {
    id: 'uppsc-ae',
    name: 'UPPSC AE',
    fullName: 'UP Public Service Commission - Assistant Engineer',
    icon: '🏛️',
    state: 'Uttar Pradesh',
    description: 'Civil Engineering preparation',
    stages: [
      {
        id: 'prelims',
        name: 'Prelims',
        icon: '🎯',
        description: 'Objective screening test',
        subjects: []
      },
      {
        id: 'mains',
        name: 'Mains',
        icon: '📚',
        description: 'Descriptive technical exam',
        subjects: CIVIL_MAINS_SUBJECTS
      },
      {
        id: 'interview',
        name: 'Interview',
        icon: '🎤',
        description: 'Personality test',
        subjects: CIVIL_INTERVIEW_SUBJECTS
      }
    ]
  },

  // ── 2. UPPSC Polytechnic Lecturer ─────────────────────────────────────────
  {
    id: 'uppsc-polytechnic',
    name: 'UPPSC Polytechnic Lecturer',
    fullName: 'UPPSC Polytechnic Lecturer - Civil Engineering',
    icon: '🎓',
    state: 'Uttar Pradesh',
    description: 'Polytechnic Lecturer (Civil) preparation',
    stages: [
      // ⚠️ NO Prelims stage — this exam has Mains + Interview only
      {
        id: 'mains',
        name: 'Mains',
        icon: '📚',
        description: 'Technical written exam (Civil Engineering)',
        subjects: [
          // ===== Paper-I =====
          {
            id: 'pl-engg-mechanics',
            name: 'Engineering Mechanics',
            icon: '⚙️',
            description: 'Forces, equilibrium, kinematics, kinetics'
          },
          {
            id: 'pl-strength-of-materials',
            name: 'Strength of Materials',
            icon: '💪',
            description: 'Stress, strain, beams, columns, springs'
          },
          {
            id: 'pl-structural-analysis',
            name: 'Structural Analysis',
            icon: '🏛️',
            description: 'Indeterminate structures, plastic analysis, arches'
          },
          {
            id: 'pl-steel-design',
            name: 'Steel Design',
            icon: '🔩',
            description: 'Joints, plate girders, columns, bridges'
          },
          {
            id: 'pl-concrete-design',
            name: 'Concrete & Masonry Design',
            icon: '🏢',
            description: 'RCC, slabs, prestressed, water tanks, masonry'
          },
          {
            id: 'pl-building-materials',
            name: 'Building Materials',
            icon: '🧱',
            description: 'Cement, concrete, timber, special concretes'
          },
          {
            id: 'pl-construction-tech',
            name: 'Construction Technology',
            icon: '🏗️',
            description: 'Estimation, CPM/PERT, project planning'
          },
          {
            id: 'pl-geotech-foundation',
            name: 'Geotech & Foundation',
            icon: '⛰️',
            description: 'Soil mechanics, bearing capacity, piles, rafts'
          },

          // ===== Paper-II =====
          {
            id: 'pl-fluid-mechanics',
            name: 'Fluid Mechanics',
            icon: '💧',
            description: 'Pipe flow, turbines, pumps, hydropower'
          },
          {
            id: 'pl-hydrology',
            name: 'Hydrology & Water Resources',
            icon: '🌊',
            description: 'Hydrology, irrigation, dams, river training'
          },
          {
            id: 'pl-transportation',
            name: 'Transportation Engineering',
            icon: '🛣️',
            description: 'Highway, railway, airport engineering'
          },
          {
            id: 'pl-environmental',
            name: 'Environmental Engineering',
            icon: '🌱',
            description: 'Water supply, sewerage, solid waste, pollution'
          },
          {
            id: 'pl-surveying-geology',
            name: 'Surveying & Geology',
            icon: '📐',
            description: 'Survey methods, GIS, engineering geology'
          }
        ]
      },
      {
        id: 'interview',
        name: 'Interview',
        icon: '🎤',
        description: 'Personality test & viva voce',
        subjects: [
          {
            id: 'pl-interview-tech',
            name: 'Technical Review',
            icon: '🔬',
            description: 'Core civil engineering concepts quick revision'
          },
          {
            id: 'pl-interview-teaching',
            name: 'Teaching Aptitude',
            icon: '🧑‍🏫',
            description: 'Pedagogy, classroom management, teaching methods'
          },
          {
            id: 'pl-interview-hr',
            name: 'HR & Personality',
            icon: '🤝',
            description: 'Common HR questions, situational answers'
          },
          {
            id: 'pl-interview-current-affairs',
            name: 'Current Affairs',
            icon: '📰',
            description: 'Govt schemes, UP education policy, infrastructure GK'
          }
        ]
      }
    ]
  },

  // ── 3. BPSC AE ───────────────────────────────────────────────────────────
  {
    id: 'bpsc-ae',
    name: 'BPSC AE',
    fullName: 'Bihar Public Service Commission - Assistant Engineer',
    icon: '🏢',
    state: 'Bihar',
    description: 'Civil Engineering preparation',
    stages: [
      { id: 'prelims', name: 'Prelims', icon: '🎯', description: 'Screening test', subjects: [] },
      { id: 'mains', name: 'Mains', icon: '📚', description: 'Main exam', subjects: [] },
      { id: 'interview', name: 'Interview', icon: '🎤', description: 'Personality test', subjects: [] }
    ]
  },

  // ── 4. CGPSC AE ──────────────────────────────────────────────────────────
  {
    id: 'cgpsc-ae',
    name: 'CGPSC AE',
    fullName: 'Chhattisgarh PSC - Assistant Engineer',
    icon: '🏗️',
    state: 'Chhattisgarh',
    description: 'Civil Engineering preparation',
    stages: [
      { id: 'prelims', name: 'Prelims', icon: '🎯', description: 'Screening test', subjects: [] },
      { id: 'mains', name: 'Mains', icon: '📚', description: 'Main exam', subjects: [] },
      { id: 'interview', name: 'Interview', icon: '🎤', description: 'Personality test', subjects: [] }
    ]
  },

  // ── 5. TSPSC AE ──────────────────────────────────────────────────────────
  {
    id: 'tspsc-ae',
    name: 'TSPSC AE',
    fullName: 'Telangana PSC - Assistant Engineer',
    icon: '🏘️',
    state: 'Telangana',
    description: 'Civil Engineering preparation',
    stages: [
      { id: 'prelims', name: 'Prelims', icon: '🎯', description: 'Screening test', subjects: [] },
      { id: 'mains', name: 'Mains', icon: '📚', description: 'Main exam', subjects: [] },
      { id: 'interview', name: 'Interview', icon: '🎤', description: 'Personality test', subjects: [] }
    ]
  },

  // ── 6. GPSC AE ───────────────────────────────────────────────────────────
  {
    id: 'gpsc-ae',
    name: 'GPSC AE',
    fullName: 'Gujarat PSC - Assistant Engineer',
    icon: '🏬',
    state: 'Gujarat',
    description: 'Civil Engineering preparation',
    stages: [
      { id: 'prelims', name: 'Prelims', icon: '🎯', description: 'Screening test', subjects: [] },
      { id: 'mains', name: 'Mains', icon: '📚', description: 'Main exam', subjects: [] },
      { id: 'interview', name: 'Interview', icon: '🎤', description: 'Personality test', subjects: [] }
    ]
  }
];

// ============= Helper Functions (don't edit) =============

export function getExamById(id) {
  return EXAMS.find(e => e.id === id) || null;
}

export function getValidExamIds() {
  return EXAMS.map(e => e.id);
}

export function getStagesForExam(examId) {
  const exam = getExamById(examId);
  return exam?.stages || [];
}

export function getStageFromExam(examId, stageId) {
  const stages = getStagesForExam(examId);
  return stages.find(s => s.id === stageId) || null;
}

export function getSubjectsForStage(examId, stageId) {
  const stage = getStageFromExam(examId, stageId);
  return stage?.subjects || [];
}

export function getSubjectFromStage(examId, stageId, subjectId) {
  const subjects = getSubjectsForStage(examId, stageId);
  return subjects.find(s => s.id === subjectId) || null;
}

// Convenience: search a subject across all stages of an exam
// Useful when fetching a bookmarked question and we don't know its stage
export function findSubjectInExam(examId, subjectId) {
  const exam = getExamById(examId);
  if (!exam) return null;
  for (const stage of exam.stages || []) {
    const subj = (stage.subjects || []).find(s => s.id === subjectId);
    if (subj) return { ...subj, stageId: stage.id };
  }
  return null;
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
