// backend/src/users/grade.constants.ts

export const GRADE_ORDER = [
  'Néophyte',
  'Aspirant',
  'Contemplateur',
  'Conscient',
  'Intégrateur',
  'Transmutant',
  'Aligné',
  'Éveillé',
  'Sage',
  'Maître de Soi',
];

export const GRADE_REQUIREMENTS = [
  { grade: 0, consultations: 0, rituals: 0, books: 0 }, // Néophyte
  { grade: 1, consultations: 3, rituals: 1, books: 1 },
  { grade: 2, consultations: 6, rituals: 2, books: 1 },
  { grade: 3, consultations: 9, rituals: 3, books: 2 },
  { grade: 4, consultations: 13, rituals: 4, books: 2 },
  { grade: 5, consultations: 18, rituals: 6, books: 3 },
  { grade: 6, consultations: 23, rituals: 8, books: 4 },
  { grade: 7, consultations: 28, rituals: 10, books: 5 },
  { grade: 8, consultations: 34, rituals: 10, books: 6 },
  { grade: 9, consultations: 40, rituals: 10, books: 8 },
];

export const GRADE_LABELS = [
  'Néophyte',
  'Aspirant',
  'Contemplateur',
  'Conscient',
  'Intégrateur',
  'Transmutant',
  'Aligné',
  'Éveillé',
  'Sage',
  'Maître de Soi',
];
