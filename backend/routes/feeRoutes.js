const express = require('express');
const FeeInvoice = require('../models/FeeInvoice');
const FeePayment = require('../models/FeePayment');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { scopeQuery, withSchool } = require('../middleware/tenant');

const router = express.Router();

const isParentOfStudent = (user, studentId) =>
  user.role === 'parent' && (user.children || []).map(String).includes(studentId);

const nextReceiptNumber = async (schoolId) => {
  // Simple and sufficient for a single admin/accounts desk recording payments
  // one at a time; not meant to survive truly concurrent submissions.
  const count = await FeePayment.countDocuments({ school: schoolId });
  return `RCPT-${String(count + 1).padStart(6, '0')}`;
};

const serializeInvoice = (invoice) => {
  const obj = invoice.toObject ? invoice.toObject() : invoice;
  const netAmount = Math.max(0, obj.amount - (obj.discount || 0));
  return { ...obj, netAmount, status: FeeInvoice.computeStatus(obj) };
};

// ---- Admin: list & filter invoices ----------------------------------------

router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { className, section, category, status, studentId } = req.query;
    const filter = scopeQuery(req);
    if (studentId) {
      filter.student = studentId;
    } else if (className || section) {
      const studentFilter = scopeQuery(req, { role: 'student' });
      if (className) studentFilter.className = className;
      if (section) studentFilter.section = section;
      const students = await User.find(studentFilter).select('_id');
      filter.student = { $in: students.map((s) => s._id) };
    }
    if (category) filter.category = category;

    const invoices = await FeeInvoice.find(filter)
      .populate('student', 'name studentId className section roll')
      .sort({ dueDate: 1 });

    let serialized = invoices.map(serializeInvoice);
    if (status) serialized = serialized.filter((inv) => inv.status === status);

    res.json(serialized);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Due-tracking summary, grouped by student. Pass className/section to scope
// to one class, or nothing for a whole-school view.
router.get('/summary', protect, authorize('admin'), async (req, res) => {
  try {
    const { className, section } = req.query;
    const studentFilter = scopeQuery(req, { role: 'student' });
    if (className) studentFilter.className = className;
    if (section) studentFilter.section = section;
    const students = await User.find(studentFilter).select('name studentId className section roll');

    const invoices = await FeeInvoice.find(scopeQuery(req, { student: { $in: students.map((s) => s._id) } }));

    const byStudent = {};
    students.forEach((s) => {
      byStudent[s._id.toString()] = {
        student: { _id: s._id, name: s.name, studentId: s.studentId, className: s.className, section: s.section, roll: s.roll },
        totalCharged: 0,
        totalDiscount: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        overdueCount: 0,
      };
    });

    invoices.forEach((inv) => {
      const row = byStudent[inv.student.toString()];
      if (!row) return;
      const net = Math.max(0, inv.amount - (inv.discount || 0));
      row.totalCharged += inv.amount;
      row.totalDiscount += inv.discount || 0;
      row.totalPaid += inv.amountPaid;
      row.totalOutstanding += Math.max(0, net - inv.amountPaid);
      if (FeeInvoice.computeStatus(inv) === 'overdue') row.overdueCount += 1;
    });

    res.json(Object.values(byStudent));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---- Admin: create invoices -------------------------------------------------

router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { studentId, category, title, academicPeriod, amount, discount, dueDate, notes } = req.body;
    if (!studentId || !category || !title || amount == null || !dueDate) {
      return res.status(400).json({ message: 'studentId, category, title, amount and dueDate are required' });
    }
    const student = await User.findOne(scopeQuery(req, { _id: studentId, role: 'student' }));
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const invoice = await FeeInvoice.create(
      withSchool(req, {
        student: studentId,
        category,
        title,
        academicPeriod,
        amount,
        discount: discount || 0,
        dueDate,
        notes,
        createdBy: req.user._id,
      })
    );
    res.status(201).json(serializeInvoice(invoice));
  } catch (err) {
    res.status(err.name === 'ValidationError' ? 400 : 500).json({ message: err.message });
  }
});

// Create the same charge for every (active) student in a class/section —
// e.g. this month's tuition for the whole class in one action. Skips any
// student who already has an invoice with the same title, so re-running by
// accident doesn't double-charge anyone.
router.post('/bulk-generate', protect, authorize('admin'), async (req, res) => {
  try {
    const { className, section, category, title, academicPeriod, amount, discount, dueDate, notes } = req.body;
    if (!className || !section || !category || !title || amount == null || !dueDate) {
      return res.status(400).json({ message: 'className, section, category, title, amount and dueDate are required' });
    }

    const students = await User.find(scopeQuery(req, { role: 'student', className, section, isActive: true }));
    if (students.length === 0) {
      return res.status(400).json({ message: 'No active students found in that class/section' });
    }

    const existing = await FeeInvoice.find(
      scopeQuery(req, { title, student: { $in: students.map((s) => s._id) } })
    ).select('student');
    const alreadyInvoiced = new Set(existing.map((e) => e.student.toString()));

    const toCreate = students
      .filter((s) => !alreadyInvoiced.has(s._id.toString()))
      .map((s) =>
        withSchool(req, {
          student: s._id,
          category,
          title,
          academicPeriod,
          amount,
          discount: discount || 0,
          dueDate,
          notes,
          createdBy: req.user._id,
        })
      );

    const created = toCreate.length > 0 ? await FeeInvoice.insertMany(toCreate) : [];
    res.status(201).json({
      created: created.length,
      skipped: alreadyInvoiced.size,
      message: `Created ${created.length} invoice(s)${alreadyInvoiced.size ? `, skipped ${alreadyInvoiced.size} student(s) who already had "${title}"` : ''}.`,
    });
  } catch (err) {
    res.status(err.name === 'ValidationError' ? 400 : 500).json({ message: err.message });
  }
});

