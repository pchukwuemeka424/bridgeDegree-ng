const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const studentApplicationSchema = new mongoose.Schema({
  applicationId: { type: String, required: true, unique: true },
  password: { type: String, select: false },
  // Step 1
  firstname: { type: String, required: true, trim: true },
  lastname: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  university: { type: String, required: true, trim: true },
  level: { type: String, required: true },
  department: { type: String, required: true, trim: true },
  career_goal: { type: String, default: '' },
  hear_about: { type: String, default: '' },
  // Step 2
  career_fields: [{ type: String }],
  work_experience_type: [{ type: String }],
  // Step 3
  work_experience: { type: String, default: '' },
  skills: [{ type: String }],
  skills_other: { type: String, default: '' },
  // Step 4
  long_term_goals: [{ type: String }],
  // Step 5
  publish_research: { type: String, default: '' },
  final_year_project: { type: String, default: '' },
  // Step 6
  consent: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['submitted', 'under_review', 'shortlisted', 'accepted', 'rejected'],
    default: 'submitted',
  },
  adminNotes: { type: String, default: '' },
  passportPhoto: { type: String, default: '' },
  submittedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

studentApplicationSchema.index({ email: 1 });
studentApplicationSchema.index({ submittedAt: -1 });

studentApplicationSchema.pre('save', function () {
  this.updatedAt = new Date();
  if (!this.applicationId) {
    this.applicationId = 'BD-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  }
});

studentApplicationSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

studentApplicationSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password || '');
};

module.exports = mongoose.model('StudentApplication', studentApplicationSchema);
