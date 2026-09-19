// Single point of change for the currency symbol used across every fee
// screen and generated PDF.
export const CURRENCY = '৳';

export const FEE_TYPE_OPTIONS = ['tuition', 'admission', 'exam', 'transport', 'library_fine', 'other'];

export const FEE_TYPE_LABELS = {
  tuition: 'Tuition Fee',
  admission: 'Admission Fee',
  exam: 'Exam Fee',
  transport: 'Transport Fee',
  library_fine: 'Library Fine',
  other: 'Other',
};

export const PAYMENT_METHOD_OPTIONS = ['cash', 'bank_transfer', 'card', 'mobile_banking', 'cheque', 'online', 'other'];

export const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  mobile_banking: 'Mobile Banking',
  cheque: 'Cheque',
  online: 'Online',
  other: 'Other',
};

export const STATUS_OPTIONS = ['unpaid', 'partial', 'paid', 'overdue'];

export const STATUS_LABELS = {
  unpaid: 'Unpaid',
  partial: 'Partially Paid',
  paid: 'Paid',
  overdue: 'Overdue',
};

export const STATUS_COLORS = {
  unpaid: 'var(--warning)',
  partial: 'var(--info)',
  paid: 'var(--success)',
  overdue: 'var(--danger)',
};

export function formatMoney(amount) {
  const n = Number(amount) || 0;
  return `${CURRENCY}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Abbreviates large numbers for compact display (stat cards) — e.g.
// 4500 -> "4.5K", 60000 -> "60K", 1000000 -> "1M", 1200000 -> "1.2M".
// Numbers under 1,000 are shown as-is. Trailing ".0" is dropped so whole
// numbers read as "60K" rather than "60.0K".
export function formatCompactNumber(value) {
  const n = Number(value) || 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);

  const trim = (str) => str.replace(/\.0$/, '');

  if (abs >= 1_000_000) {
    return `${sign}${trim((abs / 1_000_000).toFixed(1))}M`;
  }
  if (abs >= 1_000) {
    const kValue = Math.round((abs / 1_000) * 10) / 10;
    // A value like 999,999 rounds to "1000.0" at the K scale — bump it up
    // to the M scale instead of ever printing "1000K".
    if (kValue >= 1000) {
      return `${sign}${trim((abs / 1_000_000).toFixed(1))}M`;
    }
    return `${sign}${trim(kValue.toFixed(1))}K`;
  }
  return `${sign}${Math.round(abs).toLocaleString()}`;
}

// Money amount abbreviated the same way, with the currency symbol kept —
// used on dashboard stat cards where at-a-glance scale matters more than
// exact cents (full precision is still shown in invoice tables via
// formatMoney).
export function formatMoneyCompact(amount) {
  return `${CURRENCY}${formatCompactNumber(amount)}`;
}

export function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
