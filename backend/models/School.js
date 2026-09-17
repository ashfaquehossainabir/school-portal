const mongoose = require('mongoose');

// Root tenant document. Every other collection (User, ClassRoom, Attendance,
// etc.) carries a `school` reference back to one of these, which is what
// lets the same database and codebase serve more than one school later
// (multi-campus) without a rewrite — each query just scopes by school.
const schoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true, unique: true, sparse: true }, // short slug, e.g. "MAIN"
    address: { type: String },
    phone: { type: String },
    email: { type: String, lowercase: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('School', schoolSchema);
