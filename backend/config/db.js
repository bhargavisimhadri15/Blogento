const mongoose = require('mongoose');

let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection || mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not set');
  }

  const conn = await mongoose.connect(mongoUri);
  cachedConnection = conn.connection;
  console.log(`MongoDB connected: ${conn.connection.host}`);
  return cachedConnection;
};

module.exports = connectDB;
