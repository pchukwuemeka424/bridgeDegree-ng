/**
 * Create an initial admin user. Run once: node scripts/seed-admin.js
 * Set ADMIN_EMAIL and ADMIN_PASSWORD in env or below.
 */
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bridgedegree';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@bridgedegree.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const existing = await Admin.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log('Admin already exists:', ADMIN_EMAIL);
    process.exit(0);
    return;
  }
  await Admin.create({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: 'Admin' });
  console.log('Admin created:', ADMIN_EMAIL, '(change password after first login if using default)');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
