// Run with: node seed.js
// Creates the first admin account so you can log in and start creating
// teacher/student/parent accounts from the admin dashboard.
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const School = require('./models/School');
const User = require('./models/User');

const DEFAULT_SCHOOL_NAME = process.env.DEFAULT_SCHOOL_NAME || 'My School';
const DEFAULT_SCHOOL_CODE = process.env.DEFAULT_SCHOOL_CODE || 'MAIN';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ email: 'admin@school.com' });
  if (existing) {
    console.log('Admin already exists:', existing.email);
    process.exit(0);
  }

  // Every account belongs to a school now — find-or-create the same default
  // school the migration script uses, so a fresh install and a migrated
  // install end up in the same shape.
  let school = await School.findOne({ code: DEFAULT_SCHOOL_CODE });
  if (!school) {
    school = await School.create({ name: DEFAULT_SCHOOL_NAME, code: DEFAULT_SCHOOL_CODE });
    console.log(`Created school "${school.name}" (${school.code})`);
  }

  const hashed = await bcrypt.hash('admin123', 10);
  const admin = await User.create({
    school: school._id,
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
