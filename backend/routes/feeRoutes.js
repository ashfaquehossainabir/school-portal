const express = require('express');
const FeeInvoice = require('../models/FeeInvoice');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Any invoice still marked 'unpaid' whose due date has passed is stale the
// moment the clock ticks past midnight — nobody necessarily touched the
// record to trigger the pre-save recompute. Run this cheap bulk flip before
// any read so `status` (and therefore every filter/report built on it) stays
// accurate without a background job.
async function refreshOverdue(filter = {}) {
  await FeeInvoice.updateMany(
    { ...filter, status: 'unpaid', dueDate: { $lt: new Date() } },
    { $set: { status: 'overdue' } }
  );
}

// Can `req.user` view this student's fee records?
function canAccessStudent(req, studentId) {
  if (req.user.role === 'admin') return true;
  if (req.user.role === 'student') return req.user._id.toString() === studentId.toString();
  if (req.user.role === 'parent') return req.user.children.map(String).includes(studentId.toString());
  return false;
}

// GET reference lists for the fee forms (types / payment methods / statuses)
router.get('/meta', protect, authorize('admin'), (req, res) => {
  res.json({
    feeTypes: FeeInvoice.FEE_TYPES,
    paymentMethods: FeeInvoice.PAYMENT_METHODS,
    statuses: FeeInvoice.STATUS_VALUES,
  });
});

// GET all invoices (admin) - filters: studentId, className, section, status, term
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { studentId, className, section, status, term } = req.query;
    const filter = {};
    if (studentId) filter.student = studentId;
    if (className) filter.className = className;
    if (section) filter.section = section;
    if (status) filter.status = status;
    if (term) filter.term = term;

    await refreshOverdue(filter);

    const invoices = await FeeInvoice.find(filter)
      .populate('student', 'name studentId className section roll')
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET collection summary for the admin fee dashboard
router.get('/summary', protect, authorize('admin'), async (req, res) => {
  try {
    const { className, section, term } = req.query;
    const filter = {};
    if (className) filter.className = className;
    if (section) filter.section = section;
    if (term) filter.term = term;

    await refreshOverdue(filter);

    const invoices = await FeeInvoice.find(filter);

    const summary = invoices.reduce(
      (acc, inv) => {
        acc.totalBilled += inv.totalAmount;
        acc.totalCollected += inv.paidAmount;
        acc.totalDue += inv.balance;
        if (inv.status === 'overdue') acc.overdueCount += 1;
        if (inv.status === 'paid') acc.paidCount += 1;
        if (inv.status === 'unpaid') acc.unpaidCount += 1;
        if (inv.status === 'partial') acc.partialCount += 1;
        inv.items.forEach((item) => {
          acc.byType[item.type] = (acc.byType[item.type] || 0) + item.amount;
        });
        return acc;
      },
      {
        totalBilled: 0,
        totalCollected: 0,
        totalDue: 0,
        overdueCount: 0,
        paidCount: 0,
        unpaidCount: 0,
        partialCount: 0,
        invoiceCount: invoices.length,
        byType: {},
      }
    );

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET fee invoices + stats for one student (student/parent/admin dashboards)
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!canAccessStudent(req, studentId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await refreshOverdue({ student: studentId });

    const invoices = await FeeInvoice.find({ student: studentId }).sort({ dueDate: -1 });

    const stats = invoices.reduce(
      (acc, inv) => {
        acc.totalBilled += inv.totalAmount;
        acc.totalPaid += inv.paidAmount;
        acc.totalDue += inv.balance;
        if (inv.status === 'overdue') acc.overdueCount += 1;
        return acc;
      },
      { totalBilled: 0, totalPaid: 0, totalDue: 0, overdueCount: 0 }
    );

    const nextDue = invoices
      .filter((inv) => inv.balance > 0)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
    stats.nextDueDate = nextDue ? nextDue.dueDate : null;

    res.json({ invoices, stats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single invoice (used to render/download one invoice or receipt)
router.get('/:id', protect, async (req, res) => {
  try {
    const invoice = await FeeInvoice.findById(req.params.id).populate(
      'student',
      'name studentId className section roll parent'
    );
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (!canAccessStudent(req, invoice.student._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create invoice(s) (admin only)
// Body either targets one student (`studentId`) or a whole class (`className`
// + `section`, no studentId) — in the class case the same item template is
// raised as a separate invoice for every active student in that class/section.
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { studentId, className, section, title, term, items, discount, dueDate, notes } = req.body;

    if (!title || !Array.isArray(items) || items.length === 0 || !dueDate) {
      return res.status(400).json({ message: 'title, items[], dueDate are required' });
    }

    let students = [];
    if (studentId) {
      const student = await User.findOne({ _id: studentId, role: 'student' });
      if (!student) return res.status(400).json({ message: 'Invalid student' });
      students = [student];
    } else if (className && section) {
      students = await User.find({ role: 'student', className, section, isActive: true });
      if (students.length === 0) {
        return res.status(400).json({ message: 'No active students found in that class/section' });
      }
    } else {
      return res.status(400).json({ message: 'Provide either studentId, or className + section' });
    }

    const invoices = await Promise.all(
      students.map((student) =>
        FeeInvoice.create({
          student: student._id,
          className: student.className,
          section: student.section,
          title,
          term,
          items,
          discount,
          dueDate,
          notes,
          createdBy: req.user._id,
        })
      )
    );

    res.status(201).json({
      message: `${invoices.length} invoice${invoices.length > 1 ? 's' : ''} created`,
      count: invoices.length,
      invoices,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update invoice details (admin only) - items/discount/dueDate/notes/title/term
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const invoice = await FeeInvoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const editable = ['title', 'term', 'items', 'discount', 'dueDate', 'notes'];
    editable.forEach((field) => {
      if (req.body[field] !== undefined) invoice[field] = req.body[field];
    });

    await invoice.save();
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE invoice (admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const invoice = await FeeInvoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST record a payment against an invoice (admin only) - full or partial
router.post('/:id/payments', protect, authorize('admin'), async (req, res) => {
  try {
    const { amount, method, date, reference, note } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'A positive amount is required' });
    }

    const invoice = await FeeInvoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    if (amount > invoice.balance + 0.01) {
      return res.status(400).json({ message: `Amount exceeds the outstanding balance (${invoice.balance})` });
    }

    const receiptNo = `${invoice.invoiceNo}-P${invoice.payments.length + 1}`;
    invoice.payments.push({
      amount,
      method: method || 'cash',
      date: date || new Date(),
      reference,
      note,
      receiptNo,
      recordedBy: req.user._id,
    });

    await invoice.save();
    res.status(201).json({ message: 'Payment recorded', invoice, receiptNo });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE void a mistakenly recorded payment (admin only)
router.delete('/:id/payments/:paymentId', protect, authorize('admin'), async (req, res) => {
  try {
    const invoice = await FeeInvoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    invoice.payments = invoice.payments.filter((p) => p._id.toString() !== req.params.paymentId);
    await invoice.save();
    res.json({ message: 'Payment removed', invoice });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
