// Attendance dates are calendar days ("2026-09-05"), not instants. Building
// them with `new Date(str)` + `setHours(0,0,0,0)` silently mixes UTC parsing
// with the server's LOCAL timezone offset, so the stored instant can land on
// the previous/next calendar day depending on where the server runs — which
// then shifts records across month boundaries and skews the attendance-rate
// math. These helpers anchor every attendance date to UTC midnight from its
// Y/M/D parts only, so the same calendar day is stored/queried everywhere
// regardless of server or client timezone.

// Accepts 'YYYY-MM-DD' (or anything Date can parse) and returns a Date fixed
// at UTC midnight for that calendar day.
function parseDateOnly(input) {
  const str = typeof input === 'string' ? input : new Date(input).toISOString();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (!match) {
    throw new Error(`Invalid date: ${input}`);
  }
  const [, y, m, d] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
}

// UTC midnight for the first day of the given month (1-indexed).
function monthStartUTC(year, month) {
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1));
}

// UTC midnight for the first day of the NEXT month (exclusive range end).
function monthEndUTC(year, month) {
  return new Date(Date.UTC(Number(year), Number(month), 1));
}

// Add `n` calendar days to a UTC-midnight-anchored date.
function addDaysUTC(date, n) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + n));
}

module.exports = { parseDateOnly, monthStartUTC, monthEndUTC, addDaysUTC };
