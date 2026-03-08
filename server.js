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
  next();
});

app.get('/', (req, res) => {
  res.locals.currentRoute = 'index';
  res.render('index', { title: 'BridgeDegree', stylesheet: 'home' });
});

app.get('/students', (req, res) => {
  res.locals.currentRoute = 'students';
  res.render('onboarding-students', { title: 'For Students' });
});

app.get('/students/apply', (req, res) => {
  res.locals.currentRoute = 'students_apply';
  res.render('students-apply', { title: 'Apply', breadcrumb: [{ path: '/', label: 'Home' }, { path: '/students', label: 'Students' }, { label: 'Apply' }] });
});

app.get('/partners', (req, res) => {
  res.locals.currentRoute = 'partners';
  res.render('onboarding-partners', { title: 'For Partners' });
});

app.get('/how-it-works', (req, res) => {
  res.locals.currentRoute = 'how_it_works';
  res.render('how-it-works', { title: 'How It Works' });
});

app.get('/faq', (req, res) => {
  res.locals.currentRoute = 'faq';
  res.render('faq', { title: 'FAQ', breadcrumb: [{ path: '/', label: 'Home' }, { label: 'FAQ' }] });
});

app.get('/blog', (req, res) => {
  res.locals.currentRoute = 'blog';
  res.render('blog', { title: 'Blog', breadcrumb: [{ path: '/', label: 'Home' }, { label: 'Blog' }] });
});

app.get('/contact', (req, res) => {
  res.locals.currentRoute = 'contact';
  res.render('contact', { title: 'Contact', breadcrumb: [{ path: '/', label: 'Home' }, { label: 'Contact' }] });
});

app.get('/about', (req, res) => {
  res.locals.currentRoute = 'about';
  res.render('about', { title: 'About', breadcrumb: [{ path: '/', label: 'Home' }, { label: 'About' }] });
});

app.get('/policy', (req, res) => {
  res.locals.currentRoute = 'policy';
  res.render('policy', { title: 'Policy', breadcrumb: [{ path: '/', label: 'Home' }, { label: 'Policy' }] });
});

// Export for Vercel serverless; listen only when run directly
module.exports = app;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`BridgeDegree running at http://localhost:${PORT}`);
  });
}
