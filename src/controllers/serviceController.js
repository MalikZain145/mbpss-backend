const { validationResult } = require('express-validator');
const Service = require('../models/Service');

// Public: get active services
exports.getPublicServices = async (req, res) => {
  const { category } = req.query;
  const filter = { active: true };
  if (category) filter.category = category;
  const services = await Service.find(filter).sort({ order: 1, createdAt: 1 });
  res.json(services);
};

// Public: get single service by slug
exports.getServiceBySlug = async (req, res) => {
  const service = await Service.findOne({ slug: req.params.slug, active: true });
  if (!service) return res.status(404).json({ error: 'Service not found' });
  res.json(service);
};

// Admin: get all
exports.getAllServices = async (req, res) => {
  const services = await Service.find().sort({ order: 1, category: 1 });
  res.json(services);
};

// Admin: create
exports.createService = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  try {
    const service = await Service.create(req.body);
    res.status(201).json(service);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Slug already exists' });
    res.status(500).json({ error: 'Failed to create service' });
  }
};

// Admin: update
exports.updateService = async (req, res) => {
  req.body.updatedAt = new Date();
  const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!service) return res.status(404).json({ error: 'Not found' });
  res.json(service);
};

// Admin: delete
exports.deleteService = async (req, res) => {
  await Service.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};

// Admin: toggle active
exports.toggleService = async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) return res.status(404).json({ error: 'Not found' });
  service.active = !service.active;
  await service.save();
  res.json(service);
};
