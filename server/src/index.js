
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

import { User, Material } from './models.js';
import { authenticate, requireAdmin } from './middleware.js';
import profileRoutes from './routes/profile.js';
import academicRoutes from './routes/academic.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

const uploadDir = path.resolve(__dirname, '../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

app.use(cors({
  origin: process.env.CLIENT_URL?.split(',') || 'http://localhost:5173'
}));

app.use(express.json({ limit: '1mb' }));

// Existing profile routes
app.use('/api/profile', profileRoutes);

// New academic feature routes
app.use('/api/academic', academicRoutes);

// Uploaded files
app.use('/uploads', express.static(uploadDir));

app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false
}));

const allowedMime = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png'
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, allowedMime.has(file.mimetype))
});

// Health
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'Invertis Hub API'
  });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      typeof password !== 'string' ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: 'Name, email and a password of at least 8 characters are required.'
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({
        message: 'An account with this email already exists.'
      });
    }

    await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      role: 'student'
    });

    res.status(201).json({
      message: 'Student account created. You can now log in.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Could not create account.'
    });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = String(email || '').toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail
    });

    if (!user || !(await bcrypt.compare(password || '', user.password))) {
      return res.status(401).json({
        message: 'Incorrect email or password.'
      });
    }

    // Only the designated account can be an admin.
    if (normalizedEmail === 'realshourya7@gmail.com') {
      if (user.role !== 'admin') {
        user.role = 'admin';
        await user.save();
      }
    } else if (user.role === 'admin') {
      user.role = 'student';
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Login failed. Please try again.'
    });
  }
});

// Current user
app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Materials
app.get('/api/materials', async (req, res) => {
  try {
    const filter = {};

    if (req.query.type && req.query.type !== 'All') {
      filter.type = req.query.type;
    }

    if (req.query.semester) {
      filter.semester = Number(req.query.semester);
    }

    if (req.query.search) {
      const search = String(req.query.search).slice(0, 100);

      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const materials = await Material.find(filter)
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ materials });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Could not load study materials.'
    });
  }
});

// Admin statistics
app.get('/api/admin/stats', authenticate, requireAdmin, async (_req, res) => {
  try {
    const [
      students,
      admins,
      materials,
      notes,
      pyqs,
      assignments,
      practicals
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'admin' }),
      Material.countDocuments(),
      Material.countDocuments({ type: 'Notes' }),
      Material.countDocuments({ type: 'PYQ' }),
      Material.countDocuments({ type: 'Assignment' }),
      Material.countDocuments({ type: 'Practical' })
    ]);

    res.json({
      students,
      admins,
      materials,
      notes,
      pyqs,
      assignments,
      practicals
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Could not load admin statistics.'
    });
  }
});

// Upload material
app.post(
  '/api/admin/materials',
  authenticate,
  requireAdmin,
  (req, res, next) => {
    upload.single('file')(req, res, err => {
      if (err) {
        return res.status(400).json({
          message: err.code === 'LIMIT_FILE_SIZE'
            ? 'File must be 15 MB or smaller.'
            : 'Unsupported file. Use PDF, DOC, DOCX, PPT, PPTX, JPG or PNG.'
        });
      }

      next();
    });
  },
  async (req, res) => {
    try {
      const {
        title,
        description,
        type,
        department,
        semester,
        subject,
        unit,
        year
      } = req.body;

      if (!req.file || !title || !type || !semester || !subject) {
        if (req.file) fs.unlink(req.file.path, () => {});

        return res.status(400).json({
          message: 'File, title, type, semester and subject are required.'
        });
      }

      const allowedTypes = [
        'Notes',
        'PYQ',
        'Assignment',
        'Practical',
        'Question Bank',
        'Syllabus',
        'Other'
      ];

      if (
        !allowedTypes.includes(type) ||
        Number(semester) < 1 ||
        Number(semester) > 8
      ) {
        fs.unlink(req.file.path, () => {});

        return res.status(400).json({
          message: 'Please choose a valid material type and semester.'
        });
      }

      const material = await Material.create({
        title,
        description,
        type,
        department,
        semester: Number(semester),
        subject,
        unit,
        year,
        originalName: req.file.originalname,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedBy: req.user._id
      });

      res.status(201).json({
        message: 'Material uploaded successfully.',
        material
      });
    } catch (error) {
      console.error(error);

      if (req.file) fs.unlink(req.file.path, () => {});

      res.status(500).json({
        message: 'Upload failed.'
      });
    }
  }
);

// Update material
app.put(
  '/api/admin/materials/:id',
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const fields = [
        'title',
        'description',
        'type',
        'department',
        'semester',
        'subject',
        'unit',
        'year'
      ];

      const update = Object.fromEntries(
        fields
          .filter(key => req.body[key] !== undefined)
          .map(key => [key, req.body[key]])
      );

      const material = await Material.findByIdAndUpdate(
        req.params.id,
        update,
        { new: true, runValidators: true }
      );

      if (!material) {
        return res.status(404).json({
          message: 'Material not found.'
        });
      }

      res.json({
        message: 'Material updated.',
        material
      });
    } catch (error) {
      console.error(error);
      res.status(400).json({
        message: 'Could not update material.'
      });
    }
  }
);

// Delete material
app.delete(
  '/api/admin/materials/:id',
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const material = await Material.findByIdAndDelete(req.params.id);

      if (!material) {
        return res.status(404).json({
          message: 'Material not found.'
        });
      }

      if (material.storedName) {
        fs.unlink(path.join(uploadDir, material.storedName), () => {});
      }

      res.json({ message: 'Material deleted.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: 'Could not delete material.'
      });
    }
  }
);

// Admin users
app.get('/api/admin/users', authenticate, requireAdmin, async (_req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(300);

    res.json({ users });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Could not load users.'
    });
  }
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    message: 'Unexpected server error.'
  });
});

if (!process.env.JWT_SECRET) {
  console.warn(
    'WARNING: JWT_SECRET is missing. Set it in Render environment variables.'
  );
}

if (!process.env.MONGODB_URI) {
  console.warn(
    'WARNING: MONGODB_URI is missing. Set it in Render environment variables.'
  );
}

await mongoose.connect(
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/invertis_hub'
);

app.listen(PORT, () => {
  console.log(`Invertis Hub API running on port ${PORT}`);
});
