const mongoose = require('mongoose');

const periodSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    room: { type: String },
  },
  { _id: true }
);

const daySchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      required: true,
    },
    periods: [periodSchema],
  },
  { _id: false }
);

const routineSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    className: { type: String, required: true },
    section: { type: String, required: true },
    days: [daySchema],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

routineSchema.index({ school: 1, className: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('Routine', routineSchema);
