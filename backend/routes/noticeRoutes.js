const express = require('express');
const Notice = require('../models/Notice');
const { protect, authorize } = require('../middleware/auth');
const { scopeQuery, withSchool } = require('../middleware/tenant');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const notices = await Notice.find(scopeQuery(req)).populate('postedBy', 'name').sort({ createdAt: -1 });
    res.json(notices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const notice = await Notice.create(withSchool(req, { ...req.body, postedBy: req.user._id }));
    res.status(201).json(notice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.school;
    const notice = await Notice.findOneAndUpdate(scopeQuery(req, { _id: req.params.id }), updates, { new: true });
    if (!notice) return res.status(404).json({ message: 'Notice not found' });
    res.json(notice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const deleted = await Notice.findOneAndDelete(scopeQuery(req, { _id: req.params.id }));
    if (!deleted) return res.status(404).json({ message: 'Notice not found' });
    res.json({ message: 'Notice deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
