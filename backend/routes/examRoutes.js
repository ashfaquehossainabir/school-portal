const express = require('express');
const ExamSchedule = require('../models/ExamSchedule');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// GET exams - students/parents see their class only via query params
router.get('/', protect, async (req, res) => {
  try {
    const { className, section } = req.query;
    const filter = {};
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
    const exam = await ExamSchedule.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const exam = await ExamSchedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    await ExamSchedule.findByIdAndDelete(req.params.id);
    res.json({ message: 'Exam schedule deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
