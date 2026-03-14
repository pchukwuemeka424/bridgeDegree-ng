'use strict';

const express = require('express');
const { put: putBlob } = require('@vercel/blob');
const BlogPost = require('../models/BlogPost');
const StudentApplication = require('../models/StudentApplication');
const Testimonial = require('../models/Testimonial');
const upload = require('../middleware/upload');

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

router.get('/', async (req, res) => {
  try {
    const [postCount, applicationCount, testimonialCount] = await Promise.all([
      BlogPost.countDocuments(),
      StudentApplication.countDocuments(),
      Testimonial.countDocuments(),
    ]);
    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      layout: 'layout-admin',
      adminPage: 'dashboard',
      postCount,
      applicationCount,
      testimonialCount,
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

router.get('/blog/new', (req, res) => {
  res.render('admin/blog-edit', {
    title: 'New Post',
    layout: 'layout-admin',
    adminPage: 'blog',
    post: null,
  });
});

router.post('/blog', upload.single('image'), async (req, res) => {
  try {
    const { title, content, excerpt, published } = req.body || {};
    if (!title || !content) return res.redirect('/admin/blog/new?error=missing');
    const image = await getUploadedImageUrl(req.file);
    await BlogPost.create({
      title,
      content,
      excerpt: excerpt || content.slice(0, 300),
      image,
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
    res.render('admin/blog-edit', { title: 'Edit Post', layout: 'layout-admin', adminPage: 'blog', post });
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
    const applications = await StudentApplication.find().sort({ submittedAt: -1 }).lean();
    res.render('admin/applications', {
      title: 'Student Applications',
      layout: 'layout-admin',
      adminPage: 'applications',
      applications,
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

router.post('/applications/:id/status', (req, res) => {
  const { status } = req.body || {};
  const allowed = ['submitted', 'under_review', 'shortlisted', 'accepted', 'rejected'];
  if (allowed.includes(status)) {
    StudentApplication.findByIdAndUpdate(req.params.id, { status }).then(() => {}).catch(() => {});
  }
  res.redirect('/admin/applications');
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

module.exports = router;
