const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  branchCode: { type: String, required: true },
  name: { type: String, required: true },
  crs: [{ type: String }], // Array of register numbers
  location: {
    lat: { type: Number },
    lng: { type: Number },
    radius: { type: Number, default: 100 } // proximity in meters
  },
  timeWindow: {
    start: { type: String }, // e.g. "09:00"
    end: { type: String }   // e.g. "17:00"
  }
});


// A section is unique per year, branch, and name
sectionSchema.index({ year: 1, branchCode: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Section', sectionSchema);
