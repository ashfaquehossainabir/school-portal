const mongoose = require('mongoose');

const STATUS_VALUES = ['present', 'absent', 'late', 'excused', 'half-day', 'leave', 'holiday'];

const attendanceSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    className: { type: String, required: true },
    section: { type: String, required: true },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: STATUS_VALUES,
      required: true,
    },
    remarks: { type: String },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// One attendance record per student per day
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });

attendanceSchema.statics.STATUS_VALUES = STATUS_VALUES;

module.exports = mongoose.model('Attendance', attendanceSchema);
