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
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const db = mongoose.connection;

module.exports = db;