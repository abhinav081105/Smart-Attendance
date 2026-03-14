const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  date: { type: String, required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  section: { type: String, required: true },
  submittedBy: { type: String, required: true },
  records: [
    {
      registerNumber: String,
      status: String // 'present', 'absent', 'permission'
    }
  ],
  finalized: { type: Boolean, default: false }
});

module.exports = mongoose.model('Attendance', attendanceSchema);