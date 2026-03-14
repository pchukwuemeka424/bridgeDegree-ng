const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  logo: { type: String, required: true }, // URL or path to logo image
  link: { type: String, default: '', trim: true }, // optional website URL
  order: { type: Number, default: 0 }, // lower = first in carousel
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

partnerSchema.index({ order: 1, active: 1 });

module.exports = mongoose.model('Partner', partnerSchema);
