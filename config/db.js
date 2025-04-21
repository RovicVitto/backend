const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Optional: log the URI to debug (remove in production)
    console.log('🔍 Connecting to:', process.env.MONGODB_URI);

    await mongoose.connect(process.env.MONGODB_URI, {
      // These options are now deprecated in Mongoose 7+, can be omitted
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
