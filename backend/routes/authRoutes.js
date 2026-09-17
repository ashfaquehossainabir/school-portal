const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });

// @route POST /api/auth/login
// Accepts either an email address or a student ID in the "email" field,
// so students who log in with an ID like "STU2026014" work the same way.
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const identifier = (email || '').trim();
    const isEmail = identifier.includes('@');

    const user = isEmail
      ? await User.findOne({ email: identifier.toLowerCase() })
      : await User.findOne({ studentId: identifier.toUpperCase() });

    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = signToken(user);
    const { password: _pw, ...userSafe } = user.toObject();
    res.json({ token, user: userSafe });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

// @route POST /api/auth/create-user (admin only - creates teacher/student/parent accounts)
router.post('/create-user', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, email, password, role, className, section, roll, studentId, subject, phone } = req.body;

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: 'Email already in use' });

    if (role === 'student') {
      if (!studentId || !studentId.trim()) {
        return res.status(400).json({ message: 'Student ID is required for student accounts' });
      }
      const idExists = await User.findOne({ studentId: studentId.trim().toUpperCase() });
      if (idExists) return res.status(400).json({ message: 'That Student ID is already in use' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      school: req.user.school, // new accounts always belong to the creating admin's school
      name,
      email: email.toLowerCase(),
      password: hashed,
      role,
      className,
      section,
      roll,
      studentId: role === 'student' ? studentId.trim().toUpperCase() : undefined,
      subject,
      phone,
    });

    const { password: _pw, ...userSafe } = user.toObject();
    res.status(201).json(userSafe);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route PUT /api/auth/change-password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ message: 'Current password is incorrect' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
