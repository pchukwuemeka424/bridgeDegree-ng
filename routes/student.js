const express = require('express');
const router = express.Router();
const StudentApplication = require('../models/StudentApplication');

function normEmail(v) {
  return v ? String(v).trim().toLowerCase() : null;
}
function normId(v) {
  return v ? String(v).trim().toUpperCase() : null;
}

router.get('/dashboard', async (req, res) => {
  const email = normEmail(req.query.email);
  const applicationId = normId(req.query.applicationId);
  let application = null;
  let hasPassword = false;
  if (email && applicationId) {
    const doc = await StudentApplication.findOne({ email, applicationId }).lean();
    if (doc) {
      application = doc;
      const withPass = await StudentApplication.findById(doc._id).select('password').lean();
      hasPassword = !!(withPass && withPass.password);
    }
  }
  res.render('student/dashboard', {
    title: 'Student Dashboard',
    layout: 'layout-student',
    application,
    hasPassword: !!application && hasPassword,
    error: null,
    activeTab: req.query.tab === 'login' ? 'login' : 'view',
    setPasswordSuccess: !!req.query.set,
    setPasswordError: req.query.error === 'set',
  });
});

router.post('/dashboard', async (req, res) => {
  const mode = req.body.mode === 'login' ? 'login' : 'view';
  const email = normEmail(req.body.email);

  if (mode === 'login') {
    const password = req.body.password;
    if (!email || !password) {
      return res.render('student/dashboard', {
        title: 'Student Dashboard',
        layout: 'layout-student',
        application: null,
        error: 'Please enter your email and password.',
        activeTab: 'login',
      });
    }
    try {
      const doc = await StudentApplication.findOne({ email }).select('+password').sort({ submittedAt: -1 });
      if (!doc || !doc.password || !(await doc.comparePassword(password))) {
        return res.render('student/dashboard', {
          title: 'Student Dashboard',
          layout: 'layout-student',
          application: null,
          error: 'Invalid email or password. Use "View application" tab if you have not set a password yet.',
          activeTab: 'login',
        });
      }
      const application = await StudentApplication.findById(doc._id).lean();
      const withPass = await StudentApplication.findById(doc._id).select('password').lean();
      res.render('student/dashboard', {
        title: 'Student Dashboard',
        layout: 'layout-student',
        application,
        hasPassword: !!(withPass && withPass.password),
        error: null,
        activeTab: 'login',
      });
    } catch (err) {
      console.error(err);
      return res.render('student/dashboard', {
        title: 'Student Dashboard',
        layout: 'layout-student',
        application: null,
        error: 'Something went wrong. Please try again.',
        activeTab: 'login',
      });
    }
  }

  const applicationId = normId(req.body.applicationId);
  if (!email || !applicationId) {
    return res.render('student/dashboard', {
      title: 'Student Dashboard',
      layout: 'layout-student',
      application: null,
      error: 'Please enter your email and application ID.',
      activeTab: 'view',
    });
  }
  try {
    const doc = await StudentApplication.findOne({ email, applicationId });
    if (!doc) {
      return res.render('student/dashboard', {
        title: 'Student Dashboard',
        layout: 'layout-student',
        application: null,
        error: 'No application found for this email and application ID.',
        activeTab: 'view',
      });
    }
    const application = doc.toObject ? doc.toObject() : doc;
    const withPass = await StudentApplication.findById(doc._id).select('password').lean();
    const hasPassword = !!(withPass && withPass.password);
    res.render('student/dashboard', {
      title: 'Student Dashboard',
      layout: 'layout-student',
      application,
      hasPassword,
      error: null,
      activeTab: 'view',
    });
  } catch (err) {
    console.error(err);
    res.render('student/dashboard', {
      title: 'Student Dashboard',
      layout: 'layout-student',
      application: null,
      error: 'Something went wrong. Please try again.',
      activeTab: 'view',
    });
  }
});

router.post('/dashboard/set-password', async (req, res) => {
  const email = normEmail(req.body.email);
  const applicationId = normId(req.body.applicationId);
  const password = req.body.password ? String(req.body.password).trim() : '';
  if (!email || !applicationId || !password || password.length < 6) {
    return res.redirect('/student/dashboard?error=set');
  }
  try {
    const doc = await StudentApplication.findOne({ email, applicationId });
    if (!doc) {
      return res.redirect('/student/dashboard?error=set');
    }
    doc.password = password;
    await doc.save();
    return res.redirect('/student/dashboard?email=' + encodeURIComponent(email) + '&applicationId=' + encodeURIComponent(applicationId) + '&set=1');
  } catch (err) {
    console.error(err);
    return res.redirect('/student/dashboard?error=set');
  }
});

module.exports = router;
