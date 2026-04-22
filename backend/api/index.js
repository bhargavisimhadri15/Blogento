const connectDB = require('../config/db');
const app = require('../app');

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (error) {
    console.error('VERCEL DB INIT ERROR:', error.message);
    return res.status(500).json({
      message: 'Backend initialization failed',
      error: error.message
    });
  }

  return app(req, res);
};
