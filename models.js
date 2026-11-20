import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' }
}, { timestamps: true });

const materialSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['Notes', 'PYQ', 'Assignment', 'Practical', 'Question Bank', 'Syllabus', 'Other'], required: true },
  department: { type: String, default: 'Computer Science & Engineering' },
  semester: { type: Number, min: 1, max: 8, required: true },
  subject: { type: String, required: true, trim: true },
  unit: { type: String, default: '' },
  year: { type: String, default: '' },
  originalName: String,
  storedName: String,
  mimeType: String,
  size: Number,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
export const Material = mongoose.model('Material', materialSchema);
