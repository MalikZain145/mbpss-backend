const router = require('express').Router();
const auth   = require('../middleware/auth');
const { validateReview } = require('../middleware/validators');
const c = require('../controllers/reviewController');

// Public
router.post('/',          validateReview, c.submitReview);
router.get('/approved',   c.getApprovedReviews);      // MUST be before /:id

// Admin (auth protected)
router.get('/analytics',  auth, c.getSentimentAnalytics); // MUST be before /:id
router.get('/',           auth, c.getAllReviews);
router.put('/:id/approve',auth, c.approveReview);
router.put('/:id',        auth, c.updateReview);
router.delete('/:id',     auth, c.deleteReview);

module.exports = router;
