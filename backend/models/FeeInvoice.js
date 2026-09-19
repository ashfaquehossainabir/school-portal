const mongoose = require('mongoose');

// A fee type is just a label bucket for reporting — the same invoice can mix
// tuition + transport + a library fine in one document, or a single-item
// invoice can be raised just for one (e.g. a one-off library fine).
const FEE_TYPES = ['tuition', 'admission', 'exam', 'transport', 'library_fine', 'other'];
const PAYMENT_METHODS = ['cash', 'bank_transfer', 'card', 'mobile_banking', 'cheque', 'online', 'other'];
const STATUS_VALUES = ['unpaid', 'partial', 'paid', 'overdue'];

const feeItemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: FEE_TYPES, required: true },
    label: { type: String, required: true, trim: true }, // e.g. "Tuition Fee - September"
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, enum: PAYMENT_METHODS, default: 'cash' },
    date: { type: Date, default: Date.now },
    reference: { type: String, trim: true }, // txn id / cheque no, optional
    note: { type: String, trim: true },
    receiptNo: { type: String },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const feeInvoiceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Denormalized so admin can filter/report without populating every row
    className: { type: String },
    section: { type: String },

    invoiceNo: { type: String, unique: true },
    title: { type: String, required: true, trim: true }, // "Tuition Fee - September 2026"
    term: { type: String, trim: true }, // e.g. "September 2026" — used to group/filter dues

    items: {
      type: [feeItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one fee item is required',
      },
    },
    discount: {
      amount: { type: Number, default: 0, min: 0 },
      reason: { type: String, trim: true, default: '' },
    },

    dueDate: { type: Date, required: true },
    payments: [paymentSchema],
    status: { type: String, enum: STATUS_VALUES, default: 'unpaid' },

    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// ----- derived money fields, exposed as virtuals so the frontend never has
// to re-implement this math (and it can't drift out of sync with `status`) -----
feeInvoiceSchema.virtual('itemsTotal').get(function () {
  return this.items.reduce((sum, i) => sum + i.amount, 0);
});
feeInvoiceSchema.virtual('totalAmount').get(function () {
  const itemsTotal = this.items.reduce((sum, i) => sum + i.amount, 0);
  return Math.max(itemsTotal - (this.discount?.amount || 0), 0);
});
feeInvoiceSchema.virtual('paidAmount').get(function () {
  return this.payments.reduce((sum, p) => sum + p.amount, 0);
});
feeInvoiceSchema.virtual('balance').get(function () {
  const itemsTotal = this.items.reduce((sum, i) => sum + i.amount, 0);
  const total = Math.max(itemsTotal - (this.discount?.amount || 0), 0);
  const paid = this.payments.reduce((sum, p) => sum + p.amount, 0);
  return Math.max(Math.round((total - paid) * 100) / 100, 0);
});

feeInvoiceSchema.set('toJSON', { virtuals: true });
feeInvoiceSchema.set('toObject', { virtuals: true });

// Recompute status + assign an invoice number on every save, so `status`
// (used for filtering/reporting) can never drift from the actual figures.
feeInvoiceSchema.pre('save', function (next) {
  const itemsTotal = this.items.reduce((sum, i) => sum + i.amount, 0);
  const total = Math.max(itemsTotal - (this.discount?.amount || 0), 0);
  const paid = this.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = Math.round((total - paid) * 100) / 100;

  if (balance <= 0 && total > 0) {
    this.status = 'paid';
  } else if (paid > 0) {
    this.status = 'partial';
  } else if (this.dueDate && this.dueDate.getTime() < Date.now()) {
    this.status = 'overdue';
  } else {
    this.status = 'unpaid';
  }

  if (!this.invoiceNo) {
    const stamp = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(100 + Math.random() * 900);
    this.invoiceNo = `INV-${stamp}-${rand}`;
  }

  next();
});

feeInvoiceSchema.index({ student: 1, createdAt: -1 });
feeInvoiceSchema.index({ className: 1, section: 1 });
feeInvoiceSchema.index({ status: 1 });

feeInvoiceSchema.statics.FEE_TYPES = FEE_TYPES;
feeInvoiceSchema.statics.PAYMENT_METHODS = PAYMENT_METHODS;
feeInvoiceSchema.statics.STATUS_VALUES = STATUS_VALUES;

module.exports = mongoose.model('FeeInvoice', feeInvoiceSchema);
