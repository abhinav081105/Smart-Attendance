const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., DAA, ML
    code: { type: String }, // e.g., CS301
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
    assignedFaculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // The teacher handling this subject
    totalClasses: { type: Number, default: 0 }, // Classes held so far
    type: { type: String, enum: ['Theory', 'Lab'], default: 'Theory' }
});

module.exports = mongoose.model('Subject', subjectSchema);
