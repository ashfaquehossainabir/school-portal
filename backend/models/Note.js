const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String },
    fileUrl: { type: String }, // link to external file (e.g. Google Drive) since free hosting has no persistent storage
    className: { type: String, required: true },
    section: { type: String, required: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Note', noteSchema);
