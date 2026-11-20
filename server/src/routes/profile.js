
import express from 'express';
import { User } from '../models.js';
import { authenticate, requireAdmin } from '../middleware.js';

const router = express.Router();

const allowedFields = [
  'photoUrl',
  'fullName',
  'mobile',
  'studentId',
  'course',
  'branch',
  'specialization',
  'department',
  'year',
  'semester'
];

const limits = {
  photoUrl: 500,
  fullName: 100,
  mobile: 20,
  studentId: 40,
  course: 100,
  branch: 100,
  specialization: 100,
  department: 100,
  year: 30,
  semester: 30
};

// Student can view only their own profile
router.get('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('name email role profile');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({
      profile: user.profile || {},
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch {
    res.status(500).json({ message: 'Could not load profile.' });
  }
});

// Student can update only their own profile
router.put('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const updates = {};

    for (const field of allowedFields) {
      if (typeof req.body[field] === 'string') {
        const value = req.body[field].trim();

        if (value.length > limits[field]) {
          return res.status(400).json({
            message: `${field} is too long.`
          });
        }

        updates[field] = value;
      }
    }

    if (updates.mobile && !/^[0-9+\-\s()]{7,20}$/.test(updates.mobile)) {
      return res.status(400).json({
        message: 'Please enter a valid mobile number.'
      });
    }

    if (updates.photoUrl) {
      try {
        const photo = new URL(updates.photoUrl);
        if (photo.protocol !== 'https:') throw new Error();
      } catch {
        return res.status(400).json({
          message: 'Profile photo must use a valid HTTPS URL.'
        });
      }
    }

    for (const [key, value] of Object.entries(updates)) {
      user.set(`profile.${key}`, value);
    }

    if (updates.fullName) {
      user.name = updates.fullName;
    }

    await user.save();

    res.json({
      message: 'Profile saved successfully.',
      profile: user.profile,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch {
    res.status(500).json({ message: 'Could not save profile.' });
  }
});

// Admin-only access to a student's profile
router.get('/admin/:userId', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('name email role profile');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      profile: user.profile || {}
    });
  } catch {
    res.status(400).json({ message: 'Could not load student profile.' });
  }
});

export default router;
