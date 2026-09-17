const express = require('express');
const ClassRoom = require('../models/ClassRoom');
const { protect, authorize } = require('../middleware/auth');
const { scopeQuery, withSchool } = require('../middleware/tenant');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const classes = await ClassRoom.find(scopeQuery(req)).populate('classTeacher', 'name email');
    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const classRoom = await ClassRoom.create(withSchool(req, req.body));
    res.status(201).json(classRoom);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.school;
    const classRoom = await ClassRoom.findOneAndUpdate(scopeQuery(req, { _id: req.params.id }), updates, { new: true });
    if (!classRoom) return res.status(404).json({ message: 'Class not found' });
    res.json(classRoom);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const deleted = await ClassRoom.findOneAndDelete(scopeQuery(req, { _id: req.params.id }));
    if (!deleted) return res.status(404).json({ message: 'Class not found' });
    res.json({ message: 'Class deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
