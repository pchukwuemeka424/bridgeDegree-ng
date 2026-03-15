'use strict';

const express = require('express');
const router = express.Router();
const StudentApplication = require('../../models/StudentApplication');
const { normEmail, normId } = require('./helpers');

const JOURNEY_STEPS = [
  { id: 'submitted', label: 'Application submitted', short: 'Submitted' },
  { id: 'under_review', label: 'Under review', short: 'Under review' },
  { id: 'shortlisted', label: 'Shortlisted', short: 'Shortlisted' },
  { id: 'accepted', label: 'Accepted', short: 'Accepted' },
];

const STATUS_NEXT_STEPS = {
  submitted: {
    title: 'What happens next',
    items: [
      'Our team will review your application and profile.',
      'You may receive an email when your status changes.',
      'Check this dashboard or your email for updates.',
    ],
  },
  under_review: {
    title: 'What happens next',
    items: [
      'Your application is being reviewed by our team.',
      'We may reach out if we need any clarification.',
      'Shortlisted applicants will be notified by email.',
    ],
  },
  shortlisted: {
    title: 'What happens next',
    items: [
      'You’re on the shortlist. We’ll contact you with next steps.',
      'Prepare for any follow-up or interview if required.',
      'Keep an eye on your email and this dashboard.',
    ],
  },
  accepted: {
    title: 'You’re in',
    items: [
      'You’ve been accepted into the programme.',
      'We’ll send you details on onboarding and next steps.',
      'Explore the Career Passport and resources below.',
    ],
  },
  rejected: {
    title: 'This time',
    items: [
      'We weren’t able to offer you a place on this round.',
      'You’re welcome to apply again in the future.',
      'Use our resources and How it works to strengthen your profile.',
    ],
  },
};

router.get('/dashboard/learning', async (req, res) => {
  const email = normEmail(req.query.email);
  const applicationId = normId(req.query.applicationId);

  if (!email || !applicationId) {
    return res.redirect('/student/login?redirect=learning');
  }

  const doc = await StudentApplication.findOne({ email, applicationId }).lean();
  if (!doc) {
    return res.redirect('/student/login?error=view');
  }

  const application = doc;
  const status = application.status || 'submitted';
  const journeySteps = JOURNEY_STEPS.map((step) => ({
    ...step,
    isActive: step.id === status,
    isPast: JOURNEY_STEPS.findIndex((s) => s.id === status) > JOURNEY_STEPS.findIndex((s) => s.id === step.id),
  }));
  const nextSteps = STATUS_NEXT_STEPS[status] || STATUS_NEXT_STEPS.submitted;

  res.render('student/learning', {
    title: 'Learning',
    layout: 'layout-student',
    application,
    journeySteps,
    nextSteps,
    breadcrumb: ['LEARNING'],
    studentNav: { dashboard: false, learning: true, account: false, password: false },
  });
});

module.exports = router;
