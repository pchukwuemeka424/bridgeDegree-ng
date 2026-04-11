const mongoose = require('mongoose');

const internshipCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  sortOrder: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

internshipCategorySchema.pre('save', function () {
  this.updatedAt = new Date();
});

internshipCategorySchema.index({ sortOrder: 1, name: 1 });

module.exports = mongoose.model('InternshipCategory', internshipCategorySchema);
