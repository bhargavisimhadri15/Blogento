const connectDB = require("../backend/config/db");
const app = require("../backend/app");

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (error) {
    console.error("VERCEL DB INIT ERROR:", error?.message || error);
    return res.status(500).json({
      message: "Backend initialization failed",
      error: error?.message || String(error),
    });
  }

  return app(req, res);
};

