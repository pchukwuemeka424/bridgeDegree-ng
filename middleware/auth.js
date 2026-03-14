'use strict';

const jwt = require('jsonwebtoken');

const SECRET = process.env.SESSION_SECRET || 'bridgedegree-admin-secret-change-in-production';
const COOKIE = 'bd_admin_jwt';

function sign(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '24h' });
}

function setAdminCookie(res, payload) {
  res.cookie(COOKIE, sign(payload), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearAdminCookie(res) {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
}

function getAdmin(req) {
  try {
    const token = req.cookies && req.cookies[COOKIE];
    if (!token) return null;
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

function requireAdmin(req, res, next) {
  if (getAdmin(req)) return next();
  res.redirect(303, '/admin/login');
}

module.exports = { requireAdmin, setAdminCookie, clearAdminCookie, getAdmin };
