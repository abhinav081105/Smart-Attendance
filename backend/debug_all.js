const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Student = require('./models/Student');

async function check() {
    await mongoose.connect(process.env.DB_URI || 'mongodb://127.0.0.1:27017/AttendanceDB');
    const users = await User.find({}, 'facultyId adminId type name isApproved');
    const students = await Student.find({}, 'reg name');
    console.log('--- USERS ---');
    console.log(JSON.stringify(users, null, 2));
    console.log('--- STUDENTS ---');
    console.log(JSON.stringify(students, null, 2));
    process.exit();
}
check();
