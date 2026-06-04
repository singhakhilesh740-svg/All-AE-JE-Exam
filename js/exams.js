// exams.js — Exam definitions

export const EXAMS = [
  // AE/JE Civil
  { id:'uppsc-ae',          name:'UPPSC AE',                    fullName:'UP Public Service Commission – Assistant Engineer',                 icon:'🏛️', state:'Uttar Pradesh',  section:'civil' },
  { id:'uppsc-polytechnic', name:'UPPSC Polytechnic Lecturer',  fullName:'UPPSC Polytechnic Lecturer – Civil Engineering',                    icon:'🎓', state:'Uttar Pradesh',  section:'civil' },
  { id:'bpsc-ae',           name:'BPSC AE',                     fullName:'Bihar PSC – Assistant Engineer',                                    icon:'🏢', state:'Bihar',           section:'civil' },
  { id:'cgpsc-ae',          name:'CGPSC AE',                    fullName:'Chhattisgarh PSC – Assistant Engineer',                             icon:'🏗️', state:'Chhattisgarh',   section:'civil' },
  { id:'gpsc-ae',           name:'GPSC Civil Engineering Exam', fullName:'Gujarat Engineering Service (Civil) Class-1 & Class-2',             icon:'🏬', state:'Gujarat',         section:'civil' },
  { id:'tspsc-ae',          name:'TSPSC AE',                    fullName:'Telangana PSC – Assistant Engineer',                                icon:'🏘️', state:'Telangana',      section:'civil' },
  { id:'hpsc-ae',           name:'HPSC AE',                     fullName:'Haryana PSC – Assistant Engineer (Civil)',                          icon:'🌾', state:'Haryana',         section:'civil' },
  { id:'ukpsc-ae',          name:'UKPSC AE',                    fullName:'Uttarakhand PSC – Assistant Engineer (Civil)',                      icon:'🏔️', state:'Uttarakhand',    section:'civil' },
  // PCB
  { id:'uppcb-aee',         name:'UPPCB AEE',                   fullName:'UP Pollution Control Board – Assistant Environmental Engineer',     icon:'🌿', state:'Uttar Pradesh',  section:'pcb' },
  { id:'gpcb-aee',          name:'GPCB AEE',                    fullName:'Gujarat Pollution Control Board – AEE',                            icon:'🌱', state:'Gujarat',         section:'pcb' },
  { id:'cpcb-scientist',    name:'CPCB Scientist-B',            fullName:'Central Pollution Control Board – Scientist B',                     icon:'🔬', state:'Central',         section:'pcb' },
  { id:'rspcb-aee',         name:'RSPCB AEE/JEE',               fullName:'Rajasthan State Pollution Control Board – AEE/JEE',                icon:'🏜️', state:'Rajasthan',      section:'pcb' },
  { id:'bpsc-aee',          name:'BPSC AEE',                    fullName:'Bihar PSC – Assistant Environmental Engineer',                     icon:'🌊', state:'Bihar',           section:'pcb' },
];

// Live merged list (updated by loadDynamicExams)
let _merged = [...EXAMS];

/**
 * Load custom exams from Firestore and merge with built-in.
 * Call once on app startup after Firebase is initialized.
 */
export async function loadDynamicExams(db) {
  try {
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const snap = await getDocs(collection(db, 'exams_config'));
    const custom = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.active !== false) custom.push({ id: d.id, ...data });
    });
    const existingIds = new Set(EXAMS.map(e => e.id));
    const newExams = custom.filter(e => !existingIds.has(e.id));
    _merged = [...EXAMS, ...newExams];
    if (newExams.length) console.log(`[exams] +${newExams.length} custom exams loaded`);
  } catch(e) {
    console.warn('[exams] Custom exams unavailable:', e.message);
  }
  return _merged;
}

export function getAllExams()          { return _merged; }
export function getExamById(id)        { return _merged.find(e => e.id === id) || null; }
export function getExamsBySection(sec) { return _merged.filter(e => e.section === sec); }
