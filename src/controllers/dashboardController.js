const Quote   = require('../models/Quote');
const Contact = require('../models/Contact');
const Review  = require('../models/Review');
const Service = require('../models/Service');

exports.getDashboard = async (req, res) => {
  try {
    const now           = new Date();
    const thirtyDaysAgo = new Date(now - 30*24*60*60*1000);
    const sevenDaysAgo  = new Date(now - 7*24*60*60*1000);

    const [
      totalQuotes, newQuotes, weekQuotes,
      totalContacts, newContacts,
      totalReviews, pendingReviews, approvedReviews,
      totalServices, activeServices,
      quotesTrend, contactsTrend, topServices,
      ratingDocs,
    ] = await Promise.all([
      Quote.countDocuments(),
      Quote.countDocuments({ status: 'new' }),
      Quote.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Contact.countDocuments(),
      Contact.countDocuments({ status: 'new' }),
      Review.countDocuments(),
      Review.countDocuments({ approved: false }),
      Review.countDocuments({ approved: true }),
      Service.countDocuments(),
      Service.countDocuments({ active: true }),
      Quote.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format:'%Y-%m-%d', date:'$createdAt' } }, count: { $sum:1 } } },
        { $sort: { _id: 1 } },
      ]),
      Contact.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format:'%Y-%m-%d', date:'$createdAt' } }, count: { $sum:1 } } },
        { $sort: { _id: 1 } },
      ]),
      Quote.aggregate([
        { $unwind: '$selectedServices' },
        { $group: { _id: '$selectedServices', count: { $sum:1 } } },
        { $sort: { count: -1 } }, { $limit: 8 },
      ]),
      Review.find({ approved: true }).select('rating'),
    ]);

    const avgRating = ratingDocs.length
      ? (ratingDocs.reduce((a,r) => a+r.rating, 0) / ratingDocs.length).toFixed(1)
      : 0;

    const [recentQuotes, recentContacts] = await Promise.all([
      Quote.find().sort({ createdAt: -1 }).limit(5).select('name email selectedServices status createdAt'),
      Contact.find().sort({ createdAt: -1 }).limit(5).select('name email service status createdAt'),
    ]);

    res.json({
      stats: {
        totalQuotes, newQuotes, weekQuotes,
        totalContacts, newContacts,
        totalReviews, pendingReviews, approvedReviews,
        avgRating: Number(avgRating),
        totalServices, activeServices,
      },
      charts: { quotesTrend, contactsTrend, topServices },
      recent: { quotes: recentQuotes, contacts: recentContacts },
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Dashboard data failed' });
  }
};
