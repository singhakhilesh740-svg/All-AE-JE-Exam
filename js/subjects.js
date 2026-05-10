// subjects.js — Master list of UPPSC AE Civil Engineering subjects
// To add/edit/remove a subject, just modify this file. Nothing else needs to change.

export const SUBJECTS = [
  {
    id: 'building-materials',
    name: 'Building Materials & Construction',
    icon: '🏗️',
    description: 'Cement, bricks, timber, steel, paints'
  },
  {
    id: 'strength-of-materials',
    name: 'Strength of Materials',
    icon: '💪',
    description: 'Stress, strain, beams, columns, torsion'
  },
  {
    id: 'structural-analysis',
    name: 'Structural Analysis',
    icon: '🏛️',
    description: 'Trusses, frames, indeterminate structures'
  },
  {
    id: 'rcc-steel-design',
    name: 'RCC & Steel Design',
    icon: '🏢',
    description: 'Limit state, working stress, design codes'
  },
  {
    id: 'fluid-mechanics',
    name: 'Fluid Mechanics & Hydraulics',
    icon: '💧',
    description: 'Bernoulli, pipes, channels, pumps'
  },
  {
    id: 'hydrology-irrigation',
    name: 'Hydrology & Irrigation',
    icon: '🌧️',
    description: 'Rainfall, dams, canals, runoff'
  },
  {
    id: 'geotechnical',
    name: 'Geotechnical Engineering',
    icon: '⛰️',
    description: 'Soil mechanics, foundations, slopes'
  },
  {
    id: 'transportation',
    name: 'Transportation Engineering',
    icon: '🛣️',
    description: 'Highways, railways, traffic, pavements'
  },
  {
    id: 'environmental',
    name: 'Environmental Engineering',
    icon: '🌱',
    description: 'Water supply, sewerage, air pollution'
  },
  {
    id: 'surveying-estimation',
    name: 'Surveying & Estimation',
    icon: '📐',
    description: 'Levels, theodolite, BOQ, rate analysis'
  }
];

// Helper: get subject details by ID
export function getSubjectById(id) {
  return SUBJECTS.find(s => s.id === id) || null;
}

// Helper: list of valid subject IDs (for validation)
export function getValidSubjectIds() {
  return SUBJECTS.map(s => s.id);
}
