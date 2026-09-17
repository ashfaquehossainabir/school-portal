// One-time backfill for the multi-school foundation.
//
// What it does, and nothing more:
//   1. Finds or creates exactly one School document (a "default" school for
//      your existing data — rename it later from the DB or a future admin
//      screen, nothing here depends on the name).
//   2. For every collection that now has a `school` field, sets it ONLY on
//      documents that don't already have one. It never touches, overwrites,
//      or deletes any other field or any document that's already tagged.
//   3. Rebuilds the ClassRoom/Routine uniqueness indexes to include school
//      (old indexes were className+section only; new ones are
//      school+className+section) so a second school can reuse the same
//      class names later without colliding with the first school's data.
//
// Safe to run more than once — every step is a no-op on documents that are
// already migrated.
//
// Run with: node migrations/001-add-school.js
require('dotenv').config();
const mongoose = require('mongoose');

const School = require('../models/School');
const User = require('../models/User');
const ClassRoom = require('../models/ClassRoom');
const ExamSchedule = require('../models/ExamSchedule');
const Routine = require('../models/Routine');
const Note = require('../models/Note');
const Notice = require('../models/Notice');
const Attendance = require('../models/Attendance');

const DEFAULT_SCHOOL_NAME = process.env.DEFAULT_SCHOOL_NAME || 'My School';
const DEFAULT_SCHOOL_CODE = process.env.DEFAULT_SCHOOL_CODE || 'MAIN';

const COLLECTIONS = [
  { name: 'User', model: User },
  { name: 'ClassRoom', model: ClassRoom },
  { name: 'ExamSchedule', model: ExamSchedule },
  { name: 'Routine', model: Routine },
  { name: 'Note', model: Note },
  { name: 'Notice', model: Notice },
  { name: 'Attendance', model: Attendance },
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected. Starting migration 001-add-school...\n');

  // Step 1: find-or-create the default school (idempotent by code).
  let school = await School.findOne({ code: DEFAULT_SCHOOL_CODE });
  if (!school) {
    school = await School.create({ name: DEFAULT_SCHOOL_NAME, code: DEFAULT_SCHOOL_CODE });
    console.log(`Created default school "${school.name}" (${school.code}), id ${school._id}`);
  } else {
    console.log(`Using existing default school "${school.name}" (${school.code}), id ${school._id}`);
  }

  // Step 2: backfill `school` only where it's missing. $exists:false means
  // documents that already have the field (including ones set to this same
  // school by a prior run) are left completely alone.
  for (const { name, model } of COLLECTIONS) {
    const result = await model.updateMany({ school: { $exists: false } }, { $set: { school: school._id } });
    console.log(`${name}: backfilled ${result.modifiedCount} of ${result.matchedCount} matched document(s)`);
  }

  // Step 3: rebuild indexes that changed shape (className+section ->
  // school+className+section). syncIndexes drops indexes no longer in the
  // schema and creates missing ones; it does not touch any document data.
  console.log('\nSyncing indexes for ClassRoom and Routine...');
  await ClassRoom.syncIndexes();
  await Routine.syncIndexes();

  console.log('\nMigration complete.');
  process.exit(0);
};

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
