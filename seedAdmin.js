import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from './models.js';

if (!process.env.MONGODB_URI || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) {
  console.error('Set MONGODB_URI, JWT_SECRET, ADMIN_EMAIL and ADMIN_PASSWORD in server/.env first.');
  process.exit(1);
}
await mongoose.connect(process.env.MONGODB_URI);
const email = process.env.ADMIN_EMAIL.toLowerCase();
const password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
const admin = await User.findOneAndUpdate(
  { email },
  { name: process.env.ADMIN_NAME || 'Invertis Hub Admin', email, password, role: 'admin' },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);
console.log(`Admin account ready: ${admin.email}`);
console.log('For security, change the initial password and keep .env private.');
await mongoose.disconnect();
