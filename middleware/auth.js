'use strict';

const jwt = require('jsonwebtoken');

const SECRET = process.env.SESSION_SECRET || 'bridgedegree-admin-secret-change-in-production';
const COOKIE = 'bd_admin_jwt';

// Only set Secure when actually served over HTTPS (so login works on localhost)
const isSecure = Boolean(process.env.BASE_URL && process.env.BASE_URL.startsWith('https'));

function sign(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '24h' });
}

function setAdminCookie(res, payload) {
  res.cookie(COOKIE, sign(payload), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearAdminCookie(res) {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'lax', secure: isSecure, path: '/', maxAge: 0 });
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
