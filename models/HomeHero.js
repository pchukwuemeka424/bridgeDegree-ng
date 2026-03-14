const mongoose = require('mongoose');

const homeHeroSchema = new mongoose.Schema({
  badgeText: { type: String, default: "Nigeria's Career Infrastructure Platform", trim: true },
  title: { type: String, default: 'Graduate with proof', trim: true },
  titleHighlight: { type: String, default: 'proof', trim: true }, // word wrapped in <span>
  description: { type: String, default: 'BridgeDegree embeds verified work experience, published research, and global career pathways directly into your university years, starting from 100 Level.', trim: true },
  ctaText: { type: String, default: 'Get Started', trim: true },
  ctaUrl: { type: String, default: '/students/apply#apply', trim: true },
  bgImage: { type: String, default: '/images/banna.jpg', trim: true }, // hero background image
  updatedAt: { type: Date, default: Date.now },
});

// Single document: use findOne / findOneAndUpdate
module.exports = mongoose.model('HomeHero', homeHeroSchema);
