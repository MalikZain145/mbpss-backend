const { body } = require('express-validator');

exports.validateQuote = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone number required'),
  // postcode is optional - user may not know it
  body('selectedServices').isArray({ min: 1 }).withMessage('At least one service must be selected'),
];

exports.validateContact = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('message').trim().notEmpty().isLength({ min: 5 }).withMessage('Message required'),
];

exports.validateReview = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('text').trim().notEmpty().isLength({ min: 10 }).withMessage('Review must be at least 10 characters'),
];

exports.validateService = [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('slug').trim().notEmpty().withMessage('Slug required'),
  body('category').isIn(['residential','commercial','new-build']).withMessage('Invalid category'),
  body('description').trim().notEmpty().withMessage('Description required'),
];
