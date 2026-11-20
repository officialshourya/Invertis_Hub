
import jwt from 'jsonwebtoken';
import { User } from './models.js';

const ADMIN_EMAIL = 'realshourya7@gmail.com';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ')
      ? header.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        message: 'Please log in to continue.'
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: 'Authentication is not configured.'
      });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(payload.id).select('-password');

    if (!user) {
      return res.status(401).json({
        message: 'Account not found.'
      });
    }

    // Only the designated account can have admin privileges.
    if (user.email.toLowerCase() === ADMIN_EMAIL) {
      if (user.role !== 'admin') {
        user.role = 'admin';
        await user.save();
      }
    } else if (user.role === 'admin') {
      // Remove accidental admin privileges from other accounts.
      user.role = 'student';
      await user.save();
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      message: 'Session expired. Please log in again.'
    });
  }
}

export function requireAdmin(req, res, next) {
  if (
    req.user?.role !== 'admin' ||
    req.user?.email?.toLowerCase() !== ADMIN_EMAIL
  ) {
    return res.status(403).json({
      message: 'Admin access required.'
    });
  }

  next();
}
