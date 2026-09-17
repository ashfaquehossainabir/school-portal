// Central place for fee metadata so the admin fee manager, the parent/student
// fee status views, and receipts all stay in sync.

export const CATEGORY_LABELS = {
  tuition: 'Tuition Fee',
  admission: 'Admission Fee',
  exam: 'Exam Fee',
  transport: 'Transport Fee',
  library_fine: 'Library Fine',
  other: 'Other',
};

export const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS);

// Matches the .badge-<status> classes added in styles/theme.css
export const FEE_STATUS_LABELS = {
  unpaid: 'Unpaid',
  partial: 'Partially Paid',
  paid: 'Paid',
  overdue: 'Overdue',
};

export const METHOD_LABELS = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  card: 'Card',
  mobile_banking: 'Mobile Banking',
  other: 'Other',
};

export const METHOD_OPTIONS = Object.keys(METHOD_LABELS);

// No currency symbol is assumed — just consistent thousands separators.
export const formatAmount = (n) => (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');

export const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
