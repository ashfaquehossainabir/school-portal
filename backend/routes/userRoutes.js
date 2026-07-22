const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// GET all users (admin) - optional filters: ?role=student&className=Class 8&section=A
router.get('/', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { role, className, section } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (className) filter.className = className;
    if (section) filter.section = section;
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single user
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update user (admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.password; // password changes go through change-password route
    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE user permanently (admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Clean up parent-child links so no orphaned references are left behind
    if (user.role === 'student' && user.parent) {
      await User.findByIdAndUpdate(user.parent, { $pull: { children: user._id } });
    }
    if (user.role === 'parent' && user.children?.length) {
      await User.updateMany({ _id: { $in: user.children } }, { $unset: { parent: '' } });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted permanently' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST link parent to a student child (admin only)
router.post('/link-child', protect, authorize('admin'), async (req, res) => {
  try {
    const { parentId, studentId } = req.body;
    const parent = await User.findById(parentId);
    const student = await User.findById(studentId);
    if (!parent || parent.role !== 'parent') return res.status(400).json({ message: 'Invalid parent' });
    if (!student || student.role !== 'student') return res.status(400).json({ message: 'Invalid student' });

    if (!parent.children.includes(studentId)) {
      parent.children.push(studentId);
      await parent.save();
    }
    student.parent = parentId;
    await student.save();

    res.json({ message: 'Linked successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET children of logged-in parent
router.get('/parent/children', protect, authorize('parent'), async (req, res) => {
  try {
    const parent = await User.findById(req.user._id).populate('children', '-password');
    res.json(parent.children);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT reset a user's password (admin only) - no need to know the old password
router.put('/:id/reset-password', protect, authorize('admin'), async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH activate or deactivate a user account (admin only)
router.patch('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: !!isActive },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST assign a teacher to teach a subject for a specific class + section
router.post('/assign-subject', protect, authorize('admin'), async (req, res) => {
  try {
    const { teacherId, className, section, subject } = req.body;
    if (!teacherId || !className || !section || !subject) {
      return res.status(400).json({ message: 'teacherId, className, section, subject are all required' });
    }
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(400).json({ message: 'Invalid teacher' });
    }
    const alreadyAssigned = teacher.assignedClasses.some(
      (a) => a.className === className && a.section === section && a.subject === subject
    );
    if (!alreadyAssigned) {
      teacher.assignedClasses.push({ className, section, subject });
      await teacher.save();
    }
    const { password: _pw, ...safe } = teacher.toObject();
    res.json(safe);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST remove a teacher's subject assignment
router.post('/unassign-subject', protect, authorize('admin'), async (req, res) => {
  try {
    const { teacherId, className, section, subject } = req.body;
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(400).json({ message: 'Invalid teacher' });
    }
    teacher.assignedClasses = teacher.assignedClasses.filter(
      (a) => !(a.className === className && a.section === section && a.subject === subject)
    );
    await teacher.save();
    const { password: _pw, ...safe } = teacher.toObject();
    res.json(safe);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST unlink a parent from a student
router.post('/unlink-child', protect, authorize('admin'), async (req, res) => {
  try {
    const { parentId, studentId } = req.body;
    const parent = await User.findById(parentId);
    const student = await User.findById(studentId);
    if (!parent || !student) return res.status(404).json({ message: 'Parent or student not found' });

    parent.children = parent.children.filter((c) => c.toString() !== studentId);
    await parent.save();
    if (student.parent?.toString() === parentId) {
      student.parent = undefined;
      await student.save();
    }
    res.json({ message: 'Unlinked successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
