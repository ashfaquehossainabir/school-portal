const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    audience: {
      type: String,
      enum: ['all', 'students', 'teachers', 'parents', 'class'],
      default: 'all',
    },
    className: { type: String }, // used if audience === 'class'
    section: { type: String },
    priority: { type: String, enum: ['normal', 'important', 'urgent'], default: 'normal' },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notice', noticeSchema);
