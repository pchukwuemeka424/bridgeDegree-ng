'use strict';

const express = require('express');
const mongoose = require('mongoose');
const { put: putBlob } = require('@vercel/blob');
const router = express.Router();
const StudentApplication = require('../../models/StudentApplication');
const Internship = require('../../models/Internship');
const { uploadPassport } = require('../../middleware/upload');
const { normEmail, normId } = require('./helpers');

/** Students who may self-select an open internship placement from the dashboard. */
const PLACEMENT_ELIGIBLE_STATUSES = ['accepted', 'shortlisted'];

function groupPlacementsByCategory(placements) {
  const map = new Map();
  for (const p of placements) {
    const cat = p.category;
    if (!cat || !cat._id) continue;
    const key = String(cat._id);
    if (!map.has(key)) {
      map.set(key, {
        categoryName: cat.name || 'Other',
        categorySort: typeof cat.sortOrder === 'number' ? cat.sortOrder : 9999,
        placements: [],
      });
    }
    map.get(key).placements.push(p);
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.categorySort !== b.categorySort) return a.categorySort - b.categorySort;
    return a.categoryName.localeCompare(b.categoryName);
  });
}

function dashboardRedirect(path, email, applicationId, query = {}) {
  const params = new URLSearchParams({ email, applicationId });
  Object.entries(query).forEach(([k, v]) => {
    if (v != null && v !== '') params.set(k, v);
  });
  return '/student/dashboard' + path + '?' + params.toString();
}