// ---- Admin: edit / delete ---------------------------------------------------

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const invoice = await FeeInvoice.findOne(scopeQuery(req, { _id: req.params.id }));
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const updates = { ...req.body };
    delete updates.school;
    delete updates.student;
    delete updates.amountPaid;

    // Once a payment has been recorded, the amount/discount/category are
    // frozen so editing can't silently detach the charge from what was
    // actually collected — only the descriptive fields stay editable.
    if (invoice.amountPaid > 0) {
      const lockedFields = ['amount', 'discount', 'category'].filter((f) => f in updates);
      if (lockedFields.length > 0) {
        return res.status(400).json({
          message: `Payments have already been recorded against this invoice — ${lockedFields.join(', ')} can no longer be changed.`,
        });
      }
    }

    Object.assign(invoice, updates);
    await invoice.save();
    res.json(serializeInvoice(invoice));
  } catch (err) {
    res.status(err.name === 'ValidationError' ? 400 : 500).json({ message: err.message });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const invoice = await FeeInvoice.findOne(scopeQuery(req, { _id: req.params.id }));
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (invoice.amountPaid > 0) {
      return res.status(400).json({ message: 'This invoice has payments recorded against it and cannot be deleted.' });
    }
    await invoice.deleteOne();
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---- Admin: record a payment ------------------------------------------------

router.post('/:id/pay', protect, authorize('admin'), async (req, res) => {
  try {
    const invoice = await FeeInvoice.findOne(scopeQuery(req, { _id: req.params.id }));
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const { amount, method, paidOn, notes } = req.body;
    const payAmount = Number(amount);
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      return res.status(400).json({ message: 'A positive payment amount is required' });
    }
    if (!FeePayment.METHODS.includes(method)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }
    const net = Math.max(0, invoice.amount - (invoice.discount || 0));
    const remaining = net - invoice.amountPaid;
    if (payAmount > remaining + 0.001) {
      return res.status(400).json({ message: `Payment exceeds the remaining balance of ${remaining.toFixed(2)}` });
    }

    const receiptNumber = await nextReceiptNumber(req.user.school);
    const payment = await FeePayment.create(
      withSchool(req, {
        invoice: invoice._id,
        student: invoice.student,
        amount: payAmount,
        method,
        paidOn: paidOn || new Date(),
        receiptNumber,
        recordedBy: req.user._id,
        notes,
      })
    );

    invoice.amountPaid += payAmount;
    await invoice.save();

    res.status(201).json({ payment, invoice: serializeInvoice(invoice) });
  } catch (err) {
    res.status(err.name === 'ValidationError' ? 400 : 500).json({ message: err.message });
  }
});

router.get('/:id/payments', protect, authorize('admin'), async (req, res) => {
  try {
    const invoice = await FeeInvoice.findOne(scopeQuery(req, { _id: req.params.id }));
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    const payments = await FeePayment.find({ invoice: invoice._id }).sort({ paidOn: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---- Student / parent / admin: one student's fee status --------------------

router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const { studentId } = req.params;
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (req.user.role === 'parent' && !isParentOfStudent(req.user, studentId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const invoices = await FeeInvoice.find(scopeQuery(req, { student: studentId })).sort({ dueDate: 1 });
    const serialized = invoices.map(serializeInvoice);

    const summary = serialized.reduce(
      (acc, inv) => {
        acc.totalCharged += inv.amount;
        acc.totalDiscount += inv.discount || 0;
        acc.totalPaid += inv.amountPaid;
        acc.totalOutstanding += Math.max(0, inv.netAmount - inv.amountPaid);
        if (inv.status === 'overdue') acc.overdueCount += 1;
        return acc;
      },
      { totalCharged: 0, totalDiscount: 0, totalPaid: 0, totalOutstanding: 0, overdueCount: 0 }
    );

    res.json({ invoices: serialized, summary });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/student/:studentId/payments', protect, async (req, res) => {
  try {
    const { studentId } = req.params;
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (req.user.role === 'parent' && !isParentOfStudent(req.user, studentId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const payments = await FeePayment.find(scopeQuery(req, { student: studentId }))
      .populate('invoice', 'title category')
      .sort({ paidOn: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Receipt for one payment — admin, or the student/parent who owns the invoice.
router.get('/payments/:paymentId/receipt', protect, async (req, res) => {
  try {
    const payment = await FeePayment.findOne(scopeQuery(req, { _id: req.params.paymentId }))
      .populate('student', 'name studentId className section')
      .populate('invoice', 'title category academicPeriod')
      .populate('recordedBy', 'name')
      .populate('school', 'name address phone email');
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    if (req.user.role === 'student' && req.user._id.toString() !== payment.student._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (req.user.role === 'parent' && !isParentOfStudent(req.user, payment.student._id.toString())) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json(payment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
