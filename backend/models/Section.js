const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  branchCode: { type: String, required: true },
  name: { type: String, required: true },
  crs: [{ type: String }],
  classInCharge: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  location: {
    lat: { type: Number }, // Center Lat
    lng: { type: Number }, // Center Lng
    radius: { type: Number, default: 100 }, // Backwards compatibility
    bounds: {
      north: { type: Number },
      south: { type: Number },
      east: { type: Number },
      west: { type: Number }
    },
    useRectangle: { type: Boolean, default: true }
  },
  timeWindow: {
    start: { type: String }, // e.g. "09:00"
    end: { type: String }   // e.g. "17:00"
  }
});


// A section is unique per year, branch, and name
sectionSchema.index({ year: 1, branchCode: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Section', sectionSchema);
