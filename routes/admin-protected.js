'use strict';

const express = require('express');
const mongoose = require('mongoose');
const { put: putBlob } = require('@vercel/blob');
const BlogPost = require('../models/BlogPost');
const StudentApplication = require('../models/StudentApplication');
const Testimonial = require('../models/Testimonial');
const Partner = require('../models/Partner');
const HomeHero = require('../models/HomeHero');
const InternshipCategory = require('../models/InternshipCategory');
const Internship = require('../models/Internship');
const upload = require('../middleware/upload');
const { uploadPartner, uploadHero } = require('../middleware/upload');
const { sendApplicationStatusEmail, sendPlacementAssignedEmail } = require('../services/email');
const { stripHtml } = require('../utils/html');

const router = express.Router();

const APPLICATION_STATUSES = ['submitted', 'under_review', 'shortlisted', 'accepted', 'rejected'];

function parseBodyStudentIds(body) {
  const raw = body && body.studentIds;
  if (raw == null || raw === '') return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map((id) => String(id).trim()).filter((id) => mongoose.Types.ObjectId.isValid(id));
}

/** Preserve internship roster list filters in redirects (GET query or POST body). */
function internshipRosterQuerySuffix(source) {
  const p = new URLSearchParams();
  const q = source && source.q != null ? String(source.q).trim() : '';
  const pool = source && source.pool != null ? String(source.pool).trim() : '';
  const status = source && source.status != null ? String(source.status).trim() : '';
  const page = source && source.page != null ? String(source.page).trim() : '';
  const assignedStatus =
    source && source.assignedStatus != null ? String(source.assignedStatus).trim() : '';
  if (q) p.set('q', q);
  if (pool && pool !== 'all') p.set('pool', pool);
  if (status && APPLICATION_STATUSES.includes(status)) p.set('status', status);
  if (page && page !== '1') p.set('page', page);
  if (assignedStatus && APPLICATION_STATUSES.includes(assignedStatus)) {
    p.set('assignedStatus', assignedStatus);
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

async function assignStudentToInternship(internshipId, studentId) {
  if (!mongoose.Types.ObjectId.isValid(internshipId) || !mongoose.Types.ObjectId.isValid(studentId)) {
    return { ok: false, code: 'invalid' };
  }
  const internship = await Internship.findById(internshipId)
    .select('_id active title')
    .populate('category', 'name')
    .lean();
  if (!internship) return { ok: false, code: 'no_internship' };
  if (!internship.active) return { ok: false, code: 'inactive' };
  const student = await StudentApplication.findById(studentId)
    .select('_id internship email firstname applicationId')
    .lean();
  if (!student) return { ok: false, code: 'notfound' };
  if (student.internship && String(student.internship) === String(internship._id)) {
    return { ok: false, code: 'already' };
  }
  await StudentApplication.findByIdAndUpdate(studentId, { internship: internship._id });
  sendPlacementAssignedEmail(
    {
      email: student.email,
      firstname: student.firstname,
      applicationId: student.applicationId,
    },
    internship
  ).catch((err) => console.error('Placement assigned email failed:', err));
  return { ok: true };
}

/** Applicant list for “assign from internships index” (exclude only those already on target placement). */
function buildPickStudentsQuery(targetInternshipId, opts) {
  const pickQ = (opts.pickQ || '').trim();
  const pickPool = opts.pickPool === 'unplaced' ? 'unplaced' : 'all';
  const pickStatus =
    opts.pickStatus && APPLICATION_STATUSES.includes(String(opts.pickStatus).trim())
      ? String(opts.pickStatus).trim()
      : '';
  const targetOid = new mongoose.Types.ObjectId(targetInternshipId);
  const clauses = [];
  if (pickPool === 'unplaced') {
    clauses.push({ internship: null });
  } else {
    clauses.push({ internship: { $ne: targetOid } });
  }
  if (pickStatus) {
    clauses.push({ status: pickStatus });
  }
  if (pickQ) {
    const escaped = String(pickQ).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'i');
    clauses.push({
      $or: [
        { firstname: { $regex: re } },
        { lastname: { $regex: re } },
        { email: { $regex: re } },
        { applicationId: { $regex: re } },
        { university: { $regex: re } },
        { department: { $regex: re } },
      ],
    });
  }
  return clauses.length === 1 ? clauses[0] : { $and: clauses };
}

async function getUploadedImageUrl(file) {
  if (!file) return null;
  if (process.env.BLOB_READ_WRITE_TOKEN && file.buffer) {
    const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/gif' ? 'gif' : 'jpg';
    const pathname = `blog/blog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const blob = await putBlob(pathname, file.buffer, { access: 'public', contentType: file.mimetype, addRandomSuffix: true });
    return blob.url;
  }
  return '/uploads/blog/' + file.filename;
}

async function getPartnerLogoUrl(file) {
  if (!file) return null;
  if (process.env.BLOB_READ_WRITE_TOKEN && file.buffer) {
    const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/gif' ? 'gif' : 'jpg';
    const pathname = `partners/partner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const blob = await putBlob(pathname, file.buffer, { access: 'public', contentType: file.mimetype, addRandomSuffix: true });
    return blob.url;
  }
  return '/uploads/partners/' + file.filename;
}

async function getHeroImageUrl(file) {
  if (!file) return null;
  if (process.env.BLOB_READ_WRITE_TOKEN && file.buffer) {
    const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/gif' ? 'gif' : 'jpg';
    const pathname = `hero/hero-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const blob = await putBlob(pathname, file.buffer, { access: 'public', contentType: file.mimetype, addRandomSuffix: true });
    return blob.url;
  }
  return '/uploads/hero/' + file.filename;
}

router.get('/', async (req, res) => {
  try {
    const [
      postCount,
      applicationCount,
      testimonialCount,
      partnerCount,
      internshipCount,
      studentsInInternshipsCount,
      unplacedApplicantsCount,
    ] = await Promise.all([
      BlogPost.countDocuments(),
      StudentApplication.countDocuments(),
      Testimonial.countDocuments(),
      Partner.countDocuments(),
      Internship.countDocuments(),
      StudentApplication.countDocuments({ internship: { $ne: null } }),
      StudentApplication.countDocuments({ internship: null }),
    ]);
    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      layout: 'layout-admin',
      adminPage: 'dashboard',
      postCount,
      applicationCount,
      testimonialCount,
      partnerCount,
      internshipCount,
      studentsInInternshipsCount,
      unplacedApplicantsCount,
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

router.get('/blog', async (req, res) => {
  try {
    const posts = await BlogPost.find().sort({ createdAt: -1 }).lean();
    res.render('admin/blog-list', {
      title: 'Blog Posts',
      layout: 'layout-admin',
      adminPage: 'blog',
      posts,
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

function slugifyTitle(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-|-$/g, '') || 'post';
}

router.get('/blog/new', (req, res) => {
  const error = req.query.error;
  res.render('admin/blog-edit', {
    title: 'New Post',
    layout: 'layout-admin',
    adminPage: 'blog',
    useQuill: true,
    post: null,
    error: error === 'missing' ? 'Title and content are required.' : error === '1' ? 'Could not create post. Please try again.' : null,
  });
});

router.post('/blog', upload.single('image'), async (req, res) => {
  try {
    const { title, content, excerpt, published } = req.body || {};
    const titleTrim = (title || '').trim();
    const contentTrim = (content || '').trim();
    if (!titleTrim || !contentTrim) return res.redirect('/admin/blog/new?error=missing');
    const image = await getUploadedImageUrl(req.file);
    const excerptTrim = (excerpt || '').trim().slice(0, 300);
    let slug = slugifyTitle(titleTrim) + '-' + Date.now().toString(36);
    let exists = await BlogPost.findOne({ slug });
    while (exists) {
      slug = slugifyTitle(titleTrim) + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
      exists = await BlogPost.findOne({ slug });
    }
    const excerptFromContent = stripHtml(contentTrim).slice(0, 300);
    await BlogPost.create({
      title: titleTrim,
      slug,
      content: contentTrim,
      excerpt: excerptTrim || excerptFromContent,
      image: image || null,
      published: published === 'on' || published === '1',
    });
    res.redirect('/admin/blog');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/blog/new?error=1');
  }
});

router.get('/blog/:id/edit', async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id).lean();
    if (!post) return res.redirect('/admin/blog');
    res.render('admin/blog-edit', { title: 'Edit Post', layout: 'layout-admin', adminPage: 'blog', useQuill: true, post });
  } catch (err) {
    res.redirect('/admin/blog');
  }
});

router.post('/blog/:id', upload.single('image'), async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.redirect('/admin/blog');
    const { title, content, excerpt, published } = req.body || {};
    if (title) post.title = title;
    if (content !== undefined) post.content = content;
    if (excerpt !== undefined) post.excerpt = excerpt;
    post.published = published === 'on' || published === '1';
    if (req.file) post.image = await getUploadedImageUrl(req.file);
    await post.save();
    res.redirect('/admin/blog');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/blog');
  }
});

router.post('/blog/:id/delete', (req, res) => {
  BlogPost.findByIdAndDelete(req.params.id).then(() => {}).catch(() => {});
  res.redirect('/admin/blog');
});

router.get('/applications', async (req, res) => {
  try {
    const statusFilter = req.query.status;
    const q = (req.query.q || '').trim();
    const query = {};
    if (statusFilter && APPLICATION_STATUSES.includes(statusFilter)) {
      query.status = statusFilter;
    }
    if (q) {
      const escaped = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'i');
      query.$or = [
        { firstname: { $regex: re } },
        { lastname: { $regex: re } },
        { email: { $regex: re } },
        { applicationId: { $regex: re } },
        { university: { $regex: re } },
      ];
    }
    const applications = await StudentApplication.find(query)
      .sort({ submittedAt: -1 })
      .populate('internship', 'title active')
      .lean();
    const counts = await StudentApplication.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).then((arr) => Object.fromEntries(arr.map((x) => [x._id, x.count])));
    res.render('admin/applications', {
      title: 'Student Applications',
      layout: 'layout-admin',
      adminPage: 'applications',
      applications,
      statusFilter: statusFilter || '',
      searchQ: q,
      counts: counts || {},
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

router.get('/applications/:id', async (req, res) => {
  try {
    const application = await StudentApplication.findById(req.params.id)
      .populate({
        path: 'internship',
        select: 'title category',
        populate: { path: 'category', select: 'name' },
      })
      .lean();
    if (!application) return res.redirect('/admin/applications');
    const internships = await Internship.find()
      .sort({ sortOrder: 1, title: 1 })
      .populate('category', 'name')
      .lean();
    res.render('admin/application-detail', {
      title: 'Application ' + (application.applicationId || application._id),
      layout: 'layout-admin',
      adminPage: 'applications',
      application,
      internships: internships || [],
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/applications');
  }
});

router.post('/applications/:id/internship', async (req, res) => {
  const raw = req.body && req.body.internshipId != null ? String(req.body.internshipId).trim() : '';
  let internshipId = null;
  if (raw && mongoose.Types.ObjectId.isValid(raw)) {
    const exists = await Internship.findById(raw).select('_id').lean();
    if (exists) internshipId = exists._id;
  }
  try {
    const prev = await StudentApplication.findById(req.params.id)
      .select('internship email firstname applicationId')
      .lean();
    await StudentApplication.findByIdAndUpdate(req.params.id, { internship: internshipId });
    if (internshipId && prev) {
      const nextStr = String(internshipId);
      const prevStr = prev.internship ? String(prev.internship) : '';
      if (nextStr !== prevStr) {
        const placement = await Internship.findById(internshipId)
          .select('title')
          .populate('category', 'name')
          .lean();
        if (placement) {
          sendPlacementAssignedEmail(
            {
              email: prev.email,
              firstname: prev.firstname,
              applicationId: prev.applicationId,
            },
            placement
          ).catch((err) => console.error('Placement assigned email failed:', err));
        }
      }
    }
  } catch (err) {
    console.error(err);
  }
  res.redirect(303, '/admin/applications/' + req.params.id);
});

router.post('/applications/:id/status', async (req, res) => {
  const { status, redirect } = req.body || {};
  const allowed = APPLICATION_STATUSES;
  if (allowed.includes(status)) {
    const application = await StudentApplication.findById(req.params.id)
      .select('email firstname applicationId status')
      .lean();
    const previousStatus = application?.status;
    await StudentApplication.findByIdAndUpdate(req.params.id, { status }).catch(() => {});
    if (application && previousStatus !== status) {
      sendApplicationStatusEmail(
        { email: application.email, firstname: application.firstname, applicationId: application.applicationId },
        status
      ).catch((err) => console.error('Status email failed:', err));
    }
  }
  const goTo = redirect && String(redirect).startsWith('/admin/applications/') ? redirect : '/admin/applications';
  res.redirect(303, goTo);
});

router.post('/applications/:id/notes', async (req, res) => {
  const notes = (req.body && req.body.adminNotes != null) ? String(req.body.adminNotes) : undefined;
  try {
    await StudentApplication.findByIdAndUpdate(req.params.id, { adminNotes: notes || '' });
  } catch (err) {
    console.error(err);
  }
  res.redirect(303, '/admin/applications/' + req.params.id);
});

router.post('/applications/:id/delete', async (req, res) => {
  try {
    await StudentApplication.findByIdAndDelete(req.params.id);
  } catch (err) {
    console.error(err);
  }
  res.redirect(303, '/admin/applications');
});

router.get('/testimonials', async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 }).lean();
    res.render('admin/testimonial-list', {
      title: 'Testimonials',
      layout: 'layout-admin',
      adminPage: 'testimonials',
      testimonials,
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

router.get('/testimonials/new', (req, res) => {
  res.render('admin/testimonial-edit', {
    title: 'New Testimonial',
    layout: 'layout-admin',
    adminPage: 'testimonials',
    testimonial: null,
  });
});

router.post('/testimonials', async (req, res) => {
  try {
    const { name, role, location, quote, featured } = req.body || {};
    if (!name || !quote) return res.redirect('/admin/testimonials/new?error=missing');
    await Testimonial.create({
      name,
      role: role || '',
      location: location || '',
      quote,
      featured: featured === 'on' || featured === '1',
    });
    res.redirect('/admin/testimonials');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/testimonials/new?error=1');
  }
});

router.get('/testimonials/:id/edit', async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id).lean();
    if (!testimonial) return res.redirect('/admin/testimonials');
    res.render('admin/testimonial-edit', {
      title: 'Edit Testimonial',
      layout: 'layout-admin',
      adminPage: 'testimonials',
      testimonial,
    });
  } catch (err) {
    res.redirect('/admin/testimonials');
  }
});

router.post('/testimonials/:id', async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) return res.redirect('/admin/testimonials');
    const { name, role, location, quote, featured } = req.body || {};
    testimonial.name = name || testimonial.name;
    testimonial.role = role || '';
    testimonial.location = location || '';
    testimonial.quote = quote || testimonial.quote;
    testimonial.featured = featured === 'on' || featured === '1';
    await testimonial.save();
    res.redirect('/admin/testimonials');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/testimonials');
  }
});

router.post('/testimonials/:id/delete', (req, res) => {
  Testimonial.findByIdAndDelete(req.params.id).then(() => {}).catch(() => {});
  res.redirect('/admin/testimonials');
});

// ——— Partners (home page carousel) ———
router.get('/partners', async (req, res) => {
  try {
    const partners = await Partner.find().sort({ order: 1, createdAt: 1 }).lean();
    res.render('admin/partner-list', {
      title: 'Partners',
      layout: 'layout-admin',
      adminPage: 'partners',
      partners,
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

router.get('/partners/new', (req, res) => {
  res.render('admin/partner-edit', {
    title: 'New Partner',
    layout: 'layout-admin',
    adminPage: 'partners',
    partner: null,
  });
});

router.post('/partners', uploadPartner.single('logo'), async (req, res) => {
  try {
    const { name, link, order, active } = req.body || {};
    if (!name) return res.redirect('/admin/partners/new?error=missing');
    const logo = await getPartnerLogoUrl(req.file);
    if (!logo) return res.redirect('/admin/partners/new?error=logo');
    await Partner.create({
      name: name.trim(),
      logo,
      link: (link || '').trim(),
      order: parseInt(order, 10) || 0,
      active: active === 'on' || active === '1',
    });
    res.redirect('/admin/partners');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/partners/new?error=1');
  }
});

router.get('/partners/:id/edit', async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id).lean();
    if (!partner) return res.redirect('/admin/partners');
    res.render('admin/partner-edit', {
      title: 'Edit Partner',
      layout: 'layout-admin',
      adminPage: 'partners',
      partner,
    });
  } catch (err) {
    res.redirect('/admin/partners');
  }
});

router.post('/partners/:id', uploadPartner.single('logo'), async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.redirect('/admin/partners');
    const { name, link, order, active } = req.body || {};
    if (name) partner.name = name.trim();
    if (link !== undefined) partner.link = (link || '').trim();
    partner.order = parseInt(order, 10) || 0;
    partner.active = active === 'on' || active === '1';
    if (req.file) partner.logo = await getPartnerLogoUrl(req.file);
    await partner.save();
    res.redirect('/admin/partners');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/partners');
  }
});

router.post('/partners/:id/delete', (req, res) => {
  Partner.findByIdAndDelete(req.params.id).then(() => {}).catch(() => {});
  res.redirect('/admin/partners');
});

// ——— Home Hero (hero section content) ———
router.get('/hero', async (req, res) => {
  try {
    let hero = await HomeHero.findOne().lean();
    if (!hero) {
      await HomeHero.create({});
      hero = await HomeHero.findOne().lean();
    }
    res.render('admin/hero-edit', {
      title: 'Home Hero',
      layout: 'layout-admin',
      adminPage: 'hero',
      hero: hero || {},
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

router.post('/hero', uploadHero.single('bgImageFile'), async (req, res) => {
  try {
    const { badgeText, title, titleHighlight, description, ctaText, ctaUrl, bgImage } = req.body || {};
    let hero = await HomeHero.findOne();
    if (!hero) hero = await HomeHero.create({});
    if (badgeText !== undefined) hero.badgeText = (badgeText || '').trim();
    if (title !== undefined) hero.title = (title || '').trim();
    if (titleHighlight !== undefined) hero.titleHighlight = (titleHighlight || '').trim();
    if (description !== undefined) hero.description = (description || '').trim();
    if (ctaText !== undefined) hero.ctaText = (ctaText || '').trim();
    if (ctaUrl !== undefined) hero.ctaUrl = (ctaUrl || '').trim();
    // New upload takes precedence; else keep text field value; else keep existing
    if (req.file) {
      hero.bgImage = await getHeroImageUrl(req.file);
    } else if (bgImage !== undefined && (bgImage || '').trim() !== '') {
      hero.bgImage = (bgImage || '').trim();
    }
    hero.updatedAt = new Date();
    await hero.save();
    res.redirect('/admin/hero');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/hero');
  }
});

// ——— Internship categories ———
router.get('/internship-categories', async (req, res) => {
  try {
    const categories = await InternshipCategory.find().sort({ sortOrder: 1, name: 1 }).lean();
    const internshipCounts = await Internship.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const countByCategory = Object.fromEntries(
      internshipCounts.map((x) => [String(x._id), x.count])
    );
    res.render('admin/internship-category-list', {
      title: 'Internship categories',
      layout: 'layout-admin',
      adminPage: 'internship_categories',
      categories,
      countByCategory,
      listError: req.query.error === 'in_use' ? 'Cannot delete a category that still has internships. Reassign or delete those internships first.' : null,
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

router.get('/internship-categories/new', (req, res) => {
  res.render('admin/internship-category-edit', {
    title: 'New internship category',
    layout: 'layout-admin',
    adminPage: 'internship_categories',
    category: null,
    error: null,
  });
});

router.post('/internship-categories', async (req, res) => {
  try {
    const { name, description, sortOrder, active } = req.body || {};
    const nameTrim = (name || '').trim();
    if (!nameTrim) {
      return res.render('admin/internship-category-edit', {
        title: 'New internship category',
        layout: 'layout-admin',
        adminPage: 'internship_categories',
        category: null,
        error: 'Name is required.',
      });
    }
    await InternshipCategory.create({
      name: nameTrim,
      description: (description || '').trim(),
      sortOrder: parseInt(sortOrder, 10) || 0,
      active: active === 'on' || active === '1',
    });
    res.redirect('/admin/internship-categories');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/internship-categories/new');
  }
});

router.get('/internship-categories/:id/edit', async (req, res) => {
  try {
    const category = await InternshipCategory.findById(req.params.id).lean();
    if (!category) return res.redirect('/admin/internship-categories');
    res.render('admin/internship-category-edit', {
      title: 'Edit category',
      layout: 'layout-admin',
      adminPage: 'internship_categories',
      category,
      error: null,
    });
  } catch (err) {
    res.redirect('/admin/internship-categories');
  }
});

router.post('/internship-categories/:id', async (req, res) => {
  try {
    const category = await InternshipCategory.findById(req.params.id);
    if (!category) return res.redirect('/admin/internship-categories');
    const { name, description, sortOrder, active } = req.body || {};
    const nameTrim = (name || '').trim();
    if (!nameTrim) {
      const catLean = category.toObject();
      return res.render('admin/internship-category-edit', {
        title: 'Edit category',
        layout: 'layout-admin',
        adminPage: 'internship_categories',
        category: catLean,
        error: 'Name is required.',
      });
    }
    category.name = nameTrim;
    category.description = (description || '').trim();
    category.sortOrder = parseInt(sortOrder, 10) || 0;
    category.active = active === 'on' || active === '1';
    await category.save();
    res.redirect('/admin/internship-categories');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/internship-categories');
  }
});

router.post('/internship-categories/:id/delete', async (req, res) => {
  try {
    const n = await Internship.countDocuments({ category: req.params.id });
    if (n > 0) {
      return res.redirect(303, '/admin/internship-categories?error=in_use');
    }
    await InternshipCategory.findByIdAndDelete(req.params.id);
  } catch (err) {
    console.error(err);
  }
  res.redirect(303, '/admin/internship-categories');
});

// ——— Internships ———
router.get('/internships', async (req, res) => {
  try {
    const categoryFilter = (req.query.category || '').trim();
    const query = {};
    if (categoryFilter && mongoose.Types.ObjectId.isValid(categoryFilter)) {
      query.category = categoryFilter;
    }
    const [internships, studentAgg, categories, unplacedApplicantsCount] = await Promise.all([
      Internship.find(query).sort({ sortOrder: 1, title: 1 }).populate('category', 'name').lean(),
      StudentApplication.aggregate([
        { $match: { internship: { $ne: null } } },
        { $group: { _id: '$internship', count: { $sum: 1 } } },
      ]),
      InternshipCategory.find().sort({ sortOrder: 1, name: 1 }).lean(),
      StudentApplication.countDocuments({ internship: null }),
    ]);
    const studentCountByInternship = Object.fromEntries(
      studentAgg.map((x) => [String(x._id), x.count])
    );

    const pickI = (req.query.pick_i || '').trim();
    const pickQ = (req.query.pick_q || '').trim();
    const pickPool = (req.query.pick_pool || 'all').trim() === 'unplaced' ? 'unplaced' : 'all';
    const pickStatus =
      req.query.pick_status && APPLICATION_STATUSES.includes(String(req.query.pick_status).trim())
        ? String(req.query.pick_status).trim()
        : '';
    const pickPage = Math.max(1, parseInt(req.query.pick_page, 10) || 1);
    const pickLimit = Math.min(100, Math.max(10, parseInt(req.query.pick_limit, 10) || 25));

    let pickTarget = null;
    let pickCandidates = [];
    let pickMeta = {
      q: pickQ,
      pool: pickPool,
      status: pickStatus,
      page: pickPage,
      limit: pickLimit,
      total: 0,
      totalPages: 1,
    };

    if (pickI && mongoose.Types.ObjectId.isValid(pickI)) {
      pickTarget = await Internship.findById(pickI).populate('category', 'name').lean();
      if (pickTarget) {
        const pickQuery = buildPickStudentsQuery(pickI, {
          pickQ,
          pickPool,
          pickStatus,
        });
        const [total, rows] = await Promise.all([
          StudentApplication.countDocuments(pickQuery),
          StudentApplication.find(pickQuery)
            .sort({ submittedAt: -1 })
            .skip((pickPage - 1) * pickLimit)
            .limit(pickLimit)
            .select('firstname lastname email applicationId status university level internship')
            .populate('internship', 'title')
            .lean(),
        ]);
        pickCandidates = rows;
        pickMeta.total = total;
        pickMeta.totalPages = Math.max(1, Math.ceil(total / pickLimit));
      }
    }

    const assignNotice = (req.query.assignNotice || '').trim();
    const assignListErr = (req.query.assignErr || '').trim();
    const assignBulk = parseInt(req.query.bulk, 10);
    const assignSkipped = parseInt(req.query.skipped, 10);

    res.render('admin/internship-list', {
      title: 'Internships',
      layout: 'layout-admin',
      adminPage: 'internships',
      internships,
      studentCountByInternship,
      categories,
      categoryFilter,
      applicationStatuses: APPLICATION_STATUSES,
      pickI: pickTarget ? pickI : '',
      pickTarget,
      pickCandidates,
      pickMeta,
      assignNotice,
      assignListErr,
      assignBulk: Number.isFinite(assignBulk) ? assignBulk : null,
      assignSkipped: Number.isFinite(assignSkipped) ? assignSkipped : null,
      unplacedApplicantsCount,
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

router.get('/internships/new', async (req, res) => {
  try {
    const categories = await InternshipCategory.find().sort({ sortOrder: 1, name: 1 }).lean();
    res.render('admin/internship-edit', {
      title: 'New internship',
      layout: 'layout-admin',
      adminPage: 'internships',
      internship: null,
      categories,
      error: req.query.error === 'nocat' ? 'Create at least one active category before adding an internship.' : null,
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/internships');
  }
});

router.post('/internships', async (req, res) => {
  try {
    const { title, description, category, sortOrder, active } = req.body || {};
    const titleTrim = (title || '').trim();
    const catId = (category || '').trim();
    if (!titleTrim || !catId || !mongoose.Types.ObjectId.isValid(catId)) {
      return res.redirect('/admin/internships/new');
    }
    const cat = await InternshipCategory.findById(catId).select('_id active').lean();
    if (!cat || cat.active === false) {
      return res.redirect('/admin/internships/new?error=nocat');
    }
    await Internship.create({
      title: titleTrim,
      description: (description || '').trim(),
      category: catId,
      sortOrder: parseInt(sortOrder, 10) || 0,
      active: active === 'on' || active === '1',
    });
    res.redirect('/admin/internships');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/internships/new');
  }
});

router.post('/internships/batch-assign-students', async (req, res) => {
  const b = req.body || {};
  const internshipId = String(b.internshipId || '').trim();
  const returnCategory = String(b.returnCategory || '').trim();
  const ids = parseBodyStudentIds(b).slice(0, 100);

  const listQs = new URLSearchParams();
  if (returnCategory && mongoose.Types.ObjectId.isValid(returnCategory)) {
    listQs.set('category', returnCategory);
  }
  if (internshipId && mongoose.Types.ObjectId.isValid(internshipId)) {
    listQs.set('pick_i', internshipId);
  }
  const pq = String(b.pick_q || '').trim();
  const pp = String(b.pick_pool || '').trim();
  const ps = String(b.pick_status || '').trim();
  const ppage = String(b.pick_page || '').trim();
  if (pq) listQs.set('pick_q', pq);
  if (pp === 'unplaced') listQs.set('pick_pool', 'unplaced');
  if (ps && APPLICATION_STATUSES.includes(ps)) listQs.set('pick_status', ps);
  if (ppage && parseInt(ppage, 10) > 1) listQs.set('pick_page', ppage);

  const baseList = '/admin/internships' + (listQs.toString() ? `?${listQs.toString()}` : '');
  const join = listQs.toString() ? '&' : '?';

  if (!mongoose.Types.ObjectId.isValid(internshipId) || !ids.length) {
    return res.redirect(
      303,
      baseList + join + 'assignErr=' + encodeURIComponent(!ids.length ? 'noselection' : 'invalid')
    );
  }

  let ok = 0;
  let skipped = 0;
  try {
    for (const studentId of ids) {
      const result = await assignStudentToInternship(internshipId, studentId);
      if (result.ok) ok += 1;
      else skipped += 1;
    }
  } catch (err) {
    console.error(err);
    return res.redirect(303, baseList + join + 'assignErr=server');
  }

  res.redirect(303, baseList + join + `assignNotice=bulk&bulk=${ok}&skipped=${skipped}`);
});

router.get('/internships/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.redirect('/admin/internships');
    const internship = await Internship.findById(req.params.id).populate('category', 'name').lean();
    if (!internship) return res.redirect('/admin/internships');

    const q = (req.query.q || '').trim();
    const pool = (req.query.pool || 'all').trim() === 'unplaced' ? 'unplaced' : 'all';
    const statusFilter =
      req.query.status && APPLICATION_STATUSES.includes(String(req.query.status).trim())
        ? String(req.query.status).trim()
        : '';
    const assignedStatus =
      req.query.assignedStatus && APPLICATION_STATUSES.includes(String(req.query.assignedStatus).trim())
        ? String(req.query.assignedStatus).trim()
        : '';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit, 10) || 25));

    const assignedQuery = { internship: internship._id };
    if (assignedStatus) assignedQuery.status = assignedStatus;
    const assigned = await StudentApplication.find(assignedQuery)
      .sort({ lastname: 1, firstname: 1 })
      .select('firstname lastname email applicationId status university department level')
      .lean();
    const assignedObjectIds = assigned.map((a) => a._id);

    const clauses = [];
    if (assignedObjectIds.length) {
      clauses.push({ _id: { $nin: assignedObjectIds } });
    }
    if (pool === 'unplaced') {
      clauses.push({ internship: null });
    }
    if (statusFilter) {
      clauses.push({ status: statusFilter });
    }
    if (q) {
      const escaped = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'i');
      clauses.push({
        $or: [
          { firstname: { $regex: re } },
          { lastname: { $regex: re } },
          { email: { $regex: re } },
          { applicationId: { $regex: re } },
          { university: { $regex: re } },
          { department: { $regex: re } },
        ],
      });
    }
    const addQuery = clauses.length === 0 ? {} : clauses.length === 1 ? clauses[0] : { $and: clauses };

    const [totalCandidates, candidates] = await Promise.all([
      StudentApplication.countDocuments(addQuery),
      StudentApplication.find(addQuery)
        .sort({ submittedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('firstname lastname email applicationId status university department level internship')
        .populate('internship', 'title')
        .lean(),
    ]);

    const studentCount = await StudentApplication.countDocuments({ internship: internship._id });
    const rosterMeta = {
      q,
      pool,
      status: statusFilter,
      assignedStatus,
      page,
      limit,
      totalCandidates,
      totalPages: Math.max(1, Math.ceil(totalCandidates / limit)),
    };

    const notice = (req.query.notice || '').trim();
    const assignErr = (req.query.assignErr || '').trim();
    const bulkCount = parseInt(req.query.bulk, 10);
    const bulkSkipped = parseInt(req.query.skipped, 10);

    res.render('admin/internship-detail', {
      title: internship.title,
      layout: 'layout-admin',
      adminPage: 'internships',
      internship,
      assigned,
      candidates,
      rosterMeta,
      applicationStatuses: APPLICATION_STATUSES,
      studentCount,
      notice,
      assignErr,
      bulkCount: Number.isFinite(bulkCount) ? bulkCount : null,
      bulkSkipped: Number.isFinite(bulkSkipped) ? bulkSkipped : null,
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/internships');
  }
});

router.post('/internships/:id/assign', async (req, res) => {
  const internshipId = req.params.id;
  const studentId = req.body && req.body.studentId ? String(req.body.studentId).trim() : '';
  const suffix = internshipRosterQuerySuffix(req.body || {});
  const base = '/admin/internships/' + internshipId + suffix;
  if (!mongoose.Types.ObjectId.isValid(internshipId) || !mongoose.Types.ObjectId.isValid(studentId)) {
    return res.redirect(303, base + (suffix.includes('?') ? '&' : '?') + 'assignErr=invalid');
  }
  try {
    const result = await assignStudentToInternship(internshipId, studentId);
    if (!result.ok) {
      const errQ = suffix.includes('?') ? '&' : '?';
      return res.redirect(303, base + errQ + 'assignErr=' + encodeURIComponent(result.code));
    }
  } catch (err) {
    console.error(err);
    const errQ = suffix.includes('?') ? '&' : '?';
    return res.redirect(303, base + errQ + 'assignErr=server');
  }
  const okQ = suffix.includes('?') ? '&' : '?';
  res.redirect(303, base + okQ + 'notice=assigned');
});

router.post('/internships/:id/assign-bulk', async (req, res) => {
  const internshipId = req.params.id;
  const suffix = internshipRosterQuerySuffix(req.body || {});
  const base = '/admin/internships/' + internshipId + suffix;
  if (!mongoose.Types.ObjectId.isValid(internshipId)) {
    return res.redirect(303, '/admin/internships');
  }
  const ids = parseBodyStudentIds(req.body).slice(0, 100);
  if (!ids.length) {
    const errQ = suffix.includes('?') ? '&' : '?';
    return res.redirect(303, base + errQ + 'assignErr=noselection');
  }
  let ok = 0;
  let skipped = 0;
  try {
    for (const studentId of ids) {
      const result = await assignStudentToInternship(internshipId, studentId);
      if (result.ok) ok += 1;
      else skipped += 1;
    }
  } catch (err) {
    console.error(err);
    const errQ = suffix.includes('?') ? '&' : '?';
    return res.redirect(303, base + errQ + 'assignErr=server');
  }
  const qJoin = suffix.includes('?') ? '&' : '?';
  res.redirect(303, base + qJoin + 'notice=bulk&bulk=' + ok + '&skipped=' + skipped);
});

router.post('/internships/:id/unassign', async (req, res) => {
  const internshipId = req.params.id;
  const studentId = req.body && req.body.studentId ? String(req.body.studentId).trim() : '';
  const suffix = internshipRosterQuerySuffix(req.body || {});
  const base = '/admin/internships/' + internshipId + suffix;
  if (!mongoose.Types.ObjectId.isValid(internshipId) || !mongoose.Types.ObjectId.isValid(studentId)) {
    return res.redirect(303, '/admin/internships');
  }
  try {
    const updated = await StudentApplication.findOneAndUpdate(
      { _id: studentId, internship: internshipId },
      { $set: { internship: null } },
      { new: false }
    );
    if (!updated) {
      const errQ = suffix.includes('?') ? '&' : '?';
      return res.redirect(303, base + errQ + 'assignErr=unassign_mismatch');
    }
  } catch (err) {
    console.error(err);
    const errQ = suffix.includes('?') ? '&' : '?';
    return res.redirect(303, base + errQ + 'assignErr=server');
  }
  const okQ = suffix.includes('?') ? '&' : '?';
  res.redirect(303, base + okQ + 'notice=unassigned');
});

router.get('/internships/:id/edit', async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id).lean();
    if (!internship) return res.redirect('/admin/internships');
    const categories = await InternshipCategory.find().sort({ sortOrder: 1, name: 1 }).lean();
    res.render('admin/internship-edit', {
      title: 'Edit internship',
      layout: 'layout-admin',
      adminPage: 'internships',
      internship,
      categories,
      error: null,
    });
  } catch (err) {
    res.redirect('/admin/internships');
  }
});

router.post('/internships/:id', async (req, res) => {
  try {
    const doc = await Internship.findById(req.params.id);
    if (!doc) return res.redirect('/admin/internships');
    const { title, description, category, sortOrder, active } = req.body || {};
    const titleTrim = (title || '').trim();
    const catId = (category || '').trim();
    if (!titleTrim || !catId || !mongoose.Types.ObjectId.isValid(catId)) {
      return res.redirect('/admin/internships/' + req.params.id + '/edit');
    }
    const cat = await InternshipCategory.findById(catId).select('_id').lean();
    if (!cat) {
      return res.redirect('/admin/internships/' + req.params.id + '/edit');
    }
    doc.title = titleTrim;
    doc.description = (description || '').trim();
    doc.category = catId;
    doc.sortOrder = parseInt(sortOrder, 10) || 0;
    doc.active = active === 'on' || active === '1';
    await doc.save();
    res.redirect('/admin/internships');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/internships');
  }
});

router.post('/internships/:id/delete', async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.redirect('/admin/internships');
    await StudentApplication.updateMany({ internship: id }, { $set: { internship: null } });
    await Internship.findByIdAndDelete(id);
  } catch (err) {
    console.error(err);
  }
  res.redirect(303, '/admin/internships');
});

module.exports = router;
