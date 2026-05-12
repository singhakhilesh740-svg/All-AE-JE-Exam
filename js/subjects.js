// js/subjects.js — single source of truth for subjects + their topics
// =====================================================================
// TOPICS: every subject has a list of topic objects { id, label }.
// - "id" must match the `topic` field used when uploading questions.
// - "label" is what the user sees on the chip.
// - First entry is always { id: 'all', label: 'All' } (added by getTopicsFor).
// =====================================================================

export const SUBJECTS_UPPSC_MAINS = [
  {
    id: 'engineering-mechanics', icon: '⚙️', name: 'Engineering Mechanics',
    topics: [
      { id: 'statics',    label: 'Statics & Equilibrium' },
      { id: 'friction',   label: 'Friction' },
      { id: 'kinematics', label: 'Kinematics' },
      { id: 'kinetics',   label: 'Kinetics & Momentum' },
      { id: 'shm',        label: 'SHM & Vibrations' },
    ]
  },
  {
    id: 'strength-of-materials', icon: '💪', name: 'Strength of Materials',
    topics: [
      { id: 'stress-strain',  label: 'Stress & Strain' },
      { id: 'bending-shear',  label: 'Bending & Shear' },
      { id: 'torsion',        label: 'Torsion' },
      { id: 'columns',        label: 'Columns & Buckling' },
      { id: 'principal-stress', label: 'Principal Stresses' },
    ]
  },
  {
    id: 'structural-analysis', icon: '🏛️', name: 'Structural Analysis',
    topics: [
      { id: 'determinate',   label: 'Determinate Structures' },
      { id: 'indeterminate', label: 'Indeterminate Struct.' },
      { id: 'influence-lines', label: 'Influence Lines' },
      { id: 'plastic',       label: 'Plastic Analysis' },
      { id: 'matrix',        label: 'Matrix Methods' },
    ]
  },
  {
    id: 'steel-design', icon: '🔩', name: 'Steel Structures',
    topics: [
      { id: 'tension',     label: 'Tension Members' },
      { id: 'beams',       label: 'Beams & Plate Girders' },
      { id: 'compression', label: 'Compression Members' },
      { id: 'connections', label: 'Connections & Bolts' },
      { id: 'industrial',  label: 'Industrial Structures' },
    ]
  },
  {
    id: 'concrete-design', icon: '🧱', name: 'RCC / Concrete Design',
    topics: [
      { id: 'flexure',    label: 'Flexure Design' },
      { id: 'shear-torsion', label: 'Shear & Torsion' },
      { id: 'columns-slabs', label: 'Columns & Slabs' },
      { id: 'prestressed', label: 'Prestressed Concrete' },
      { id: 'concrete-tech', label: 'Concrete Technology' },
    ]
  },
  {
    id: 'fluid-mechanics', icon: '💧', name: 'Fluid Mechanics',
    topics: [
      { id: 'fluid-props',  label: 'Fluid Properties' },
      { id: 'pipe-flow',    label: 'Flow in Pipes' },
      { id: 'open-channel', label: 'Open Channel Flow' },
      { id: 'hydraulic-machines', label: 'Hydraulic Machines' },
      { id: 'dimensional',  label: 'Dimensional Analysis' },
    ]
  },
  {
    id: 'hydrology', icon: '🌊', name: 'Hydrology / Irrigation',
    topics: [
      { id: 'runoff',      label: 'Runoff & Hydrograph' },
      { id: 'groundwater', label: 'Groundwater' },
      { id: 'irrigation',  label: 'Irrigation & Duty' },
      { id: 'dams',        label: 'Dams & Spillways' },
      { id: 'lacey',       label: "Canal Design (Lacey)" },
    ]
  },
  {
    id: 'environmental', icon: '🌱', name: 'Environmental Engg.',
    topics: [
      { id: 'water-treatment',  label: 'Water Treatment' },
      { id: 'sewage-treatment', label: 'Sewage Treatment' },
      { id: 'water-quality',    label: 'Water Quality' },
      { id: 'air-pollution',    label: 'Air Pollution' },
      { id: 'solid-waste',      label: 'Solid Waste' },
    ]
  },
  {
    id: 'geotech-foundation', icon: '🗻', name: 'Geotech & Foundation',
    topics: [
      { id: 'soil-props',   label: 'Soil Properties' },
      { id: 'shear-strength', label: 'Shear Strength' },
      { id: 'consolidation', label: 'Consolidation' },
      { id: 'bearing-capacity', label: 'Bearing Capacity' },
      { id: 'pile-foundation', label: 'Pile Foundations' },
    ]
  },
  {
    id: 'transportation', icon: '🛣️', name: 'Transportation',
    topics: [
      { id: 'highway-design', label: 'Highway Design' },
      { id: 'pavement',       label: 'Pavement Design' },
      { id: 'traffic',        label: 'Traffic Engineering' },
      { id: 'railways',       label: 'Railways' },
      { id: 'airport',        label: 'Airport Engineering' },
    ]
  },
  {
    id: 'surveying-geology', icon: '📐', name: 'Surveying & Geology',
    topics: [
      { id: 'chain-compass', label: 'Chain & Compass' },
      { id: 'levelling',     label: 'Levelling' },
      { id: 'theodolite',    label: 'Theodolite & Tacheo.' },
      { id: 'curves',        label: 'Curves' },
      { id: 'rs-gis',        label: 'Remote Sensing & GIS' },
    ]
  },
  {
    id: 'building-materials', icon: '🏗️', name: 'Building Materials',
    topics: [
      { id: 'cement-concrete', label: 'Cement & Concrete' },
      { id: 'bricks-masonry',  label: 'Bricks & Masonry' },
      { id: 'timber-paints',   label: 'Timber & Paints' },
      { id: 'roofing-flooring', label: 'Roofing & Flooring' },
      { id: 'stones-metals',   label: 'Stones & Metals' },
    ]
  },
  {
    id: 'construction-tech', icon: '👷', name: 'Construction Mgmt.',
    topics: [
      { id: 'estimation',  label: 'Estimation & Costing' },
      { id: 'cpm-pert',    label: 'CPM / PERT' },
      { id: 'contracts',   label: 'Contracts & Tendering' },
      { id: 'valuation',   label: 'Valuation' },
      { id: 'building-codes', label: 'Building Codes (NBC)' },
    ]
  },
];

export function getSubjectById(id) {
  return SUBJECTS_UPPSC_MAINS.find(s => s.id === id) || null;
}

export function getValidSubjectIds() {
  return SUBJECTS_UPPSC_MAINS.map(s => s.id);
}

// Returns topics for a subject, always with 'All' as first entry
export function getTopicsFor(subjectId) {
  const subj = getSubjectById(subjectId);
  const base = [{ id: 'all', label: 'All' }];
  if (!subj || !subj.topics) return base;
  return [...base, ...subj.topics];
}

export function getSubjectsFor(examId, stage) {
  if (examId === 'uppsc-ae' && stage === 'mains') return SUBJECTS_UPPSC_MAINS;
  return [];
}
