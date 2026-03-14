const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  content: { type: String, required: true },
  image: { type: String, default: null },
  excerpt: { type: String, trim: true, maxlength: 300 },
  published: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

blogPostSchema.index({ slug: 1 });
blogPostSchema.index({ createdAt: -1 });

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

blogPostSchema.pre('save', function () {
  this.updatedAt = new Date();
  if (this.isModified('title') && !this.slug) {
    this.slug = slugify(this.title) + '-' + Date.now().toString(36);
  }
});

module.exports = mongoose.model('BlogPost', blogPostSchema);
