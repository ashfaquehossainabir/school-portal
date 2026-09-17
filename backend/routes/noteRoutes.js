const express = require('express');
const Note = require('../models/Note');
const { protect, authorize } = require('../middleware/auth');
const { scopeQuery, withSchool } = require('../middleware/tenant');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const { className, section, subject } = req.query;
    const filter = scopeQuery(req);
    if (className) filter.className = className;
    if (section) filter.section = section;
    if (subject) filter.subject = subject;
    const notes = await Note.find(filter).populate('postedBy', 'name').sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const note = await Note.create(withSchool(req, { ...req.body, postedBy: req.user._id }));
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.school;
    const note = await Note.findOneAndUpdate(scopeQuery(req, { _id: req.params.id }), updates, { new: true });
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const deleted = await Note.findOneAndDelete(scopeQuery(req, { _id: req.params.id }));
    if (!deleted) return res.status(404).json({ message: 'Note not found' });
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
