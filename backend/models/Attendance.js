const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  date: { type: String, required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  section: { type: String, required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  submittedBy: { type: String, required: true },
  records: [
    {
      registerNumber: String,
      status: String,
      lat: Number,
      lng: Number
    }
  ],
  finalized: { type: Boolean, default: false }
});

module.exports = mongoose.model('Attendance', attendanceSchema);