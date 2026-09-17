const mongoose = require('mongoose');

const examEntrySchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, required: true },
    startTime: { type: String, required: true }, // "10:00 AM"
    endTime: { type: String, required: true },
    room: { type: String },
  },
  { _id: true }
);

const examScheduleSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    title: { type: String, required: true }, // "Mid-Term Examination 2026"
    className: { type: String, required: true },
    section: { type: String, required: true },
    entries: [examEntrySchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ExamSchedule', examScheduleSchema);
