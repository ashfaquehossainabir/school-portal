const express = require('express');
const Attendance = require('../models/Attendance');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// GET attendance for a class on a specific date (teacher/admin taking attendance)
router.get('/class', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { className, section, date } = req.query;
    if (!className || !section || !date) {
      return res.status(400).json({ message: 'className, section, date required' });
    }
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);

    const records = await Attendance.find({
      className,
      section,
      date: { $gte: day, $lt: nextDay },
    }).populate('student', 'name roll');

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST bulk mark attendance for a class - array of { studentId, status, remarks }
// This single write is what "syncs" attendance to each student's dashboard immediately,
// since the student dashboard reads live from this same collection.
router.post('/mark', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { className, section, date, records } = req.body;
    if (!className || !section || !date || !Array.isArray(records)) {
      return res.status(400).json({ message: 'className, section, date, records[] required' });
    }
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);

    const results = await Promise.all(
      records.map((r) =>
        Attendance.findOneAndUpdate(
          { student: r.studentId, date: day },
          {
            student: r.studentId,
            className,
            section,
            date: day,
            status: r.status,
            remarks: r.remarks || '',
            markedBy: req.user._id,
          },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        )
      )
    );

    res.json({ message: 'Attendance saved', count: results.length, records: results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET attendance history + stats for one student (used by student dashboard & parent view)
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { month, year } = req.query; // optional filters

    // Access control: students can only see their own; parents only their children
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (req.user.role === 'parent' && !req.user.children.map(String).includes(studentId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const filter = { student: studentId };
    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 1);
      filter.date = { $gte: start, $lt: end };
    }

    const records = await Attendance.find(filter).sort({ date: -1 });

    const total = records.length;
    const present = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const late = records.filter((r) => r.status === 'late').length;
    const excused = records.filter((r) => r.status === 'excused').length;
    const percentage = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 0;

    res.json({
      records,
      stats: { total, present, absent, late, excused, percentage },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
