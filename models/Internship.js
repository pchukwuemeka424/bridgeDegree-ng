const mongoose = require('mongoose');

const internshipSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InternshipCategory',
    required: true,
  },
  active: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

internshipSchema.pre('save', function () {
  this.updatedAt = new Date();
});

internshipSchema.index({ category: 1, sortOrder: 1 });
internshipSchema.index({ active: 1 });

module.exports = mongoose.model('Internship', internshipSchema);
