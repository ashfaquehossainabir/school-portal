const mongoose = require('mongoose');

const METHODS = ['cash', 'bank_transfer', 'cheque', 'card', 'mobile_banking', 'other'];

const feePaymentSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeInvoice', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // denormalized for fast history queries
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, enum: METHODS, required: true },
    paidOn: { type: Date, required: true, default: Date.now },
    receiptNumber: { type: String, required: true, unique: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

feePaymentSchema.index({ school: 1, student: 1, paidOn: -1 });

feePaymentSchema.statics.METHODS = METHODS;

module.exports = mongoose.model('FeePayment', feePaymentSchema);
