const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  role: { type: String, default: '', trim: true },
  location: { type: String, default: '', trim: true },
  quote: { type: String, required: true, trim: true },
  featured: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

testimonialSchema.index({ featured: 1, createdAt: -1 });

module.exports = mongoose.model('Testimonial', testimonialSchema);

