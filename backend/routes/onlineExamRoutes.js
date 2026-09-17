const express = require('express');
const OnlineExam = require('../models/OnlineExam');
const OnlineExamSubmission = require('../models/OnlineExamSubmission');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { scopeQuery, withSchool } = require('../middleware/tenant');

const router = express.Router();

const sumMarks = (questions) => questions.reduce((sum, q) => sum + Number(q.marks || 0), 0);

// Strip answer keys before an exam goes to a student/parent who hasn't
// finished it yet — correctOption must never leak pre-submission.
const sanitizeExam = (exam, revealAnswers) => {
  const obj = exam.toObject ? exam.toObject() : exam;
  if (revealAnswers) return obj;
  return {
    ...obj,
    questions: obj.questions.map((q) => {
      const { correctOption, ...rest } = q;
      return rest;
    }),
  };
};

// Is this parent linked to this student? (mirrors the check in attendanceRoutes)
const isParentOfStudent = (user, studentId) =>
  user.role === 'parent' && (user.children || []).map(String).includes(studentId);

// ---- Exam CRUD (admin/teacher) --------------------------------------------

// GET / - list exams. Students are always scoped to their own class/section;
// admin/teacher/parent may pass className/section (parent passes their
// child's). Optional studentId enriches each exam with that student's own
// submission status, so the list can show "Not started / In progress /
// Submitted / Graded — X/Y" without a second round trip per exam.
router.get('/', protect, async (req, res) => {
  try {
    const { subject, status } = req.query;
    let { className, section, studentId } = req.query;

    if (req.user.role === 'student') {
      className = req.user.className;
      section = req.user.section;
      studentId = req.user._id.toString();
    } else if (req.user.role === 'parent') {
      if (studentId && !isParentOfStudent(req.user, studentId)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      if (studentId) {
        const child = await User.findOne(scopeQuery(req, { _id: studentId }));
        if (child) {
          className = child.className;
          section = child.section;
        }
      }
    }

    const filter = scopeQuery(req);
    if (className) filter.className = className;
    if (section) filter.section = section;
    if (subject) filter.subject = subject;
    if (status) filter.status = status;
    // Students/parents never see drafts, regardless of what they pass.
    if (['student', 'parent'].includes(req.user.role) && !status) {
      filter.status = { $in: ['published', 'closed'] };
    }

    const exams = await OnlineExam.find(filter)
      .select('-questions.correctOption')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    let submissionByExam = {};
    if (studentId) {
      const subs = await OnlineExamSubmission.find(
        scopeQuery(req, { exam: { $in: exams.map((e) => e._id) }, student: studentId })
      ).select('exam status mcqScore shortAnswerScore totalScore submittedAt');
      submissionByExam = Object.fromEntries(subs.map((s) => [s.exam.toString(), s]));
    }

    const enriched = exams.map((e) => ({
      ...e.toObject(),
      mySubmission: studentId ? submissionByExam[e._id.toString()] || null : undefined,
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { title, subject, className, section, instructions, durationMinutes, questions, availableFrom, availableTo } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'At least one question is required' });
    }
    const exam = await OnlineExam.create(
      withSchool(req, {
        title,
        subject,
        className,
        section,
        instructions,
        durationMinutes,
        questions,
        totalMarks: sumMarks(questions),
        availableFrom,
        availableTo,
        createdBy: req.user._id,
      })
    );
    res.status(201).json(exam);
  } catch (err) {
    res.status(err.name === 'ValidationError' ? 400 : 500).json({ message: err.message });
  }
});

// GET /:id - single exam. Answer key hidden unless the requester is
// admin/teacher, or a student/parent whose own submission is fully graded.
router.get('/:id', protect, async (req, res) => {
  try {
    const exam = await OnlineExam.findOne(scopeQuery(req, { _id: req.params.id })).populate('createdBy', 'name');
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    if (['admin', 'teacher'].includes(req.user.role)) {
      return res.json(exam);
    }

    if (exam.status === 'draft') {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const studentId = req.user.role === 'student' ? req.user._id.toString() : req.query.studentId;
    if (req.user.role === 'parent' && studentId && !isParentOfStudent(req.user, studentId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    let revealAnswers = false;
    if (studentId) {
      const submission = await OnlineExamSubmission.findOne({ exam: exam._id, student: studentId });
      revealAnswers = submission?.status === 'graded';
    }
    res.json(sanitizeExam(exam, revealAnswers));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /:id - edit an exam. Once it's left "draft", question content and
// marks are frozen so editing can't invalidate scores students already
// received — only metadata (title/instructions/availability window) and
// status transitions remain editable via the routes below.
router.put('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const exam = await OnlineExam.findOne(scopeQuery(req, { _id: req.params.id }));
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const updates = { ...req.body };
    delete updates.school;
    delete updates.status;
    delete updates.totalMarks;

    if (exam.status !== 'draft' && updates.questions) {
      return res.status(400).json({
        message: 'This exam has been published — question content is locked to protect already-submitted scores. Close it and create a new exam instead.',
      });
    }
    if (updates.questions) {
      updates.totalMarks = sumMarks(updates.questions);
    }

    Object.assign(exam, updates);
    await exam.save();
    res.json(exam);
  } catch (err) {
    res.status(err.name === 'ValidationError' ? 400 : 500).json({ message: err.message });
  }
});

router.delete('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const exam = await OnlineExam.findOne(scopeQuery(req, { _id: req.params.id }));
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const submissionCount = await OnlineExamSubmission.countDocuments({ exam: exam._id });
    if (submissionCount > 0) {
      return res.status(400).json({
        message: `${submissionCount} student(s) have already taken this exam — close it instead of deleting so those results stay intact.`,
      });
    }

    await exam.deleteOne();
    res.json({ message: 'Exam deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/publish', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const exam = await OnlineExam.findOne(scopeQuery(req, { _id: req.params.id }));
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    if (exam.status !== 'draft') {
      return res.status(400).json({ message: 'Only a draft exam can be published' });
    }
    exam.status = 'published';
    await exam.save();
    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/close', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const exam = await OnlineExam.findOne(scopeQuery(req, { _id: req.params.id }));
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    if (exam.status === 'closed') {
      return res.status(400).json({ message: 'Exam is already closed' });
    }
    exam.status = 'closed';
    await exam.save();
    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---- Student attempt flow --------------------------------------------------

router.post('/:id/start', protect, authorize('student'), async (req, res) => {
  try {
    const exam = await OnlineExam.findOne(scopeQuery(req, { _id: req.params.id }));
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    if (exam.className !== req.user.className || exam.section !== req.user.section) {
      return res.status(403).json({ message: 'This exam is not for your class' });
    }
    if (exam.status !== 'published') {
      return res.status(400).json({ message: 'This exam is not currently open' });
    }
    const now = new Date();
    if (exam.availableFrom && now < exam.availableFrom) {
      return res.status(400).json({ message: 'This exam has not opened yet' });
    }
    if (exam.availableTo && now > exam.availableTo) {
      return res.status(400).json({ message: 'This exam has closed' });
    }

    let submission = await OnlineExamSubmission.findOne({ exam: exam._id, student: req.user._id });
    if (submission && submission.status !== 'in-progress') {
      return res.status(400).json({ message: 'You have already submitted this exam' });
    }
    if (!submission) {
      submission = await OnlineExamSubmission.create(
        withSchool(req, { exam: exam._id, student: req.user._id, startedAt: now })
      );
    }

    const deadline = new Date(submission.startedAt.getTime() + exam.durationMinutes * 60000);
    res.json({ exam: sanitizeExam(exam, false), submissionId: submission._id, startedAt: submission.startedAt, deadline });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/submit', protect, authorize('student'), async (req, res) => {
  try {
    const exam = await OnlineExam.findOne(scopeQuery(req, { _id: req.params.id }));
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const submission = await OnlineExamSubmission.findOne({ exam: exam._id, student: req.user._id });
    if (!submission) return res.status(400).json({ message: 'Start the exam before submitting' });
    if (submission.status !== 'in-progress') {
      return res.status(400).json({ message: 'This exam has already been submitted' });
    }

    // Small grace period for network lag near the deadline; otherwise a
    // late submission is rejected rather than silently accepted.
    const deadline = new Date(submission.startedAt.getTime() + exam.durationMinutes * 60000 + 2 * 60000);
    if (new Date() > deadline) {
      return res.status(400).json({ message: 'Time is up for this exam' });
    }

    const { answers } = req.body;
    if (!Array.isArray(answers)) return res.status(400).json({ message: 'answers[] required' });

    let hasShortQuestion = false;
    let mcqScore = 0;
    const gradedAnswers = exam.questions.map((q) => {
      const given = answers.find((a) => a.question === q._id.toString()) || {};
      if (q.type === 'mcq') {
        const selectedOption = Number.isInteger(given.selectedOption) ? given.selectedOption : undefined;
        const marksAwarded = selectedOption === q.correctOption ? q.marks : 0;
        mcqScore += marksAwarded;
        return { question: q._id, selectedOption, marksAwarded };
      }
      hasShortQuestion = true;
      return { question: q._id, answerText: given.answerText || '' };
    });

    submission.answers = gradedAnswers;
    submission.mcqScore = mcqScore;
    submission.submittedAt = new Date();

    if (hasShortQuestion) {
      submission.status = 'submitted';
    } else {
      submission.status = 'graded';
      submission.shortAnswerScore = 0;
      submission.totalScore = mcqScore;
      submission.gradedAt = new Date();
    }

    await submission.save();
    res.json(submission);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /:id/result/:studentId - self, parent of that student, or admin/teacher
router.get('/:id/result/:studentId', protect, async (req, res) => {
  try {
    const { studentId } = req.params;
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (req.user.role === 'parent' && !isParentOfStudent(req.user, studentId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const exam = await OnlineExam.findOne(scopeQuery(req, { _id: req.params.id }));
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const submission = await OnlineExamSubmission.findOne({ exam: exam._id, student: studentId });
    if (!submission) return res.status(404).json({ message: 'No submission found' });

    const revealShortGrading = submission.status === 'graded';

    const breakdown = exam.questions.map((q) => {
      const ans = submission.answers.find((a) => a.question.toString() === q._id.toString());
      const base = { questionId: q._id, type: q.type, text: q.text, marks: q.marks };
      if (q.type === 'mcq') {
        return {
          ...base,
          options: q.options,
          correctOption: q.correctOption,
          selectedOption: ans?.selectedOption,
          marksAwarded: ans?.marksAwarded ?? 0,
        };
      }
      return {
        ...base,
        answerText: ans?.answerText || '',
        marksAwarded: revealShortGrading ? ans?.marksAwarded ?? 0 : undefined,
        feedback: revealShortGrading ? ans?.feedback : undefined,
        pending: !revealShortGrading,
      };
    });

    res.json({
      examTitle: exam.title,
      totalMarks: exam.totalMarks,
      status: submission.status,
      mcqScore: submission.mcqScore,
      shortAnswerScore: submission.shortAnswerScore,
      totalScore: submission.totalScore,
      submittedAt: submission.submittedAt,
      gradedAt: submission.gradedAt,
      questions: breakdown,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---- Teacher grading --------------------------------------------------------

router.get('/:id/submissions', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const exam = await OnlineExam.findOne(scopeQuery(req, { _id: req.params.id }));
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const submissions = await OnlineExamSubmission.find({ exam: exam._id })
      .populate('student', 'name studentId roll className section')
      .sort({ createdAt: 1 });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/submissions/:subId', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const exam = await OnlineExam.findOne(scopeQuery(req, { _id: req.params.id }));
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const submission = await OnlineExamSubmission.findOne({ _id: req.params.subId, exam: exam._id }).populate(
      'student',
      'name studentId roll'
    );
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    const questionsWithAnswers = exam.questions.map((q) => {
      const ans = submission.answers.find((a) => a.question.toString() === q._id.toString());
      return { ...q.toObject(), answer: ans || null };
    });

    res.json({ submission, questions: questionsWithAnswers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /:id/submissions/:subId/grade - body: { grades: [{ question, marksAwarded, feedback }] }
// Only short-answer questions are gradable here; MCQ marks are fixed at submit time.
router.put('/:id/submissions/:subId/grade', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const exam = await OnlineExam.findOne(scopeQuery(req, { _id: req.params.id }));
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const submission = await OnlineExamSubmission.findOne({ _id: req.params.subId, exam: exam._id });
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    if (submission.status === 'in-progress') {
      return res.status(400).json({ message: 'This student has not submitted the exam yet' });
    }

    const { grades } = req.body;
    if (!Array.isArray(grades)) return res.status(400).json({ message: 'grades[] required' });

    const shortQuestions = exam.questions.filter((q) => q.type === 'short');

    for (const g of grades) {
      const question = shortQuestions.find((q) => q._id.toString() === g.question);
      if (!question) continue; // ignore anything that isn't a short-answer question on this exam
      const marks = Number(g.marksAwarded);
      if (!Number.isFinite(marks) || marks < 0 || marks > question.marks) {
        return res.status(400).json({ message: `marksAwarded for a question must be between 0 and ${question.marks}` });
      }
      const answer = submission.answers.find((a) => a.question.toString() === g.question);
      if (answer) {
        answer.marksAwarded = marks;
        answer.feedback = g.feedback || '';
      }
    }

    // Every short question needs a grade before this submission counts as fully graded.
    const allShortGraded = shortQuestions.every((q) => {
      const ans = submission.answers.find((a) => a.question.toString() === q._id.toString());
      return ans && Number.isFinite(ans.marksAwarded);
    });

    if (allShortGraded) {
      submission.shortAnswerScore = submission.answers
        .filter((a) => shortQuestions.some((q) => q._id.toString() === a.question.toString()))
        .reduce((sum, a) => sum + (a.marksAwarded || 0), 0);
      submission.totalScore = submission.mcqScore + submission.shortAnswerScore;
      submission.status = 'graded';
      submission.gradedBy = req.user._id;
      submission.gradedAt = new Date();
    }

    await submission.save();
    res.json(submission);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
