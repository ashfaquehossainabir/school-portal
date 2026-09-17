const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'teacher', 'student', 'parent'],
      required: true,
    },
    // Student-specific
    studentId: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true, // only students have this, so it's optional for other roles
    },
    className: { type: String }, // e.g. "Class 8"
    section: { type: String }, // e.g. "A"
    roll: { type: String },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Parent-specific
    children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Teacher-specific
    subject: { type: String },
    assignedClasses: [
      {
        className: String,
        section: String,
        subject: String,
      },
    ],

    phone: { type: String },
    avatarColor: { type: String, default: '#4f46e5' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
