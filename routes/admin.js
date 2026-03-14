const express = require('express');
const path = require('path');
const router = express.Router();
const Admin = require('../models/Admin');
const BlogPost = require('../models/BlogPost');
const StudentApplication = require('../models/StudentApplication');
const Testimonial = require('../models/Testimonial');
const { requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/login', (req, res) => {
  if (req.session && req.session.adminId) {
    return res.redirect('/admin');
  }
  res.render('admin/login', {
    title: 'Admin Login',
    layout: 'layout-admin',
    error: req.query.error ? 'Invalid email or password.' : null,
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.redirect('/admin/login?error=1');
  }
  try {
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin || !(await admin.comparePassword(password))) {
      return res.redirect('/admin/login?error=1');
    }
    req.session.adminId = admin._id.toString();
    req.session.adminEmail = admin.email;
    return res.redirect('/admin');
  } catch (err) {
    console.error(err);
    return res.redirect('/admin/login?error=1');
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

router.use(requireAdmin);

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
    post: null,
  });
});

router.post('/blog', upload.single('image'), async (req, res) => {
  try {
    const { title, content, excerpt, published } = req.body || {};
    if (!title || !content) {
      return res.redirect('/admin/blog/new?error=missing');
    }
    const image = req.file ? '/uploads/blog/' + req.file.filename : null;
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
    res.render('admin/blog-edit', {
      title: 'Edit Post',
      layout: 'layout-admin',
      post,
    });
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
    if (req.file) {
      post.image = '/uploads/blog/' + req.file.filename;
    }
    await post.save();
    res.redirect('/admin/blog');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/blog');
  }
});

router.post('/blog/:id/delete', async (req, res) => {
  try {
    await BlogPost.findByIdAndDelete(req.params.id);
  } catch (err) {}
  res.redirect('/admin/blog');
});

router.get('/applications', async (req, res) => {
  try {
    const applications = await StudentApplication.find().sort({ submittedAt: -1 }).lean();
    res.render('admin/applications', {
      title: 'Student Applications',
      layout: 'layout-admin',
      applications,
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

router.post('/applications/:id/status', async (req, res) => {
  const { status } = req.body || {};
  const allowed = ['submitted', 'under_review', 'shortlisted', 'accepted', 'rejected'];
  if (allowed.includes(status)) {
    await StudentApplication.findByIdAndUpdate(req.params.id, { status });
  }
  res.redirect('/admin/applications');
});

// Testimonials
router.get('/testimonials', async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 }).lean();
    res.render('admin/testimonial-list', {
      title: 'Testimonials',
      layout: 'layout-admin',
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

router.post('/testimonials/:id/delete', async (req, res) => {
  try {
    await Testimonial.findByIdAndDelete(req.params.id);
  } catch (err) {}
  res.redirect('/admin/testimonials');
});

module.exports = router;
