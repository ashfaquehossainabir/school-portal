// Run with: node seed.js
// Creates the first admin account so you can log in and start creating
// teacher/student/parent accounts from the admin dashboard.
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ email: 'admin@school.com' });
  if (existing) {
    console.log('Admin already exists:', existing.email);
    process.exit(0);
  }

  const hashed = await bcrypt.hash('admin123', 10);
  const admin = await User.create({
    name: 'Administrator',
    email: 'admin@school.com',
    password: hashed,
    role: 'admin',
  });

  console.log('Admin created:');
  console.log('  email: admin@school.com');
  console.log('  password: admin123');
  console.log('Change this password after first login.');
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
