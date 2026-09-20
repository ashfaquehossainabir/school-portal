const express = require('express');
const Result = require('../models/Result');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Can `req.user` view this student's results?
function canAccessStudent(req, studentId) {
  if (req.user.role === 'admin' || req.user.role === 'teacher') return true;
  if (req.user.role === 'student') return req.user._id.toString() === studentId.toString();
  if (req.user.role === 'parent') return req.user.children.map(String).includes(studentId.toString());
  return false;
}

// GET grading scale reference for the result form
router.get('/meta', protect, authorize('admin', 'teacher'), (req, res) => {
  res.json({ gradeOptions: Result.GRADE_OPTIONS });
});

// GET all results (admin/teacher) - filters: studentId, className, section, examTitle, term
router.get('/', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { studentId, className, section, examTitle, term } = req.query;
    const filter = {};
    if (studentId) filter.student = studentId;
    if (className) filter.className = className;
    if (section) filter.section = section;
    if (examTitle) filter.examTitle = examTitle;
    if (term) filter.term = term;

    const results = await Result.find(filter)
      .populate('student', 'name studentId className section roll')
      .sort({ createdAt: -1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all results for one student (student/parent/admin/teacher dashboards)
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!canAccessStudent(req, studentId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const results = await Result.find({ student: studentId }).sort({ createdAt: -1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single result
router.get('/:id', protect, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id).populate('student', 'name studentId className section roll');
    if (!result) return res.status(404).json({ message: 'Result not found' });
    if (!canAccessStudent(req, result.student._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create a result for one student (admin/teacher)
router.post('/', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { studentId, examTitle, term, subjects, remarks } = req.body;

    if (!studentId || !examTitle || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ message: 'studentId, examTitle, subjects[] are required' });
    }

    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) return res.status(400).json({ message: 'Invalid student' });

    const cleanSubjects = subjects.map((s) => ({
      subject: s.subject,
      marks: Number(s.marks),
      maxMarks: Number(s.maxMarks) || 100,
      grade: s.grade || Result.gradeFromPercentage((Number(s.marks) / (Number(s.maxMarks) || 100)) * 100),
    }));

    const result = await Result.create({
      student: student._id,
      className: student.className,
      section: student.section,
      examTitle,
      term,
      subjects: cleanSubjects,
      remarks,
      createdBy: req.user._id,
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update a result (admin/teacher) - examTitle/term/subjects/remarks
router.put('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) return res.status(404).json({ message: 'Result not found' });

    const { examTitle, term, subjects, remarks } = req.body;
    if (examTitle !== undefined) result.examTitle = examTitle;
    if (term !== undefined) result.term = term;
    if (remarks !== undefined) result.remarks = remarks;
    if (Array.isArray(subjects) && subjects.length > 0) {
      result.subjects = subjects.map((s) => ({
        subject: s.subject,
        marks: Number(s.marks),
        maxMarks: Number(s.maxMarks) || 100,
        grade: s.grade || Result.gradeFromPercentage((Number(s.marks) / (Number(s.maxMarks) || 100)) * 100),
      }));
    }

    await result.save();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE a result (admin/teacher)
router.delete('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const result = await Result.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ message: 'Result not found' });
    res.json({ message: 'Result deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
