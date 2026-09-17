const mongoose = require('mongoose');

const classRoomSchema = new mongoose.Schema(
  {
    className: { type: String, required: true }, // "Class 8"
    section: { type: String, required: true }, // "A"
    classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    subjects: [{ type: String }],
  },
  { timestamps: true }
);

classRoomSchema.index({ className: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('ClassRoom', classRoomSchema);
