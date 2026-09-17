const mongoose = require('mongoose');

const classRoomSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    className: { type: String, required: true }, // "Class 8"
    section: { type: String, required: true }, // "A"
    classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    subjects: [{ type: String }],
  },
  { timestamps: true }
);

classRoomSchema.index({ school: 1, className: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('ClassRoom', classRoomSchema);
