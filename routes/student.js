const express = require('express');
const router = express.Router();
const StudentApplication = require('../models/StudentApplication');

router.get('/dashboard', (req, res) => {
  res.render('student/dashboard', {
    title: 'Student Dashboard',
    layout: 'layout-student',
    application: null,
    error: null,
  });
});

router.post('/dashboard', async (req, res) => {
  const { email, applicationId } = (req.body || {}).email ? req.body : req.query;
  const e = (req.body && req.body.email) ? req.body.email.trim().toLowerCase() : (req.query && req.query.email) ? req.query.email.trim().toLowerCase() : null;
  const id = (req.body && req.body.applicationId) ? req.body.applicationId.trim().toUpperCase() : (req.query && req.query.applicationId) ? req.query.applicationId.trim().toUpperCase() : null;
  if (!e || !id) {
    return res.render('student/dashboard', {
      title: 'Student Dashboard',
      layout: 'layout-student',
      application: null,
      error: 'Please enter your email and application ID.',
    });
  }
  try {
    const application = await StudentApplication.findOne({
      email: e,
      applicationId: id,
    }).lean();
    if (!application) {
      return res.render('student/dashboard', {
        title: 'Student Dashboard',
        layout: 'layout-student',
        application: null,
        error: 'No application found for this email and application ID.',
      });
    }
    res.render('student/dashboard', {
      title: 'Student Dashboard',
      layout: 'layout-student',
      application,
      error: null,
    });
  } catch (err) {
    console.error(err);
    res.render('student/dashboard', {
      title: 'Student Dashboard',
      layout: 'layout-student',
      application: null,
      error: 'Something went wrong. Please try again.',
    });
  }
});

module.exports = router;
