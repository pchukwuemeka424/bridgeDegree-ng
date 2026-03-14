require('dotenv').config();
const path = require('path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const { connectDB } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(session({
  secret: process.env.SESSION_SECRET || 'bridgedegree-admin-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, maxAge: 24 * 60 * 60 * 1000 },
}));

// Routes config for nav/footer (reusable across components)
const routes = {
  index: { path: '/', title: 'Home' },
  students: { path: '/students', title: 'Students' },
  students_apply: { path: '/students/apply', title: 'Apply' },
  partners: { path: '/partners', title: 'Partners' },
  how_it_works: { path: '/how-it-works', title: 'How It Works' },
  about: { path: '/about', title: 'About' },
  blog: { path: '/blog', title: 'Blog' },
  faq: { path: '/faq', title: 'FAQ' },
  contact: { path: '/contact', title: 'Contact' },
  career_passport: { path: '/career-passport', title: 'Career Passport' },
};

const quickLinks = [
  { path: '/faq', label: 'FAQ' },
  { path: '/policy', label: 'Policy' },
  { path: '/about', label: 'About' },
  { path: '/contact', label: 'Contact Us' },
  { path: '/how-it-works', label: 'How It Works' },
];

// SEO: recommended keywords & default meta (per-page metaDescription overrides in routes)
const seo = {
  siteName: 'BridgeDegree',
  tagline: "Nigeria's Career Infrastructure Platform",
  defaultDescription: 'Career infrastructure for Nigerian university students. Verified work experience, published research, and a Career Passport employers trust. Work Experience Engine, Publication Pipeline, Global Mobility.',
  baseUrl: process.env.BASE_URL || 'https://www.bridgdegree.com',
  keywords: [
    'Nigeria career platform',
    'African graduate employability',
    'work experience for students Nigeria',
    'study abroad Nigeria',
    'university career infrastructure Africa',
    'student job placement Nigeria',
    'academic publication support Nigeria',
    'global mobility students Africa',
    'internship placement Nigeria',
    'final year project publication',
    'scholarship pathway Nigeria',
    'LinkedIn optimization students',
    'SIWES alternative',
    'graduate employment Africa',
    'Nigerian university partnerships',
    'postgraduate application support',
    'how to get work experience as a Nigerian student',
    'publish final year project Nigeria',
    'study abroad after Nigerian university',
  ].join(', '),
};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');
app.use(expressLayouts);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/images', express.static(path.join(__dirname, 'static', 'images')));
app.use(express.urlencoded({ extended: true }));

// Inject shared data for all views (reusable components use this)
app.use((req, res, next) => {
  res.locals.routes = routes;
  res.locals.quickLinks = quickLinks;
  res.locals.currentRoute = null; // set per route
  res.locals.seo = seo;
  res.locals.canonicalUrl = seo.baseUrl + req.path;
  next();
});

app.get('/students', (req, res) => {
  res.locals.currentRoute = 'students';
  res.render('onboarding-students', {
    title: 'For Students',
    metaDescription: 'How to get work experience as a Nigerian student. Structured internships, final year project publication support, and a Career Passport. BridgeDegree runs alongside your degree.',
  });
});

const adminRoutes = require('./routes/admin');
const studentRoutes = require('./routes/student');
const StudentApplication = require('./models/StudentApplication');
const BlogPost = require('./models/BlogPost');
const Testimonial = require('./models/Testimonial');

let dbReadyPromise = null;
function ensureDb() {
  if (!dbReadyPromise) {
    dbReadyPromise = connectDB().catch((err) => {
      dbReadyPromise = null;
      throw err;
    });
  }
  return dbReadyPromise;
}

// Ensure DB connection for serverless/runtime environments
app.use((req, res, next) => {
  ensureDb().then(() => next()).catch((err) => {
    console.error('DB connection error:', err);
    next();
  });
});

app.get('/', async (req, res) => {
  res.locals.currentRoute = 'index';
  let homePosts = [];
  let testimonials = [];
  try {
    homePosts = await BlogPost.find({ published: true }).sort({ createdAt: -1 }).limit(2).lean();
    testimonials = await Testimonial.find({ featured: true }).sort({ createdAt: -1 }).limit(6).lean();
  } catch (err) {
    console.error(err);
  }
  res.render('index', {
    title: 'BridgeDegree',
    stylesheet: 'home',
    metaDescription: 'Nigeria\'s career infrastructure for university students. Get verified work experience, publish your research, and build a Career Passport employers trust. Work Experience Engine, Publication Pipeline, Global Mobility.',
    homePosts,
    testimonials,
  });
});

app.use('/admin', adminRoutes);
app.use('/student', studentRoutes);

app.get('/students/apply', (req, res) => {
  res.locals.currentRoute = 'students_apply';
  res.locals.breadcrumbDark = true;
  res.render('students-apply', {
    title: 'Apply',
    breadcrumb: [{ path: '/', label: 'Home' }, { path: '/students', label: 'Students' }, { label: 'Apply' }],
    metaDescription: 'Apply to BridgeDegree — Nigeria\'s career infrastructure for undergraduates. Student job placement, internship placement, and academic publication support.',
    error: !!req.query.error,
  });
});

