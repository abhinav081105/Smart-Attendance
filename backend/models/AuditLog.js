const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    performedBy: { type: String, required: true }, // admin ID or user ID
    action: { type: String, required: true }, // e.g., "Attendance Status Update", "User Approval"
    targetId: { type: String }, // ID of the affected student/user
    details: { type: String }, // e.g., "Changed status from absent to present"
    ipAddress: { type: String }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
