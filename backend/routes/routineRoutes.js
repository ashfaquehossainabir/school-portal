const express = require('express');
const Routine = require('../models/Routine');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const { className, section } = req.query;
    const filter = {};
    if (className) filter.className = className;
    if (section) filter.section = section;
    const routines = await Routine.find(filter).populate('days.periods.teacher', 'name');
    res.json(routines);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Upsert routine for a class+section (admin/teacher)
router.post('/', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { className, section, days } = req.body;
    const routine = await Routine.findOneAndUpdate(
      { className, section },
      { className, section, days, updatedBy: req.user._id },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(routine);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await Routine.findByIdAndDelete(req.params.id);
    res.json({ message: 'Routine deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
