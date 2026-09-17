const mongoose = require('mongoose');

const STATUS_VALUES = ['in-progress', 'submitted', 'graded'];

const answerSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, required: true }, // matches a question _id on the OnlineExam
    selectedOption: { type: Number }, // mcq
    answerText: { type: String, trim: true }, // short
    marksAwarded: { type: Number }, // set for mcq immediately on submit, and for short once graded
    feedback: { type: String, trim: true }, // teacher's note on a short-answer response
  },
  { _id: false }
);

const onlineExamSubmissionSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'OnlineExam', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    answers: [answerSchema],
    mcqScore: { type: Number, default: 0 }, // auto-graded portion, available as soon as the student submits
    shortAnswerScore: { type: Number }, // undefined until every short-answer question is graded
    totalScore: { type: Number }, // mcqScore + shortAnswerScore once fully graded (equals mcqScore if there are no short questions)
    status: { type: String, enum: STATUS_VALUES, default: 'in-progress' },
    startedAt: { type: Date, required: true, default: Date.now },
    submittedAt: { type: Date },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    gradedAt: { type: Date },
  },
  { timestamps: true }
);

// One attempt per student per exam
onlineExamSubmissionSchema.index({ exam: 1, student: 1 }, { unique: true });

onlineExamSubmissionSchema.statics.STATUS_VALUES = STATUS_VALUES;

module.exports = mongoose.model('OnlineExamSubmission', onlineExamSubmissionSchema);
