/**
 * Seed database with admin, blog posts, and sample student applications.
 * Run: npm run seed  or  node scripts/seed.js
 */
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const BlogPost = require('../models/BlogPost');
const StudentApplication = require('../models/StudentApplication');
const Testimonial = require('../models/Testimonial');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bridgedegree';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@bridgedegree.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';

function slugify(text) {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-')
    + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const sampleBlogPosts = [
  {
    title: 'Why Your Degree Is Not Enough — And Why That Is Not Your Fault',
    excerpt: 'The Nigerian university system was not designed to produce employable graduates. The gap between a degree and a career is a systemic design flaw — not a personal failure.',
    content: 'The Nigerian university system was not designed to produce employable graduates. The gap between a degree and a career is a systemic design flaw — not a personal failure.\n\nMost graduates leave school with a certificate but without the proof employers want: verified work experience, published research, and a clear narrative of what they can do. BridgeDegree exists to close that gap while you are still in school.',
    published: true,
  },
  {
    title: 'The NYSC Year Is Not a Waiting Period — It Is Your Last Window',
    excerpt: 'Most corps members treat NYSC as something to endure. The ones who secure competitive employment use it as a final 12-month sprint to build credentials.',
    content: 'Most corps members treat NYSC as something to endure. The ones who secure competitive employment use it as a final 12-month sprint to build credentials.\n\nUse the year to complete placements, get references, and polish your Career Passport. Employers and graduate schools look at what you did during service — make it count.',
    published: true,
  },
  {
    title: 'Japa Done Right: How to Position Yourself for International Opportunities',
    excerpt: 'International employers and graduate schools are looking for something they can verify. Here\'s how to build it before you graduate.',
    content: 'International employers and graduate schools are looking for something they can verify. Here\'s how to build it before you graduate.\n\nVerified work experience, published research, and a clear career narrative are what set successful applicants apart. Start building these from 200 Level.',
    published: true,
  },
  {
    title: 'Your Final Year Project Deserves Better Than a Shelf',
    excerpt: 'Nigerian universities generate thousands of valuable research projects every year. BridgeDegree is the system that takes your project from submission to publication.',
    content: 'Nigerian universities generate thousands of valuable research projects every year. BridgeDegree is the system that takes your project from submission to publication.\n\nTurn your final year project into a published paper and a talking point on your CV. The Publication Pipeline supports you from idea to journal submission.',
    published: true,
  },
];

const sampleApplications = [
  {
    firstname: 'Chioma',
    lastname: 'Okonkwo',
    email: 'chioma.okonkwo@example.com',
    university: 'University of Lagos',
    level: '300L',
    department: 'Computer Science',
    career_goal: 'Work in tech in the UK within 2 years of graduation',
    hear_about: 'Friend',
    career_fields: ['Technology / Software', 'Data & Artificial Intelligence'],
    work_experience_type: ['Remote internships', 'Research & academic publishing'],
    work_experience: 'Less than 3 months',
    skills: ['Programming / Software Development', 'Data Analysis'],
    long_term_goals: ['Work remotely for international companies', 'Study abroad'],
    publish_research: 'Yes',
    final_year_project: 'Yes',
    consent: true,
    status: 'under_review',
  },
  {
    firstname: 'Ibrahim',
    lastname: 'Yusuf',
    email: 'ibrahim.yusuf@example.com',
    university: 'Ahmadu Bello University',
    level: '400L',
    department: 'Electrical Engineering',
    career_goal: 'Build a startup in renewable energy',
    hear_about: 'Lecturer',
    career_fields: ['Engineering', 'Entrepreneurship'],
    work_experience_type: ['Local company internships', 'Startup building'],
    work_experience: '3–12 months',
    skills: ['Design / Creative', 'Communication / Leadership'],
    long_term_goals: ['Build a startup', 'Work in Nigeria'],
    publish_research: 'Maybe',
    final_year_project: 'Yes',
    consent: true,
    status: 'shortlisted',
  },
  {
    firstname: 'Amara',
    lastname: 'Nwosu',
    email: 'amara.nwosu@example.com',
    university: 'University of Nigeria, Nsukka',
    level: '200L',
    department: 'Business Administration',
    career_goal: 'Consulting or product management',
    hear_about: 'Social media',
    career_fields: ['Business / Consulting', 'Technology / Software'],
    work_experience_type: ['Remote internships', 'Local company internships'],
    work_experience: 'None',
    skills: ['Writing & Research', 'Communication / Leadership'],
    long_term_goals: ['Work remotely for international companies'],
    publish_research: 'No',
    final_year_project: 'Not sure',
    consent: true,
    status: 'submitted',
  },
];

const sampleTestimonials = [
  {
    name: 'Chioma O.',
    role: 'Graduate',
    location: 'Lagos',
    quote: "BridgeDegree gave me a real portfolio before I graduated. My Career Passport landed me interviews I wouldn't have gotten otherwise.",
    featured: true,
  },
  {
    name: 'Dr. Adebayo',
    role: 'University Partner',
    location: '',
    quote: "We needed a way to make our students visible to employers. BridgeDegree's framework integrated seamlessly with our curriculum.",
    featured: true,
  },
  {
    name: 'Emeka N.',
    role: 'Student',
    location: 'Abuja',
    quote: "The publication pipeline turned my final-year project into a citable asset. It's now part of my professional identity.",
    featured: true,
  },
  {
    name: 'HR Lead',
    role: 'Partner Organisation',
    location: '',
    quote: 'Hiring from BridgeDegree profiles is efficient. We see verified experience and work history, not just degrees.',
    featured: true,
  },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB\n');

  // Admin
  let admin = await Admin.findOne({ email: ADMIN_EMAIL });
  if (!admin) {
    await Admin.create({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: 'Admin' });
    console.log('Created admin:', ADMIN_EMAIL);
  } else {
    console.log('Admin already exists:', ADMIN_EMAIL);
  }

  // Blog posts (skip if we already have posts)
  const existingPosts = await BlogPost.countDocuments();
  if (existingPosts === 0) {
    for (const p of sampleBlogPosts) {
      const post = new BlogPost({ ...p, slug: slugify(p.title) });
      await post.save();
      console.log('Created blog post:', post.title);
    }
  } else {
    console.log('Blog posts already exist (' + existingPosts + '), skipping.');
  }

  // Student applications (add sample ones)
  const existingApps = await StudentApplication.countDocuments();
  if (existingApps === 0) {
    const hex = () => require('crypto').randomBytes(4).toString('hex').toUpperCase();
    for (const a of sampleApplications) {
      const app = new StudentApplication({ ...a, applicationId: 'BD-' + hex() });
      await app.save();
      console.log('Created application:', app.applicationId, app.firstname, app.lastname);
    }
  } else {
    console.log('Applications already exist (' + existingApps + '), skipping.');
  }

  // Testimonials
  const existingTestimonials = await Testimonial.countDocuments();
  if (existingTestimonials === 0) {
    for (const t of sampleTestimonials) {
      const doc = new Testimonial(t);
      await doc.save();
      console.log('Created testimonial:', doc.name);
    }
  } else {
    console.log('Testimonials already exist (' + existingTestimonials + '), skipping.');
  }

  console.log('\nSeed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
