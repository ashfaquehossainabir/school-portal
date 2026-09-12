// Attendance dates come back from the API anchored at UTC midnight for a
// calendar day (see backend/utils/dateOnly.js). Reading them with local
// getters (getDate/getMonth/toLocaleDateString) re-interprets that instant in
// the viewer's timezone, which can roll it back or forward a day — shifting a
// record onto the wrong square in the calendar or even the wrong month. These
// helpers always read the UTC components so the day shown matches the day
// that was actually recorded, no matter where the browser is.

export function utcDay(isoDate) {
  return new Date(isoDate).getUTCDate();
}

export function formatUTCDate(isoDate) {
  const d = new Date(isoDate);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate()
  ).padStart(2, '0')}`;
}

// Today's date as 'YYYY-MM-DD' in the browser's LOCAL calendar day (for date
// inputs / "mark attendance for today" — this one intentionally uses local
// time, since it reflects the user's own "today", not a stored record).
export function todayLocalStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

// Inclusive list of 'YYYY-MM-DD' strings between two date-only strings,
// stepped in UTC so the walk never skips/repeats a day around DST changes.
export function dateRangeUTC(startStr, endStr, maxDays = 62) {
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const [ey, em, ed] = endStr.split('-').map(Number);
  const start = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
  const days = [];
  const cursor = new Date(start);
  let guard = 0;
  while (cursor <= end && guard < maxDays) {
    days.push(formatUTCDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    guard += 1;
  }
  return days;
}
