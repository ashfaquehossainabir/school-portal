// Central place for attendance status metadata so the mark-attendance screen,
// the student/parent calendar view, and any future screens stay in sync.

export const STATUS_LABELS = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
  'half-day': 'Half Day',
  leave: 'Leave',
  holiday: 'Holiday',
};

export const STATUS_OPTIONS = Object.keys(STATUS_LABELS);

// Matches the .badge-<status> classes in styles/theme.css
export const STATUS_COLORS = {
  present: 'var(--success)',
  absent: 'var(--danger)',
  late: 'var(--warning)',
  excused: 'var(--info)',
  'half-day': '#7c3aed',
  leave: '#0d9488',
  holiday: '#64748b',
};

// Statuses that count toward "days present" in attendance-rate style math
// (present + late + half-day counted as 0.5).
export const PRESENT_WEIGHT = {
  present: 1,
  late: 1,
  'half-day': 0.5,
  excused: 0,
  absent: 0,
  leave: 0,
  holiday: 0,
};
