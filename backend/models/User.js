const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  type: { type: String, enum: ['cr', 'faculty', 'admin', 'student'], required: true },
  reg: String,
  facultyId: String,
  adminId: String,
  name: String,
  mail: { type: String, required: true },
  phone: String,
  pass: { type: String, required: true },
  section: String,
  faceDescriptor: [Number], // For Face Recognition
  isApproved: { type: Boolean, default: true }
});

module.exports = mongoose.model('User', userSchema);