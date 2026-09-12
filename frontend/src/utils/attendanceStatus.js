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

// Personal attendance-rate views (student/parent) tally a student's own
// day-by-day outcomes. "Holiday" isn't a personal outcome — it's a school-wide
// non-school-day, already excluded from the rate calculation itself — so it's
// left out of that tally to avoid implying it counts toward the student's
// attendance the way Present/Absent/Late etc. do.
export const PERSONAL_STATUS_OPTIONS = STATUS_OPTIONS.filter((s) => s !== 'holiday');

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

// Compact column/legend labels — used by the calendar day cells and the
// admin attendance report table, where full labels don't fit.
export const STATUS_SHORT = {
  present: 'P',
  absent: 'A',
  late: 'Lt',
  excused: 'Ex',
  'half-day': 'HD',
  leave: 'Lv',
  holiday: 'Hol',
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
