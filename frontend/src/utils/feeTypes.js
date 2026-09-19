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

export function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
