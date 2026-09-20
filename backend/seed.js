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
    if (!existing.isMainAdmin) {
      const anyMainAdmin = await User.findOne({ isMainAdmin: true });
      if (!anyMainAdmin) {
        existing.isMainAdmin = true;
        await existing.save();
        console.log('Existing admin promoted to Main Admin:', existing.email);
      }
    }
    console.log('Admin already exists:', existing.email);
    process.exit(0);
  }

  const hashed = await bcrypt.hash('admin123', 10);
  const admin = await User.create({
    name: 'Administrator',
    email: 'admin@school.com',
    password: hashed,
    role: 'admin',
    isMainAdmin: true,
  });

  console.log('Admin created (set as the Main Admin — cannot be deleted by other admins):');
  console.log('  email: admin@school.com');
  console.log('  password: admin123');
  console.log('Change this password after first login.');
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
