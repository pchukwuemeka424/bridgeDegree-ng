'use strict';

const express = require('express');
const { put: putBlob } = require('@vercel/blob');
const BlogPost = require('../models/BlogPost');
const StudentApplication = require('../models/StudentApplication');
const Testimonial = require('../models/Testimonial');
const Partner = require('../models/Partner');
const HomeHero = require('../models/HomeHero');
const upload = require('../middleware/upload');
const { uploadPartner, uploadHero } = require('../middleware/upload');
const { sendApplicationStatusEmail } = require('../services/email');
const { stripHtml } = require('../utils/html');

const router = express.Router();

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
    const [postCount, applicationCount, testimonialCount, partnerCount] = await Promise.all([
      BlogPost.countDocuments(),
      StudentApplication.countDocuments(),
      Testimonial.countDocuments(),
      Partner.countDocuments(),
    ]);
    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      layout: 'layout-admin',
      adminPage: 'dashboard',
      postCount,
      applicationCount,
      testimonialCount,
      partnerCount,
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

const APPLICATION_STATUSES = ['submitted', 'under_review', 'shortlisted', 'accepted', 'rejected'];

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
    const applications = await StudentApplication.find(query).sort({ submittedAt: -1 }).lean();
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
    const application = await StudentApplication.findById(req.params.id).lean();
    if (!application) return res.redirect('/admin/applications');
    res.render('admin/application-detail', {
      title: 'Application ' + (application.applicationId || application._id),
      layout: 'layout-admin',
      adminPage: 'applications',
      application,
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/applications');
  }
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

module.exports = router;