app.post('/students/apply', async (req, res) => {
  const b = req.body || {};
  const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  try {
    const doc = await StudentApplication.create({
      firstname: b.firstname,
      lastname: b.lastname,
      email: (b.email || '').trim().toLowerCase(),
      university: b.university,
      level: b.level,
      department: b.department,
      career_goal: b.career_goal || '',
      hear_about: b.hear_about || '',
      career_fields: toArray(b.career_fields),
      work_experience_type: toArray(b.work_experience_type),
      work_experience: b.work_experience || '',
      skills: toArray(b.skills),
      skills_other: b.skills_other || '',
      long_term_goals: toArray(b.long_term_goals),
      publish_research: b.publish_research || '',
      final_year_project: b.final_year_project || '',
      consent: b.consent === 'on' || b.consent === true,
    });
    return res.redirect('/students/apply/success?applicationId=' + encodeURIComponent(doc.applicationId) + '&email=' + encodeURIComponent(doc.email));
  } catch (err) {
    console.error('Application submit error:', err);
    return res.redirect('/students/apply?error=1');
  }
});

app.get('/students/apply/success', (req, res) => {
  const applicationId = req.query.applicationId || '';
  res.locals.currentRoute = 'students_apply';
  res.locals.breadcrumbDark = true;
  res.render('students-apply-success', {
    title: 'Application received',
    breadcrumb: [{ path: '/', label: 'Home' }, { path: '/students', label: 'Students' }, { label: 'Apply' }, { label: 'Success' }],
    applicationId,
  });
});

app.get('/partners', (req, res) => {
  res.locals.currentRoute = 'partners';
  res.render('onboarding-partners', {
    title: 'For Partners',
    metaDescription: 'Partner with BridgeDegree. Get first access to pre-vetted Nigerian graduates with verified work experience and published research. Corporate and university partnerships.',
  });
});

app.get('/how-it-works', (req, res) => {
  res.locals.currentRoute = 'how_it_works';
  res.locals.breadcrumbDark = true;
  res.render('how-it-works', {
    title: 'How It Works',
    breadcrumb: [{ path: '/', label: 'Home' }, { label: 'How It Works' }],
    metaDescription: 'How BridgeDegree works: Work Experience Engine, Publication Pipeline, and Global Mobility Framework for Nigerian university students and graduate employability.',
  });
});

app.get('/faq', (req, res) => {
  res.locals.currentRoute = 'faq';
  res.render('faq', {
    title: 'FAQ',
    breadcrumb: [{ path: '/', label: 'Home' }, { label: 'FAQ' }],
    metaDescription: 'Frequently asked questions about BridgeDegree: work experience for students in Nigeria, publishing final year project, study abroad, SIWES alternative, Career Passport.',
  });
});

app.get('/blog', async (req, res) => {
  res.locals.currentRoute = 'blog';
  let posts = [];
  try {
    posts = await BlogPost.find({ published: true }).sort({ createdAt: -1 }).lean();
  } catch (err) {
    console.error(err);
  }
  res.render('blog', {
    title: 'Blog',
    breadcrumb: [{ path: '/', label: 'Home' }, { label: 'Blog' }],
    metaDescription: 'BridgeDegree blog: career tips for Nigerian students, graduate employment in Africa, internship placement, and study abroad after Nigerian university.',
    posts,
  });
});

app.get('/blog/:slug', async (req, res) => {
  try {
    const post = await BlogPost.findOne({ slug: req.params.slug, published: true }).lean();
    if (!post) return res.redirect('/blog');
    res.locals.currentRoute = 'blog';
    res.render('blog-single', {
      title: post.title,
      breadcrumb: [{ path: '/', label: 'Home' }, { path: '/blog', label: 'Blog' }, { label: post.title }],
      metaDescription: post.excerpt || post.content.slice(0, 160),
      post,
    });
  } catch (err) {
    res.redirect('/blog');
  }
});

app.get('/contact', (req, res) => {
  res.locals.currentRoute = 'contact';
  res.render('contact', {
    title: 'Contact',
    breadcrumb: [{ path: '/', label: 'Home' }, { label: 'Contact' }],
    metaDescription: 'Contact BridgeDegree — Nigeria\'s career infrastructure platform. Get in touch for students, partners, and universities.',
  });
});

app.get('/about', (req, res) => {
  res.locals.currentRoute = 'about';
  res.locals.breadcrumbDark = true;
  res.render('about', {
    title: 'About',
    breadcrumb: [{ path: '/', label: 'Home' }, { label: 'About' }],
    metaDescription: 'About BridgeDegree: career infrastructure for Nigerian university students. African graduate employability, university career infrastructure, and global mobility.',
  });
});

app.get('/career-passport', (req, res) => {
  res.locals.currentRoute = 'career_passport';
  res.render('career-passport', {
    title: 'Career Passport',
    breadcrumb: [{ path: '/', label: 'Home' }, { label: 'Career Passport' }],
    metaDescription: 'Career Passport — your verified work history, published research, and global pathway in one employer-ready profile. BridgeDegree.',
  });
});

app.get('/policy', (req, res) => {
  res.locals.currentRoute = 'policy';
  res.render('policy', {
    title: 'Policy',
    breadcrumb: [{ path: '/', label: 'Home' }, { label: 'Policy' }],
    metaDescription: 'BridgeDegree policy and terms. Nigeria career platform for students and partners.',
  });
});

module.exports = app;
if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`BridgeDegree running at http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
