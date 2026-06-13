const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  role:      { type: String, default: 'Verified Customer' },
  rating:    { type: Number, required: true, min: 1, max: 5 },
  text:      { type: String, required: true },
  approved:  { type: Boolean, default: false },
  sentiment: { type: String, enum: ['positive','neutral','negative'], default: 'neutral' },
  sentimentScore: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Review', reviewSchema);
