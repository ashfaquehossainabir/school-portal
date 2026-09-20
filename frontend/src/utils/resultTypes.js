// Standard Bangladeshi SSC/HSC-style grading scale — mirrors
// backend/models/Result.js so the form can auto-suggest a grade the moment
// marks are typed in, without waiting on a round trip to the server.
export const GRADE_OPTIONS = ['A+', 'A', 'A-', 'B', 'C', 'D', 'F'];

export function gradeFromPercentage(pct) {
  if (pct >= 80) return 'A+';
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'A-';
  if (pct >= 50) return 'B';
  if (pct >= 40) return 'C';
  if (pct >= 33) return 'D';
  return 'F';
}

export const GRADE_COLORS = {
  'A+': 'var(--success)',
  A: 'var(--success)',
  'A-': 'var(--success)',
  B: 'var(--info)',
  C: 'var(--warning)',
  D: 'var(--warning)',
  F: 'var(--danger)',
};

export function percentageOf(subject) {
  const max = Number(subject.maxMarks) || 100;
  const marks = Number(subject.marks) || 0;
  if (!max) return 0;
  return Math.round((marks / max) * 1000) / 10;
}
