const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');

// Save attendance (CR/faculty posts)
router.post('/submit', async (req, res) => {
  try {
    const { date, section, sectionId, submittedBy, records } = req.body;
    await Attendance.findOneAndUpdate(
      { date, sectionId },
      { date, section, sectionId, submittedBy, records, finalized: false },
      { upsert: true, new: true }
    );
    res.json({ message: 'Attendance saved!' });
  } catch (err) {
    console.error('Save attendance error:', err);
    res.status(500).json({ message: 'Error saving attendance' });
  }
});

// Get attendance for a specific section and date
router.get('/get/:sectionId/:date', async (req, res) => {
  try {
    const { sectionId, date } = req.params;
    const attendance = await Attendance.findOne({ sectionId, date });
    if (!attendance) return res.json({ records: [] });
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching attendance' });
  }
});

// Get all attendance (admin fetch)
router.get('/all', async (req, res) => {
  try {
    const all = await Attendance.find();
    res.json(all);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching attendance' });
  }
});

// Finalize attendance (mark as posted to admin)
router.put('/finalize', async (req, res) => {
  try {
    const { date, sectionId } = req.body;
    const result = await Attendance.findOneAndUpdate(
      { date, sectionId },
      { finalized: true }
    );
    if (!result) return res.status(404).json({ message: 'Attendance record not found to finalize.' });
    res.json({ message: 'Attendance posted to admin!' });
  } catch (err) {
    res.status(500).json({ message: 'Error finalizing attendance' });
  }
});

// Delete attendance record
router.delete('/delete/:id', async (req, res) => {
  try {
    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting record' });
  }
});

module.exports = router;