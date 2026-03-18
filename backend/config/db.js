const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

console.log('DB_URI:', process.env.DB_URI); 

const dbUri = process.env.DB_URI;

if (!dbUri) {
  throw new Error('DB_URI is not defined in the environment variables');
}

mongoose.connect(dbUri)
  .then(() => {
    console.log('✔ Connected to MongoDB successfully');
  })
  .catch((err) => {
    console.error('✘ MongoDB connection error:', err.message);
    // Do not process.exit(1) in serverless!
  });

const db = mongoose.connection;

module.exports = db;