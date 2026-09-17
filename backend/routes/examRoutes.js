const express = require('express');
const ExamSchedule = require('../models/ExamSchedule');
const { protect, authorize } = require('../middleware/auth');
const { scopeQuery, withSchool } = require('../middleware/tenant');

const router = express.Router();

// GET exams - students/parents see their class only via query params
router.get('/', protect, async (req, res) => {
  try {
    const { className, section } = req.query;
    const filter = scopeQuery(req);
    if (className) filter.className = className;
    if (section) filter.section = section;
    const exams = await ExamSchedule.find(filter).populate('entries.teacher', 'name').sort({ createdAt: -1 });
    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const exam = await ExamSchedule.create(withSchool(req, { ...req.body, createdBy: req.user._id }));
    res.status(201).json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.school;
    const exam = await ExamSchedule.findOneAndUpdate(scopeQuery(req, { _id: req.params.id }), updates, { new: true });
    if (!exam) return res.status(404).json({ message: 'Exam schedule not found' });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const deleted = await ExamSchedule.findOneAndDelete(scopeQuery(req, { _id: req.params.id }));
    if (!deleted) return res.status(404).json({ message: 'Exam schedule not found' });
    res.json({ message: 'Exam schedule deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
