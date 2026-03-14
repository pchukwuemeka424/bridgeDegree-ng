function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  if (req.originalUrl && req.originalUrl.startsWith('/admin')) {
    return res.redirect('/admin/login');
  }
  res.redirect('/admin/login');
}

module.exports = { requireAdmin };
