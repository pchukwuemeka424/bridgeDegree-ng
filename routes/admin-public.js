'use strict';

const express = require('express');
const Admin = require('../models/Admin');
const { setAdminCookie, clearAdminCookie, getAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /admin/login — show form only; no redirect (avoids any loop)
router.get('/login', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.render('admin/login', {
    title: 'Admin Login',
    layout: 'layout-admin',
    layoutNoHeader: true,
    error: req.query.error ? 'Invalid email or password.' : null,
  });
});

// POST /admin/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.redirect('/admin/login?error=1');
  }
  try {
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin || !(await admin.comparePassword(password))) {
      return res.redirect('/admin/login?error=1');
    }
    setAdminCookie(res, { id: admin._id.toString(), email: admin.email });
    return res.redirect(302, '/admin');
  } catch (err) {
    console.error(err);
    return res.redirect('/admin/login?error=1');
  }
});

// GET /admin/logout
router.get('/logout', (req, res) => {
  clearAdminCookie(res);
  res.redirect(302, '/admin/login');
});

module.exports = router;
