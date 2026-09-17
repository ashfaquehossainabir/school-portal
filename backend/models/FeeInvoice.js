const mongoose = require('mongoose');

const CATEGORIES = ['tuition', 'admission', 'exam', 'transport', 'library_fine', 'other'];

const feeInvoiceSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, enum: CATEGORIES, required: true },
    title: { type: String, required: true, trim: true }, // e.g. "Tuition Fee — September 2026"
    academicPeriod: { type: String, trim: true }, // e.g. "September 2026", "Term 1" — free text label, optional
    amount: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 }, // scholarship/waiver applied to this charge
    amountPaid: { type: Number, default: 0, min: 0 }, // kept in sync by feeRoutes whenever a payment is recorded
    dueDate: { type: Date, required: true },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

feeInvoiceSchema.virtual('netAmount').get(function () {
  return Math.max(0, this.amount - (this.discount || 0));
});

// unpaid | partial | paid | overdue (overdue = unpaid or partial, past due date)
feeInvoiceSchema.virtual('status').get(function () {
  return FeeInvoice.computeStatus(this);
});

feeInvoiceSchema.index({ school: 1, student: 1, dueDate: 1 });

feeInvoiceSchema.statics.CATEGORIES = CATEGORIES;

// Shared with routes so list/summary filtering can reuse the exact same rule
// the virtual uses, without relying on Mongo to evaluate a virtual field.
feeInvoiceSchema.statics.computeStatus = function (invoice) {
  const net = Math.max(0, invoice.amount - (invoice.discount || 0));
  const isOverdue = invoice.dueDate && new Date() > new Date(invoice.dueDate);
  if (invoice.amountPaid >= net) return 'paid';
  if (invoice.amountPaid > 0) return isOverdue ? 'overdue' : 'partial';
  return isOverdue ? 'overdue' : 'unpaid';
};

const FeeInvoice = mongoose.model('FeeInvoice', feeInvoiceSchema);
module.exports = FeeInvoice;
