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

module.exports = upload;
