'use strict';

const express = require('express');
const router = express.Router();
const StudentApplication = require('../../models/StudentApplication');
const { normEmail, normId } = require('./helpers');

router.get('/login', (req, res) => {
  const activeTab = req.query.tab === 'login' ? 'login' : 'view';
  res.render('student/login', {
    title: 'Student Login',
    layout: 'layout-student',
    application: null,
    error: req.query.error === 'set' ? 'Could not set password. Try again from your dashboard after signing in.' : null,
    activeTab,
    redirect: req.query.redirect || '',
  });
});

router.post('/login', async (req, res) => {
  const mode = req.body.mode === 'login' ? 'login' : 'view';
  const email = normEmail(req.body.email);

  if (mode === 'login') {
    const password = req.body.password;
    if (!email || !password) {
      return res.render('student/login', {
        title: 'Student Login',
        layout: 'layout-student',
        application: null,
        error: 'Please enter your email and password.',
        activeTab: 'login',
        redirect: '',
      });
    }
    try {
      const doc = await StudentApplication.findOne({ email }).select('+password').sort({ submittedAt: -1 });
      if (!doc || !doc.password || !(await doc.comparePassword(password))) {
        return res.render('student/login', {
          title: 'Student Login',
          layout: 'layout-student',
          application: null,
          error: 'Invalid email or password. Use "View application" tab if you have not set a password yet.',
          activeTab: 'login',
          redirect: '',
        });
      }
      const redirectUrl = '/student/dashboard?email=' + encodeURIComponent(doc.email) + '&applicationId=' + encodeURIComponent(doc.applicationId);
      return res.redirect(redirectUrl);
    } catch (err) {
      console.error(err);
      return res.render('student/login', {
        title: 'Student Login',
        layout: 'layout-student',
        application: null,
        error: 'Something went wrong. Please try again.',
        activeTab: 'login',
        redirect: '',
      });
    }
  }

  const applicationId = normId(req.body.applicationId);
  if (!email || !applicationId) {
    return res.render('student/login', {
      title: 'Student Login',
      layout: 'layout-student',
      application: null,
      error: 'Please enter your email and application ID.',
      activeTab: 'view',
      redirect: '',
    });
  }
  try {
    const doc = await StudentApplication.findOne({ email, applicationId });
    if (!doc) {
      return res.render('student/login', {
        title: 'Student Login',
        layout: 'layout-student',
        application: null,
        error: 'No application found for this email and application ID.',
        activeTab: 'view',
        redirect: '',
      });
    }
    const redirectUrl = '/student/dashboard?email=' + encodeURIComponent(email) + '&applicationId=' + encodeURIComponent(applicationId);
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error(err);
    return res.render('student/login', {
      title: 'Student Login',
      layout: 'layout-student',
      application: null,
      error: 'Something went wrong. Please try again.',
      activeTab: 'view',
      redirect: '',
    });
  }
});

// GET /student/logout — clear client context and redirect to login
router.get('/logout', (req, res) => {
  res.redirect(302, '/student/login');
});

module.exports = router;