async function getPassportPhotoUrl(file) {
  if (!file) return null;
  if (process.env.BLOB_READ_WRITE_TOKEN && file.buffer) {
    const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/gif' ? 'gif' : 'jpg';
    const pathname = `passports/passport-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const blob = await putBlob(pathname, file.buffer, { access: 'public', contentType: file.mimetype, addRandomSuffix: true });
    return blob.url;
  }
  return '/uploads/passports/' + file.filename;
}

router.get('/dashboard', async (req, res) => {
  const email = normEmail(req.query.email);
  const applicationId = normId(req.query.applicationId);

  if (!email || !applicationId) {
    return res.redirect('/student/login' + (req.query.redirect ? '?redirect=' + encodeURIComponent(req.query.redirect) : ''));
  }

  const doc = await StudentApplication.findOne({ email, applicationId })
    .populate({
      path: 'internship',
      select: 'title description active category',
      populate: { path: 'category', select: 'name' },
    })
    .lean();
  if (!doc) {
    return res.redirect('/student/login?error=view');
  }

  const application = doc;
  const withPass = await StudentApplication.findById(doc._id).select('password').lean();
  const hasPassword = !!(withPass && withPass.password);

  const canChoosePlacement = PLACEMENT_ELIGIBLE_STATUSES.includes(application.status);
  let availablePlacements = [];
  let placementGroups = [];
  if (canChoosePlacement) {
    availablePlacements = await Internship.find({ active: true })
      .sort({ sortOrder: 1, title: 1 })
      .populate({
        path: 'category',
        select: 'name sortOrder active',
        match: { active: { $ne: false } },
      })
      .lean();
    availablePlacements = availablePlacements.filter((p) => p.category && p.category._id);
    placementGroups = groupPlacementsByCategory(availablePlacements);
  }

  const placementOk = !!req.query.placementOk;
  const placementErr = (req.query.placementErr || '').trim();

  res.render('student/dashboard', {
    title: 'Dashboard',
    layout: 'layout-student',
    application,
    hasPassword,
    canChoosePlacement,
    availablePlacements,
    placementGroups,
    placementOk,
    placementErr,
    breadcrumb: ['DASHBOARD'],
    studentNav: { dashboard: true, learning: false, account: false, password: false },
  });
});

router.post('/dashboard/placement', async (req, res) => {
  const email = normEmail(req.body.email);
  const applicationId = normId(req.body.applicationId);
  const rawId = req.body.internshipId != null ? String(req.body.internshipId).trim() : '';

  if (!email || !applicationId) {
    return res.redirect('/student/login');
  }

  const doc = await StudentApplication.findOne({ email, applicationId });
  if (!doc) {
    return res.redirect('/student/login?error=view');
  }

  const base = dashboardRedirect('', email, applicationId, {});

  if (!PLACEMENT_ELIGIBLE_STATUSES.includes(doc.status)) {
    return res.redirect(303, base + '&placementErr=eligible');
  }

  if (!rawId) {
    return res.redirect(303, base + '&placementErr=missing');
  }

  if (!mongoose.Types.ObjectId.isValid(rawId)) {
    return res.redirect(303, base + '&placementErr=invalid');
  }

  const placement = await Internship.findById(rawId)
    .select('_id active category')
    .populate({ path: 'category', select: 'active' })
    .lean();
  if (!placement) {
    return res.redirect(303, base + '&placementErr=notfound');
  }
  if (!placement.active) {
    return res.redirect(303, base + '&placementErr=inactive');
  }
  if (!placement.category || placement.category.active === false) {
    return res.redirect(303, base + '&placementErr=inactive');
  }

  try {
    doc.internship = placement._id;
    await doc.save();
    return res.redirect(303, base + '&placementOk=1');
  } catch (err) {
    console.error(err);
    return res.redirect(303, base + '&placementErr=server');
  }
});

router.get('/dashboard/account', async (req, res) => {
  const email = normEmail(req.query.email);
  const applicationId = normId(req.query.applicationId);
  if (!email || !applicationId) return res.redirect('/student/login');
  const doc = await StudentApplication.findOne({ email, applicationId }).lean();
  if (!doc) return res.redirect('/student/login?error=view');
  res.render('student/account', {
    title: 'Edit Account',
    layout: 'layout-student',
    application: doc,
    profileUpdated: !!req.query.updated,
    profileError: req.query.error === 'profile',
    passportUploaded: !!req.query.uploaded,
    passportError: req.query.error === 'passport',
    breadcrumb: ['ACCOUNT'],
    studentNav: { dashboard: false, learning: false, account: true, password: false },
  });
});

router.post('/dashboard/account', async (req, res) => {
  const email = normEmail(req.body.email);
  const applicationId = normId(req.body.applicationId);
  if (!email || !applicationId) return res.redirect('/student/login');
  const doc = await StudentApplication.findOne({ email, applicationId });
  if (!doc) return res.redirect('/student/login?error=view');
  const firstname = (req.body.firstname || '').trim();
  const lastname = (req.body.lastname || '').trim();
  if (!firstname || !lastname) {
    return res.redirect(dashboardRedirect('/account', email, applicationId, { error: 'profile' }));
  }
  try {
    doc.firstname = firstname;
    doc.lastname = lastname;
    if (req.body.career_goal != null) doc.career_goal = String(req.body.career_goal).trim();
    if (req.body.work_experience != null) doc.work_experience = String(req.body.work_experience).trim();
    if (req.body.skills_other != null) doc.skills_other = String(req.body.skills_other).trim();
    await doc.save();
    return res.redirect(dashboardRedirect('/account', email, applicationId, { updated: '1' }));
  } catch (err) {
    console.error(err);
    return res.redirect(dashboardRedirect('/account', email, applicationId, { error: 'profile' }));
  }
});

router.post('/dashboard/account/upload-passport', uploadPassport.single('passport'), async (req, res) => {
  const email = normEmail(req.body.email);
  const applicationId = normId(req.body.applicationId);
  if (!email || !applicationId) return res.redirect('/student/login');
  const doc = await StudentApplication.findOne({ email, applicationId });
  if (!doc) return res.redirect(dashboardRedirect('/account', email, applicationId, { error: 'passport' }));
  if (!req.file) {
    return res.redirect(dashboardRedirect('/account', email, applicationId, { error: 'passport' }));
  }
  try {
    const url = await getPassportPhotoUrl(req.file);
    if (url) {
      doc.passportPhoto = url;
      await doc.save();
    }
    return res.redirect(dashboardRedirect('/account', email, applicationId, { uploaded: '1' }));
  } catch (err) {
    console.error(err);
    return res.redirect(dashboardRedirect('/account', email, applicationId, { error: 'passport' }));
  }
});

router.get('/dashboard/password', async (req, res) => {
  const email = normEmail(req.query.email);
  const applicationId = normId(req.query.applicationId);
  if (!email || !applicationId) return res.redirect('/student/login');
  const doc = await StudentApplication.findOne({ email, applicationId }).lean();
  if (!doc) return res.redirect('/student/login?error=view');
  const withPass = await StudentApplication.findById(doc._id).select('password').lean();
  const hasPassword = !!(withPass && withPass.password);
  res.render('student/password', {
    title: 'Password',
    layout: 'layout-student',
    application: doc,
    hasPassword,
    setPasswordSuccess: !!req.query.set,
    setPasswordError: req.query.error === 'set',
    changePasswordSuccess: !!req.query.changed,
    changePasswordError: req.query.error === 'change',
    breadcrumb: ['PASSWORD'],
    studentNav: { dashboard: false, learning: false, account: false, password: true },
  });
});

router.post('/dashboard/set-password', async (req, res) => {
  const email = normEmail(req.body.email);
  const applicationId = normId(req.body.applicationId);
  const password = req.body.password ? String(req.body.password).trim() : '';
  if (!email || !applicationId || !password || password.length < 6) {
    return res.redirect(email && applicationId ? dashboardRedirect('/password', email, applicationId, { error: 'set' }) : '/student/login?error=set');
  }
  try {
    const doc = await StudentApplication.findOne({ email, applicationId });
    if (!doc) return res.redirect(dashboardRedirect('/password', email, applicationId, { error: 'set' }));
    doc.password = password;
    await doc.save();
    return res.redirect(dashboardRedirect('/password', email, applicationId, { set: '1' }));
  } catch (err) {
    console.error(err);
    return res.redirect(dashboardRedirect('/password', email, applicationId, { error: 'set' }));
  }
});

router.post('/dashboard/change-password', async (req, res) => {
  const email = normEmail(req.body.email);
  const applicationId = normId(req.body.applicationId);
  const currentPassword = req.body.currentPassword ? String(req.body.currentPassword).trim() : '';
  const newPassword = req.body.newPassword ? String(req.body.newPassword).trim() : '';
  if (!email || !applicationId) return res.redirect('/student/login');
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.redirect(dashboardRedirect('/password', email, applicationId, { error: 'change' }));
  }
  try {
    const doc = await StudentApplication.findOne({ email, applicationId }).select('+password');
    if (!doc || !doc.password || !(await doc.comparePassword(currentPassword))) {
      return res.redirect(dashboardRedirect('/password', email, applicationId, { error: 'change' }));
    }
    doc.password = newPassword;
    await doc.save();
    return res.redirect(dashboardRedirect('/password', email, applicationId, { changed: '1' }));
  } catch (err) {
    console.error(err);
    return res.redirect(dashboardRedirect('/password', email, applicationId, { error: 'change' }));
  }
});

router.get('/dashboard/career-passport', async (req, res) => {
  const email = normEmail(req.query.email);
  const applicationId = normId(req.query.applicationId);
  if (!email || !applicationId) {
    return res.redirect('/student/login');
  }
  const doc = await StudentApplication.findOne({ email, applicationId }).lean();
  if (!doc) {
    return res.redirect('/student/login?error=view');
  }
  res.render('student/career-passport', {
    title: 'Career Passport',
    layout: 'layout-student',
    application: doc,
    breadcrumb: ['CAREER PASSPORT'],
    studentNav: { dashboard: true, learning: false, account: false, password: false },
  });
});

module.exports = router;
