const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  slug:     { type: String, required: true, unique: true, lowercase: true },
  category: { type: String, enum: ['residential','commercial','new-build'], required: true },
  description: { type: String, required: true },
  features: [{ type: String }],
  duration: { type: String },
  validity: { type: String },
  icon:     { type: String, default: 'FileText' },
  color:    { type: String, default: '#f59e0b' },
  active:   { type: Boolean, default: true },
  order:    { type: Number, default: 0 },
  createdAt:{ type: Date, default: Date.now },
  updatedAt:{ type: Date, default: Date.now },
});

module.exports = mongoose.model('Service', serviceSchema);
