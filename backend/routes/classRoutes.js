const express = require('express');
const ClassRoom = require('../models/ClassRoom');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const classes = await ClassRoom.find().populate('classTeacher', 'name email');
    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const classRoom = await ClassRoom.create(req.body);
    res.status(201).json(classRoom);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const classRoom = await ClassRoom.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(classRoom);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await ClassRoom.findByIdAndDelete(req.params.id);
    res.json({ message: 'Class deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
