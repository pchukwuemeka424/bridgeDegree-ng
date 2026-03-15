const path = require('path');
const fs = require('fs');
const os = require('os');
const multer = require('multer');

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

let storage;
if (useBlob) {
  // Vercel Blob: keep file in memory for upload in route
  storage = multer.memoryStorage();
} else {
  const isVercel = process.env.VERCEL === '1';
  const uploadDir = isVercel
    ? path.join(os.tmpdir(), 'uploads', 'blog')
    : path.join(__dirname, '..', 'public', 'uploads', 'blog');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = (file.mimetype === 'image/png') ? 'png' : (file.mimetype === 'image/jpeg' ? 'jpg' : 'jpg');
      cb(null, `blog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`);
    },
  });
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /image\/(jpeg|png|gif|webp)/;
    if (allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed.'));
  },
});

// Partner logo upload (local: public/uploads/partners)
let partnerStorage;
if (useBlob) {
  partnerStorage = multer.memoryStorage();
} else {
  const isVercel = process.env.VERCEL === '1';
  const partnerDir = isVercel
    ? path.join(os.tmpdir(), 'uploads', 'partners')
    : path.join(__dirname, '..', 'public', 'uploads', 'partners');
  if (!fs.existsSync(partnerDir)) {
    fs.mkdirSync(partnerDir, { recursive: true });
  }
  partnerStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, partnerDir),
    filename: (req, file, cb) => {
      const ext = (file.mimetype === 'image/png') ? 'png' : (file.mimetype === 'image/jpeg' ? 'jpg' : 'jpg');
      cb(null, `partner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`);
    },
  });
}

const uploadPartner = multer({
  storage: partnerStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /image\/(jpeg|png|gif|webp)/;
    if (allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed.'));
  },
});

// Hero background image upload (local: public/uploads/hero)
let heroStorage;
if (useBlob) {
  heroStorage = multer.memoryStorage();
} else {
  const isVercel = process.env.VERCEL === '1';
  const heroDir = isVercel
    ? path.join(os.tmpdir(), 'uploads', 'hero')
    : path.join(__dirname, '..', 'public', 'uploads', 'hero');
  if (!fs.existsSync(heroDir)) {
    fs.mkdirSync(heroDir, { recursive: true });
  }
  heroStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, heroDir),
    filename: (req, file, cb) => {
      const ext = (file.mimetype === 'image/png') ? 'png' : (file.mimetype === 'image/jpeg' ? 'jpg' : 'jpg');
      cb(null, `hero-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`);
    },
  });
}

const uploadHero = multer({
  storage: heroStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /image\/(jpeg|png|gif|webp)/;
    if (allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed.'));
  },
});

// Student passport photo upload (profile picture / ID photo)
let passportStorage;
if (useBlob) {
  passportStorage = multer.memoryStorage();
} else {
  const isVercel = process.env.VERCEL === '1';
  const passportDir = isVercel
    ? path.join(os.tmpdir(), 'uploads', 'passports')
    : path.join(__dirname, '..', 'public', 'uploads', 'passports');
  if (!fs.existsSync(passportDir)) {
    fs.mkdirSync(passportDir, { recursive: true });
  }
  passportStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, passportDir),
    filename: (req, file, cb) => {
      const ext = (file.mimetype === 'image/png') ? 'png' : (file.mimetype === 'image/jpeg' ? 'jpg' : 'jpg');
      cb(null, `passport-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`);
    },
  });
}

const uploadPassport = multer({
  storage: passportStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /image\/(jpeg|png|gif|webp)/;
    if (allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed.'));
  },
});

module.exports = upload;
module.exports.uploadPartner = uploadPartner;
module.exports.uploadHero = uploadHero;
module.exports.uploadPassport = uploadPassport;
