const mongoose = require('mongoose');

const QUESTION_TYPES = ['mcq', 'short'];
const STATUS_VALUES = ['draft', 'published', 'closed'];

const questionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: QUESTION_TYPES, required: true },
    text: { type: String, required: true, trim: true },
    marks: { type: Number, required: true, min: 1 },
    // MCQ only:
    options: {
      type: [String],
      validate: {
        validator: function (arr) {
          if (this.type !== 'mcq') return true;
          return Array.isArray(arr) && arr.length >= 2 && arr.length <= 6 && arr.every((o) => o && o.trim());
        },
        message: 'MCQ questions need 2-6 non-empty options',
      },
    },
    correctOption: {
      type: Number,
      validate: {
        validator: function (val) {
          if (this.type !== 'mcq') return true;
          return Number.isInteger(val) && val >= 0 && val < (this.options?.length || 0);
        },
        message: 'correctOption must be a valid index into options',
      },
    },
  },
  { _id: true }
);

const onlineExamSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    className: { type: String, required: true },
    section: { type: String, required: true },
    instructions: { type: String, trim: true },
    durationMinutes: { type: Number, required: true, min: 1, max: 300 },
    questions: {
      type: [questionSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'An exam needs at least one question',
      },
    },
    totalMarks: { type: Number, required: true, min: 1 }, // server-computed sum of question marks, never trust client input
    status: { type: String, enum: STATUS_VALUES, default: 'draft' },
    availableFrom: { type: Date },
    availableTo: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

onlineExamSchema.statics.QUESTION_TYPES = QUESTION_TYPES;
onlineExamSchema.statics.STATUS_VALUES = STATUS_VALUES;

module.exports = mongoose.model('OnlineExam', onlineExamSchema);
