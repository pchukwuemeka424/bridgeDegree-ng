/**
 * Update an existing admin's password. Run: node scripts/update-admin-password.js
 * Set ADMIN_EMAIL and ADMIN_PASSWORD in env or edit below.
 */
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bridgedegree';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@bridgedegree.com';
const NEW_PASSWORD = process.env.ADMIN_PASSWORD || 'Holiday100@';

async function updatePassword() {
  await mongoose.connect(MONGODB_URI);
  const admin = await Admin.findOne({ email: ADMIN_EMAIL });
  if (!admin) {
    console.error('Admin not found:', ADMIN_EMAIL);
    process.exit(1);
  }
  admin.password = NEW_PASSWORD;
  await admin.save();
  console.log('Password updated for:', ADMIN_EMAIL);
  process.exit(0);
}

updatePassword().catch((err) => {
  console.error(err);
  process.exit(1);
});
