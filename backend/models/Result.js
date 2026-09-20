const mongoose = require('mongoose');

// Standard Bangladeshi SSC/HSC-style grading scale, used both to auto-suggest
// a grade as marks are entered and to compute the overall grade for a result.
const GRADE_OPTIONS = ['A+', 'A', 'A-', 'B', 'C', 'D', 'F'];

function gradeFromPercentage(pct) {
  if (pct >= 80) return 'A+';
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'A-';
  if (pct >= 50) return 'B';
  if (pct >= 40) return 'C';
  if (pct >= 33) return 'D';
  return 'F';
}

const subjectResultSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    marks: { type: Number, required: true, min: 0 },
    maxMarks: { type: Number, default: 100, min: 1 },
    grade: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const resultSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Denormalized so admin/teacher can filter by class without populating every row
    className: { type: String, required: true },
    section: { type: String, required: true },

    examTitle: { type: String, required: true, trim: true }, // e.g. "Half Yearly Examination 2026"
    term: { type: String, trim: true }, // optional grouping, e.g. "2026"

    subjects: {
      type: [subjectResultSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one subject result is required',
      },
    },
    overallGrade: { type: String },
    remarks: { type: String, trim: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// ----- derived fields, exposed as virtuals so the frontend never has to
// re-implement this math -----
resultSchema.virtual('totalMarks').get(function () {
  return this.subjects.reduce((sum, s) => sum + s.marks, 0);
});
resultSchema.virtual('totalMaxMarks').get(function () {
  return this.subjects.reduce((sum, s) => sum + s.maxMarks, 0);
});
resultSchema.virtual('percentage').get(function () {
  const max = this.subjects.reduce((sum, s) => sum + s.maxMarks, 0);
  if (!max) return 0;
  const obtained = this.subjects.reduce((sum, s) => sum + s.marks, 0);
  return Math.round((obtained / max) * 1000) / 10;
});

resultSchema.set('toJSON', { virtuals: true });
resultSchema.set('toObject', { virtuals: true });

// Recompute the overall grade on every save so it can never drift from the
// actual subject marks.
resultSchema.pre('save', function (next) {
  const max = this.subjects.reduce((sum, s) => sum + s.maxMarks, 0);
  const obtained = this.subjects.reduce((sum, s) => sum + s.marks, 0);
  const pct = max > 0 ? (obtained / max) * 100 : 0;
  this.overallGrade = gradeFromPercentage(pct);
  next();
});

resultSchema.index({ student: 1, createdAt: -1 });
resultSchema.index({ className: 1, section: 1 });

resultSchema.statics.GRADE_OPTIONS = GRADE_OPTIONS;
resultSchema.statics.gradeFromPercentage = gradeFromPercentage;

module.exports = mongoose.model('Result', resultSchema);
