const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Section = require('../models/Section');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Settings = require('../models/Settings');

// Check Registration Status
router.get('/registration-status', async (req, res) => {
  try {
    let setting = await Settings.findOne({ key: 'registrationEnabled' });
    if (!setting) {
      setting = new Settings({ key: 'registrationEnabled', value: true });
      await setting.save();
    }
    res.json({ registrationEnabled: setting.value });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Register
router.post('/register', async (req, res) => {
  try {
    let { type, reg, facultyId, adminId, name, mail, phone, pass, faceDescriptor, creatorId } = req.body;
    
    // Check global registration status
    const regSetting = await Settings.findOne({ key: 'registrationEnabled' });
    if (regSetting && regSetting.value === false) {
      return res.status(403).json({ message: 'Registration is currently disabled by administrator.' });
    }

    // Normalize IDs to Uppercase
    if (reg) reg = reg.toUpperCase();
    if (facultyId) facultyId = facultyId.toUpperCase();
    if (adminId) adminId = adminId.toUpperCase();

    // Block student/cr registration permanently
    if (type === 'student' || type === 'cr') {
      return res.status(403).json({ 
        message: 'Direct registration is disabled for students and CRs. Please contact your Administrator.' 
      });
    }

    // Restrict Admin creation to existing Admins only
    if (type === 'admin') {
      if (!creatorId) {
        return res.status(403).json({ message: 'Only an existing administrator can create another admin account.' });
      }
      const creator = await User.findById(creatorId);
      if (!creator || creator.type !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized: Admin creation restricted.' });
      }
    }

    // Auto-generate institutional email if not provided
    if (!mail) {
      const id = reg || facultyId || adminId;
      if (id) {
        mail = `${id.toLowerCase()}@lendi.edu.in`;
      } else {
        return res.status(400).json({ message: 'Register/ID number is required to generate email.' });
      }
    }

    let exists;
    if (type === 'faculty') exists = await User.findOne({ facultyId, type });
    else if (type === 'admin') exists = await User.findOne({ adminId, type });
    else exists = await User.findOne({ reg, type });
    
    if (exists) return res.status(400).json({ message: 'User already exists' });

    const user = new User({ type, reg, facultyId, adminId, name, mail, phone, pass, section: req.body.section, faceDescriptor });
    await user.save();
    res.json({ message: 'Registration successful!' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Registration failed: ' + err.message });
  }
});

// Change Password
router.post('/change-password', async (req, res) => {
  try {
    const { userId, type, oldPass, newPass } = req.body;
    let user;

    if (type === 'student' || type === 'cr') {
      user = await Student.findById(userId);
    } else {
      user = await User.findById(userId);
    }

    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.pass !== oldPass) {
      return res.status(400).json({ message: 'Incorrect old password' });
    }

    user.pass = newPass;
    await user.save();
    res.json({ message: 'Password updated successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to change password' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    let { type, reg, facultyId, adminId, pass } = req.body;
    
    // Normalize IDs
    if (reg) reg = reg.toUpperCase();
    if (facultyId) facultyId = facultyId.toUpperCase();
    if (adminId) adminId = adminId.toUpperCase();

    let user;
    if (type === 'cr' || type === 'student') {
      user = await Student.findOne({ reg }).populate('sectionId');
      if (user && type === 'cr') {
        const sectionDoc = await Section.findOne({ crs: reg });
        if (!sectionDoc) {
          return res.status(403).json({ message: 'You are not authorized as a CR.' });
        }
      }
    } else if (type === 'faculty') {
      user = await User.findOne({ facultyId, type });
    } else {
      user = await User.findOne({ adminId, type });
    }
    
    if (!user) return res.status(400).json({ message: 'No such user found!' });
    if (user.pass !== pass) return res.status(400).json({ message: 'Incorrect password!' });
    
    // Add virtual type for frontend consistency
    const userData = user.toObject();
    userData.type = type;
    if (type === 'student' || type === 'cr') {
        userData.section = user.sectionId ? user.sectionId._id.toString() : null;
    }

    res.json({ message: 'Login successful!', user: userData });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Update Profile
router.put('/update-profile', async (req, res) => {
  try {
    const { userId, type, name, phone } = req.body;
    let user;

    if (type === 'student' || type === 'cr') {
      user = await Student.findByIdAndUpdate(userId, { name, phone }, { new: true });
    } else {
      user = await User.findByIdAndUpdate(userId, { name, phone }, { new: true });
    }

    if (!user) return res.status(404).json({ message: 'User not found' });

    const userData = user.toObject();
    userData.type = type;
    res.json({ message: 'Profile updated successfully!', user: userData });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Enroll Face Data
router.post('/enroll-face', async (req, res) => {
  try {
    const { userId, type, descriptor } = req.body;
    if (!descriptor || descriptor.length !== 128) {
      return res.status(400).json({ message: 'Invalid face data.' });
    }

    let user;
    if (type === 'student' || type === 'cr') {
      user = await Student.findById(userId);
    } else {
      user = await User.findById(userId);
    }

    if (!user) return res.status(404).json({ message: 'User not found' });

    // SECURITY: If face is already enrolled, verify match before allowing update
    if (user.faceDescriptor && user.faceDescriptor.length === 128) {
      const distance = calculateEuclideanDistance(descriptor, user.faceDescriptor);
      if (distance > 0.5) {
        return res.status(403).json({ 
          message: 'Security Alert: Recognition failed. The new scan does not match the original biometric profile. If you need to reset your face data, please contact the administrator.' 
        });
      }
    }

    user.faceDescriptor = descriptor;
    await user.save();

    const userData = user.toObject();
    userData.type = type;
    res.json({ message: 'Face biometric synced successfully!', user: userData });
  } catch (err) {
    console.error('Enroll Error:', err);
    res.status(500).json({ message: 'Face enrollment failed' });
  }
});

// Self-Attendance via Face
router.post('/mark-attendance-face', async (req, res) => {
  try {
    const { userId, type, descriptor, latitude, longitude, currentTime } = req.body;
    let user;
    
    if (type === 'student' || type === 'cr') {
      user = await Student.findById(userId);
    } else {
      user = await User.findById(userId);
    }

    if (!user || !user.faceDescriptor || user.faceDescriptor.length === 0) {
      return res.status(400).json({ message: 'Face data not enrolled!' });
    }

    // Verify face
    const dist = calculateEuclideanDistance(descriptor, user.faceDescriptor);
    if (dist > 0.5) {
      return res.status(401).json({ message: 'Face mismatch! Recognition failed.' });
    }

    // Face verified, now mark attendance
    const today = new Date().toISOString().split('T')[0];
    const sId = (type === 'student' || type === 'cr') ? user.sectionId : user.section; 
    
    if (!sId) {
      return res.status(400).json({ message: 'User not assigned to any section.' });
    }

    const sectionDoc = await Section.findById(sId);
    if (!sectionDoc) return res.status(404).json({ message: 'Section not found' });

    // --- GEOTAGGING & TIME WINDOW CHECK ---
    if (sectionDoc.location && sectionDoc.location.lat && sectionDoc.location.lng) {
      if (!latitude || !longitude) {
        return res.status(403).json({ message: 'Location access required to mark attendance.' });
      }
      const distToLocation = calculateEuclideanDistance([latitude, longitude], [sectionDoc.location.lat, sectionDoc.location.lng]);
      // Rough conversion: 0.001 deg is approx 111m. Using a more accurate Haversine or simple threshold.
      // For simplicity in this demo, we'll use a basic radius check.
      // 0.0001 is roughly 10-15 meters.
      const threshold = (sectionDoc.location.radius || 100) / 111000; 
      if (distToLocation > threshold) {
        return res.status(403).json({ message: 'You are outside the permitted attendance zone.' });
      }
    }

    if (sectionDoc.timeWindow && sectionDoc.timeWindow.start && sectionDoc.timeWindow.end) {
      const { start, end } = sectionDoc.timeWindow;
      const now = currentTime ? new Date(currentTime) : new Date();
      const currentStr = now.toTimeString().substring(0, 5); // "HH:MM"
      
      let isWithinWindow = false;
      if (start <= end) {
        // Standard window (e.g., 09:00 to 17:00)
        isWithinWindow = (currentStr >= start && currentStr <= end);
      } else {
        // Wrap-around window (e.g., 22:00 to 02:00 or 09:00 to 00:00)
        isWithinWindow = (currentStr >= start || currentStr <= end);
      }

      if (!isWithinWindow) {
        return res.status(403).json({ message: `Attendance window is ${start} to ${end}.` });
      }
    }


    const sectionName = `Year ${sectionDoc.year} - ${sectionDoc.branchCode} - Sec ${sectionDoc.name}`;

    // Check if attendance record for this section and date exists
    let attendance = await Attendance.findOne({ date: today, sectionId: sId });
    
    if (!attendance) {
      attendance = new Attendance({
        date: today,
        sectionId: sId,
        section: sectionName,
        submittedBy: 'Face-Recognition-System',
        records: []
      });
    }

    // Check if student already marked
    const recordIndex = attendance.records.findIndex(r => r.registerNumber === user.reg);
    if (recordIndex > -1) {
      attendance.records[recordIndex].status = 'present';
    } else {
      attendance.records.push({ registerNumber: user.reg, status: 'present' });
    }

    await attendance.save();
    res.json({ message: 'Attendance marked successfully!' });

  } catch (err) {
    console.error('Face Attendance Error:', err);
    res.status(500).json({ message: 'Failed to mark attendance' });
  }
});


// Face Login Search
router.post('/face-login', async (req, res) => {
  try {
    const { descriptor } = req.body;
    if (!descriptor || descriptor.length !== 128) {
      return res.status(400).json({ message: 'Invalid face descriptor.' });
    }

    // Search both collections
    const [users, students] = await Promise.all([
      User.find({ faceDescriptor: { $exists: true, $ne: [] } }),
      Student.find({ faceDescriptor: { $exists: true, $ne: [] } }).populate('sectionId')
    ]);
    
    let bestMatch = null;
    let minDistance = 0.5;

    // Check regular users
    for (let u of users) {
      if (u.faceDescriptor && u.faceDescriptor.length === 128) {
        const dist = calculateEuclideanDistance(descriptor, u.faceDescriptor);
        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = u.toObject();
        }
      }
    }

    // Check students
    for (let s of students) {
      if (s.faceDescriptor && s.faceDescriptor.length === 128) {
        const dist = calculateEuclideanDistance(descriptor, s.faceDescriptor);
        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = s.toObject();
          bestMatch.type = 'student'; // Default to student
          bestMatch.section = s.sectionId ? s.sectionId._id.toString() : null;
        }
      }
    }

    if (!bestMatch) {
      return res.status(401).json({ message: 'Face not recognized.' });
    }

    res.json({ message: 'Face recognized!', user: bestMatch });
  } catch (err) {
    console.error('Face Login Error:', err);
    res.status(500).json({ message: 'Face login failed' });
  }
});

function calculateEuclideanDistance(arr1, arr2) {
  return Math.sqrt(arr1.reduce((sum, val, i) => sum + Math.pow(val - (arr2[i] || 0), 2), 0));
}

module.exports = router;