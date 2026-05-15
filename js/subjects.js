// js/subjects.js — single source of truth for subjects + their topics
// Topic counts vary per subject based on syllabus breadth.

export const SUBJECTS_UPPSC_MAINS = [
  {
    id: 'engg-mechanics', icon: '⚙️', name: 'Engineering Mechanics',
    topics: [
      { id: 'statics',       label: 'Statics & Equilibrium' },
      { id: 'friction',      label: 'Friction' },
      { id: 'centroid',      label: 'Centroid & Moment of Inertia' },
      { id: 'kinematics',    label: 'Kinematics' },
      { id: 'kinetics',      label: 'Kinetics & Newton\'s Laws' },
      { id: 'momentum',      label: 'Impulse & Momentum' },
      { id: 'shm',           label: 'SHM & Vibrations' },
      { id: 'virtual-work',  label: 'Virtual Work & Energy' },
    ]
  },
  {
    id: 'strength-of-materials', icon: '💪', name: 'Strength of Materials',
    topics: [
      { id: 'stress-strain',     label: 'Stress & Strain' },
      { id: 'elastic-constants', label: 'Elastic Constants' },
      { id: 'bending',           label: 'Bending Stresses' },
      { id: 'shear-stress',      label: 'Shear Stress in Beams' },
      { id: 'deflection',        label: 'Deflection of Beams' },
      { id: 'torsion',           label: 'Torsion of Shafts' },
      { id: 'columns',           label: 'Columns & Buckling' },
      { id: 'principal-stress',  label: 'Principal Stresses' },
      { id: 'thick-thin',        label: 'Thick & Thin Cylinders' },
      { id: 'springs',           label: 'Springs' },
    ]
  },
  {
    id: 'structural-analysis', icon: '🏛️', name: 'Structural Analysis',
    topics: [
      { id: 'determinate',      label: 'Determinate Structures' },
      { id: 'arches',           label: 'Arches' },
      { id: 'cables',           label: 'Cables & Suspension' },
      { id: 'indeterminate',    label: 'Indeterminate Struct.' },
      { id: 'moment-dist',      label: 'Moment Distribution' },
      { id: 'slope-deflection', label: 'Slope Deflection Method' },
      { id: 'influence-lines',  label: 'Influence Lines' },
      { id: 'plastic',          label: 'Plastic Analysis' },
      { id: 'matrix',           label: 'Matrix / Stiffness Method' },
    ]
  },
  {
    id: 'steel-design', icon: '🔩', name: 'Steel Structures',
    topics: [
      { id: 'tension',      label: 'Tension Members' },
      { id: 'beams',        label: 'Beams & Plate Girders' },
      { id: 'compression',  label: 'Compression Members' },
      { id: 'connections',  label: 'Connections & Bolts' },
      { id: 'welding',      label: 'Welded Connections' },
      { id: 'base-plate',   label: 'Column Bases & Splices' },
      { id: 'industrial',   label: 'Industrial Structures' },
      { id: 'is800',        label: 'IS 800 LSM Provisions' },
    ]
  },
  {
    id: 'concrete-design', icon: '🧱', name: 'RCC / Concrete Design',
    topics: [
      { id: 'flexure',       label: 'Flexure & Beam Design' },
      { id: 'shear-torsion', label: 'Shear & Torsion' },
      { id: 'columns-rcc',   label: 'RCC Columns' },
      { id: 'slabs',         label: 'Slabs (One-way & Two-way)' },
      { id: 'footings',      label: 'Footings & Retaining Walls' },
      { id: 'prestressed',   label: 'Prestressed Concrete' },
      { id: 'concrete-tech', label: 'Concrete Technology' },
      { id: 'limit-state',   label: 'Limit State Concepts' },
      { id: 'water-tanks',   label: 'Water Tanks & Special' },
    ]
  },
  {
    id: 'fluid-mechanics', icon: '💧', name: 'Fluid Mechanics',
    topics: [
      { id: 'fluid-props',       label: 'Fluid Properties' },
      { id: 'hydrostatics',      label: 'Hydrostatics & Pressure' },
      { id: 'buoyancy',          label: 'Buoyancy & Floatation' },
      { id: 'flow-basics',       label: 'Flow Kinematics' },
      { id: 'bernoulli',         label: 'Bernoulli & Energy Eq.' },
      { id: 'pipe-flow',         label: 'Flow in Pipes' },
      { id: 'open-channel',      label: 'Open Channel Flow' },
      { id: 'hydraulic-jump',    label: 'Hydraulic Jump' },
      { id: 'hydraulic-machines', label: 'Turbines & Pumps' },
      { id: 'dimensional',       label: 'Dimensional Analysis' },
      { id: 'boundary-layer',    label: 'Boundary Layer' },
    ]
  },
  {
    id: 'hydrology', icon: '🌊', name: 'Hydrology / Irrigation',
    topics: [
      { id: 'precipitation',  label: 'Precipitation & Rainfall' },
      { id: 'runoff',         label: 'Runoff & Hydrograph' },
      { id: 'unit-hydro',     label: 'Unit Hydrograph' },
      { id: 'floods',         label: 'Flood Estimation & Routing' },
      { id: 'groundwater',    label: 'Groundwater & Wells' },
      { id: 'evaporation',    label: 'Evaporation & ET' },
      { id: 'irrigation',     label: 'Irrigation Basics & Duty' },
      { id: 'canal-design',   label: 'Canal Design (Kennedy/Lacey)' },
      { id: 'dams',           label: 'Dams & Spillways' },
      { id: 'diversion',      label: 'Diversion Works & Weirs' },
      { id: 'waterlogging',   label: 'Waterlogging & Drainage' },
    ]
  },
  {
    id: 'environmental', icon: '🌱', name: 'Environmental Engg.',
    topics: [
      { id: 'water-demand',     label: 'Water Demand & Sources' },
      { id: 'water-treatment',  label: 'Water Treatment' },
      { id: 'water-quality',    label: 'Water Quality & Testing' },
      { id: 'distribution',     label: 'Water Distribution' },
      { id: 'sewage-treatment', label: 'Sewage Treatment' },
      { id: 'bod-cod',          label: 'BOD, COD & SVI' },
      { id: 'sewer-design',     label: 'Sewer Design & Flow' },
      { id: 'air-pollution',    label: 'Air Pollution' },
      { id: 'solid-waste',      label: 'Solid Waste Management' },
      { id: 'self-purification', label: 'Stream Self-purification' },
    ]
  },
  {
    id: 'geotech-foundation', icon: '🗻', name: 'Geotech & Foundation',
    topics: [
      { id: 'soil-classification', label: 'Soil Classification & Index' },
      { id: 'permeability',        label: 'Permeability & Seepage' },
      { id: 'compaction',          label: 'Compaction' },
      { id: 'consolidation',       label: 'Consolidation & Settlement' },
      { id: 'shear-strength',      label: 'Shear Strength' },
      { id: 'earth-pressure',      label: 'Earth Pressure (Rankine/Coulomb)' },
      { id: 'bearing-capacity',    label: 'Bearing Capacity' },
      { id: 'slope-stability',     label: 'Slope Stability' },
      { id: 'pile-foundation',     label: 'Pile Foundations' },
      { id: 'well-foundation',     label: 'Well & Raft Foundations' },
      { id: 'sampling',            label: 'Soil Sampling & Testing' },
    ]
  },
  {
    id: 'transportation', icon: '🛣️', name: 'Transportation',
    topics: [
      { id: 'highway-planning',  label: 'Highway Planning & Geometry' },
      { id: 'sight-distance',    label: 'Sight Distance & Speed' },
      { id: 'horizontal-curve',  label: 'Horizontal & Vertical Curves' },
      { id: 'pavement-design',   label: 'Pavement Design (CBR/IRC)' },
      { id: 'pavement-materials', label: 'Pavement Materials & Mix' },
      { id: 'traffic',           label: 'Traffic Engineering' },
      { id: 'intersections',     label: 'Intersections & Signals' },
      { id: 'railways',          label: 'Railways' },
      { id: 'airport',           label: 'Airport Engineering' },
      { id: 'tunnels-bridges',   label: 'Tunnels & Bridges' },
    ]
  },
  {
    id: 'surveying-geology', icon: '📐', name: 'Surveying & Geology',
    topics: [
      { id: 'chain-survey',    label: 'Chain & Compass Survey' },
      { id: 'levelling',       label: 'Levelling & Contouring' },
      { id: 'theodolite',      label: 'Theodolite Survey' },
      { id: 'tacheometry',     label: 'Tacheometry' },
      { id: 'triangulation',   label: 'Triangulation & Traversing' },
      { id: 'curves',          label: 'Setting Out Curves' },
      { id: 'photogrammetry',  label: 'Aerial Photogrammetry' },
      { id: 'rs-gis',          label: 'Remote Sensing & GIS' },
      { id: 'geology',         label: 'Engineering Geology' },
      { id: 'errors',          label: 'Errors & Adjustments' },
    ]
  },
  {
    id: 'building-materials', icon: '🏗️', name: 'Building Materials',
    topics: [
      { id: 'cement',          label: 'Cement & Admixtures' },
      { id: 'concrete-mix',    label: 'Concrete & Mix Design' },
      { id: 'bricks-masonry',  label: 'Bricks & Masonry' },
      { id: 'stones',          label: 'Stones & Aggregates' },
      { id: 'timber',          label: 'Timber & Bamboo' },
      { id: 'metals',          label: 'Metals & Steel' },
      { id: 'paints-varnish',  label: 'Paints, Varnish & Glass' },
      { id: 'roofing',         label: 'Roofing & Flooring' },
      { id: 'special-materials', label: 'Special & Modern Materials' },
    ]
  },
  {
    id: 'construction-tech', icon: '🏗️', name: 'Construction Technology',
    topics: [
      { id: 'estimation',    label: 'Estimation & Costing' },
      { id: 'specifications', label: 'Specifications & Rates' },
      { id: 'cpm-pert',      label: 'CPM & PERT' },
      { id: 'contracts',     label: 'Contracts & Tendering' },
      { id: 'valuation',     label: 'Valuation & Property' },
      { id: 'building-codes', label: 'Building Codes (NBC/IS)' },
      { id: 'construction-methods', label: 'Construction Methods' },
      { id: 'equipment',     label: 'Equipment & Machinery' },
    ]
  },
];

export function getSubjectById(id) {
  return SUBJECTS_UPPSC_MAINS.find(s => s.id === id) || null;
}

export function getValidSubjectIds() {
  return SUBJECTS_UPPSC_MAINS.map(s => s.id);
}

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
