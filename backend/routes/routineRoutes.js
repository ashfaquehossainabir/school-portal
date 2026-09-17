const express = require('express');
const Routine = require('../models/Routine');
const { protect, authorize } = require('../middleware/auth');
const { scopeQuery } = require('../middleware/tenant');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const { className, section } = req.query;
    const filter = scopeQuery(req);
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
      scopeQuery(req, { className, section }),
      { school: req.user.school, className, section, days, updatedBy: req.user._id },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(routine);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const deleted = await Routine.findOneAndDelete(scopeQuery(req, { _id: req.params.id }));
    if (!deleted) return res.status(404).json({ message: 'Routine not found' });
    res.json({ message: 'Routine deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
