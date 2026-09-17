const express = require('express');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { scopeQuery } = require('../middleware/tenant');
const { parseDateOnly, monthStartUTC, monthEndUTC, addDaysUTC } = require('../utils/dateOnly');

const router = express.Router();

// Shared math: given raw status counts for a student/month, derive the
// same schoolDays/percentage figures used everywhere else in the app.
function computeStats(counts, total) {
  const schoolDays = total - counts.holiday;
  const presentEquivalent = counts.present + counts.late + counts['half-day'] * 0.5;
  const percentage = schoolDays > 0 ? Math.round((presentEquivalent / schoolDays) * 1000) / 10 : 0;
  return { total, schoolDays, percentage };
}

// GET a school-wide attendance report for a given month — every student's
// tallies + rate in one call, so the admin report page isn't firing one
// request per student. Optional className/section narrow the roster.
router.get('/report', protect, authorize('admin'), async (req, res) => {
  try {
    const { month, year, className, section } = req.query;
    if (!month || !year) {
      return res.status(400).json({ message: 'month and year required' });
    }

    const studentFilter = scopeQuery(req, { role: 'student' });
    if (className) studentFilter.className = className;
    if (section) studentFilter.section = section;

    const students = await User.find(studentFilter)
      .select('name studentId className section roll')
      .sort({ className: 1, section: 1, name: 1 });

    const studentIds = students.map((s) => s._id);
    const records = await Attendance.find({
      school: req.user.school,
      student: { $in: studentIds },
      date: { $gte: monthStartUTC(year, month), $lt: monthEndUTC(year, month) },
    }).select('student status');

    const byStudent = {};
    records.forEach((r) => {
      const id = r.student.toString();
      if (!byStudent[id]) {
        byStudent[id] = {};
        Attendance.STATUS_VALUES.forEach((s) => {
          byStudent[id][s] = 0;
        });
      }
      if (byStudent[id][r.status] !== undefined) byStudent[id][r.status] += 1;
    });

    const report = students.map((s) => {
      const counts = byStudent[s._id.toString()] || Object.fromEntries(Attendance.STATUS_VALUES.map((v) => [v, 0]));
      const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
      return {
        student: {
          _id: s._id,
          name: s.name,
          studentId: s.studentId,
          className: s.className,
          section: s.section,
          roll: s.roll,
        },
        ...counts,
        ...computeStats(counts, total),
      };
    });

    res.json({ month: Number(month), year: Number(year), report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET attendance for a class on a specific date (teacher/admin taking attendance)
router.get('/class', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { className, section, date } = req.query;
    if (!className || !section || !date) {
      return res.status(400).json({ message: 'className, section, date required' });
    }
    const day = parseDateOnly(date);
    const nextDay = addDaysUTC(day, 1);

    const records = await Attendance.find(
      scopeQuery(req, {
        className,
        section,
        date: { $gte: day, $lt: nextDay },
      })
    ).populate('student', 'name roll');

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
    const day = parseDateOnly(date);

    // Only mark attendance for students who actually belong to this school —
    // guards against a stray/forged studentId reaching across tenants.
    const validStudentIds = new Set(
      (await User.find(scopeQuery(req, { _id: { $in: records.map((r) => r.studentId) }, role: 'student' })).select('_id')).map((s) =>
        s._id.toString()
      )
    );
    const validRecords = records.filter((r) => validStudentIds.has(r.studentId));

    const results = await Promise.all(
      validRecords.map((r) =>
        Attendance.findOneAndUpdate(
          { student: r.studentId, date: day },
          {
            school: req.user.school,
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

    const filter = { student: studentId, school: req.user.school };
    if (month && year) {
      filter.date = { $gte: monthStartUTC(year, month), $lt: monthEndUTC(year, month) };
    }

    const records = await Attendance.find(filter).sort({ date: -1 });

    const counts = {};
    Attendance.STATUS_VALUES.forEach((s) => {
      counts[s] = 0;
    });
    records.forEach((r) => {
      if (counts[r.status] !== undefined) counts[r.status] += 1;
    });

    const total = records.length;
    res.json({
      records,
      // schoolDays is the actual denominator behind `percentage` (holidays
      // excluded) — the frontend uses it instead of `total` so the "X days
      // recorded" label always matches the rate shown next to it.
      stats: { ...counts, ...computeStats(counts, total) },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST bulk-set an off day (holiday/leave) for selected students across a date range.
// Body: { className, section, studentIds: [...], dates: [...], status?, notes? }
router.post('/off-day', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { className, section, studentIds, dates, status = 'holiday', notes } = req.body;

    if (!className || !section || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'className, section, studentIds[] required' });
    }
    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ message: 'dates[] required' });
    }
    if (!Attendance.STATUS_VALUES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    // Cap so a mistyped date range can't trigger thousands of writes
    if (dates.length > 62) {
      return res.status(400).json({ message: 'Date range too large (max 62 days)' });
    }

    // Same tenant guard as /mark: only touch students who belong to this school.
    const validStudentIds = (
      await User.find(scopeQuery(req, { _id: { $in: studentIds }, role: 'student' })).select('_id')
    ).map((s) => s._id.toString());

    const ops = [];
    dates.forEach((d) => {
      const day = parseDateOnly(d);
      validStudentIds.forEach((studentId) => {
        ops.push(
          Attendance.findOneAndUpdate(
            { student: studentId, date: day },
            {
              school: req.user.school,
              student: studentId,
              className,
              section,
              date: day,
              status,
              remarks: notes || '',
              markedBy: req.user._id,
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
          )
        );
      });
    });

    const results = await Promise.all(ops);
    res.json({
      message: 'Off day set',
      count: results.length,
      studentCount: validStudentIds.length,
      dayCount: dates.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
