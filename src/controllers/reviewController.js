const { validationResult } = require('express-validator');
const Review = require('../models/Review');

let SentimentLib;
try { SentimentLib = require('sentiment'); } catch { SentimentLib = null; }

function analyzeSentiment(text) {
  if (!SentimentLib) return { label: 'neutral', score: 0 };
  try {
    const s = new SentimentLib();
    const r = s.analyze(text);
    const score = parseFloat(r.comparative.toFixed(3));
    const label = score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral';
    return { label, score };
  } catch { return { label: 'neutral', score: 0 }; }
}

// PUBLIC — submit (goes pending)
exports.submitReview = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ error: errors.array()[0].msg });
  try {
    const { label, score } = analyzeSentiment(req.body.text);
    await Review.create({ ...req.body, approved: false, sentiment: label, sentimentScore: score });
    res.status(201).json({ success: true, message: 'Review submitted — it will appear after approval.' });
  } catch (err) {
    console.error('Review submit error:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
};

// PUBLIC — get approved reviews for website
exports.getApprovedReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ approved: true }).sort({ createdAt: -1 }).limit(50);
    const total   = await Review.countDocuments({ approved: true });
    const avg     = reviews.length
      ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
      : 0;
    res.json({ reviews, total, averageRating: Number(avg) });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch reviews' }); }
};

// ADMIN — get all reviews (with optional filter)
exports.getAllReviews = async (req, res) => {
  try {
    const { approved, page = 1, limit = 50 } = req.query;
    // Build filter
    let filter = {};
    if (approved === 'true')  filter.approved = true;
    if (approved === 'false') filter.approved = false;
    // 'all' or undefined = no filter

    const [reviews, total] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit)),
      Review.countDocuments(filter),
    ]);
    res.json({ reviews, total });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch reviews' }); }
};

// ADMIN — approve
exports.approveReview = async (req, res) => {
  try {
    const r = await Review.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
    if (!r) return res.status(404).json({ error: 'Review not found' });
    res.json(r);
  } catch (err) { res.status(500).json({ error: 'Failed to approve review' }); }
};

// ADMIN — update
exports.updateReview = async (req, res) => {
  try {
    const r = await Review.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!r) return res.status(404).json({ error: 'Review not found' });
    res.json(r);
  } catch (err) { res.status(500).json({ error: 'Failed to update review' }); }
};

// ADMIN — delete
exports.deleteReview = async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete review' }); }
};

// ADMIN — sentiment analytics
exports.getSentimentAnalytics = async (req, res) => {
  try {
    const [sentimentBreakdown, ratingDist, recentTrend, approvedReviews, pending] = await Promise.all([
      Review.aggregate([
        { $match: { approved: true } },
        { $group: { _id: '$sentiment', count: { $sum: 1 } } },
      ]),
      Review.aggregate([
        { $match: { approved: true } },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Review.aggregate([
        { $match: { approved: true, createdAt: { $gte: new Date(Date.now() - 90*24*60*60*1000) } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          avgSentiment: { $avg: '$sentimentScore' },
        }},
        { $sort: { _id: 1 } },
      ]),
      Review.find({ approved: true }).select('rating'),
      Review.countDocuments({ approved: false }),
    ]);

    const total = await Review.countDocuments({ approved: true });
    const avgRating = approvedReviews.length
      ? (approvedReviews.reduce((a,r) => a+r.rating, 0) / approvedReviews.length).toFixed(1)
      : 0;

    res.json({ sentimentBreakdown, ratingDist, recentTrend, total, avgRating: Number(avgRating), pending });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Analytics failed' });
  }
};
