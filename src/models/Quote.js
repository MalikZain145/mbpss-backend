const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
  name:             { type: String, required: true, trim: true },
  email:            { type: String, required: true, lowercase: true },
  phone:            { type: String, required: true },
  selectedServices: [{ type: String }],
  propertyType:     { type: String },
  postcode:         { type: String },
  bedrooms:         { type: String },
  address:          { type: String },
  preferredDate:    { type: String },
  notes:            { type: String },
  status:           { type: String, enum: ['new','read','responded','closed'], default: 'new' },
  adminNotes:       { type: String, default: '' },
  createdAt:        { type: Date, default: Date.now },
});

module.exports = mongoose.model('Quote', quoteSchema);
