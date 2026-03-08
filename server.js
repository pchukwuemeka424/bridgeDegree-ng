const path = require('path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');

const app = express();
const PORT = process.env.PORT || 3000;

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

app.get('/', (req, res) => {
  res.locals.currentRoute = 'index';
  res.render('index', {
    title: 'BridgeDegree',
    stylesheet: 'home',
    metaDescription: 'Nigeria\'s career infrastructure for university students. Get verified work experience, publish your research, and build a Career Passport employers trust. Work Experience Engine, Publication Pipeline, Global Mobility.',
  });
});

app.get('/students', (req, res) => {
  res.locals.currentRoute = 'students';
  res.render('onboarding-students', {
    title: 'For Students',
    metaDescription: 'How to get work experience as a Nigerian student. Structured internships, final year project publication support, and a Career Passport. BridgeDegree runs alongside your degree.',
  });
});

app.get('/students/apply', (req, res) => {
  res.locals.currentRoute = 'students_apply';
  res.render('students-apply', {
    title: 'Apply',
    breadcrumb: [{ path: '/', label: 'Home' }, { path: '/students', label: 'Students' }, { label: 'Apply' }],
    metaDescription: 'Apply to BridgeDegree — Nigeria\'s career infrastructure for undergraduates. Student job placement, internship placement, and academic publication support.',
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

app.get('/blog', (req, res) => {
  res.locals.currentRoute = 'blog';
  res.render('blog', {
    title: 'Blog',
    breadcrumb: [{ path: '/', label: 'Home' }, { label: 'Blog' }],
    metaDescription: 'BridgeDegree blog: career tips for Nigerian students, graduate employment in Africa, internship placement, and study abroad after Nigerian university.',
  });
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

app.get('/policy', (req, res) => {
  res.locals.currentRoute = 'policy';
  res.render('policy', {
    title: 'Policy',
    breadcrumb: [{ path: '/', label: 'Home' }, { label: 'Policy' }],
    metaDescription: 'BridgeDegree policy and terms. Nigeria career platform for students and partners.',
  });
});

// Export for Vercel serverless; listen only when run directly
module.exports = app;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`BridgeDegree running at http://localhost:${PORT}`);
  });
}
