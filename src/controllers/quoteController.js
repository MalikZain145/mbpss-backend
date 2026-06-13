const { validationResult } = require('express-validator');
const Quote = require('../models/Quote');

// Safe email sender — never crashes the request
async function sendEmail(to, subject, html) {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
    const nodemailer = require('nodemailer');
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await t.sendMail({ from: `"MBPSS" <${process.env.SMTP_USER}>`, to, subject, html });
  } catch (err) {
    console.log('[Email skipped]', err.message);
  }
}

exports.submitQuote = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors.array()[0].msg });
  }
  try {
    const quote = await Quote.create(req.body);
    const services = (req.body.selectedServices || []).join(', ');

    // Fire-and-forget emails (won't block response)
    sendEmail(
      process.env.NOTIFY_EMAIL || 'info@mbpss.co.uk',
      `New Quote — ${req.body.name}`,
      `<h2>New Quote Request</h2>
       <p><b>Name:</b> ${req.body.name}</p>
       <p><b>Email:</b> ${req.body.email}</p>
       <p><b>Phone:</b> ${req.body.phone}</p>
       <p><b>Services:</b> ${services}</p>
       <p><b>Postcode:</b> ${req.body.postcode || 'N/A'}</p>
       <p><b>Notes:</b> ${req.body.notes || 'None'}</p>`
    );
    sendEmail(
      req.body.email,
      'Your Quote Request — MBPSS Property Solutions',
      `<h2>Hi ${req.body.name},</h2>
       <p>Thank you for your quote request. We will be in touch within 2 hours.</p>
       <p><b>Services requested:</b> ${services}</p>
       <p>Call us: +44 7540 387542</p>`
    );

    return res.status(201).json({ success: true, id: quote._id });
  } catch (err) {
    console.error('Quote error:', err);
    return res.status(500).json({ error: 'Failed to save quote. Please call us on +44 7540 387542.' });
  }
};

exports.getAllQuotes = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};
    const [quotes, total] = await Promise.all([
      Quote.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit)),
      Quote.countDocuments(filter),
    ]);
    res.json({ quotes, total, page: Number(page), pages: Math.ceil(total/limit) });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch quotes' }); }
};

exports.getQuote = async (req, res) => {
  try {
    const q = await Quote.findById(req.params.id);
    if (!q) return res.status(404).json({ error: 'Not found' });
    if (q.status === 'new') { q.status = 'read'; await q.save(); }
    res.json(q);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch quote' }); }
};

exports.updateQuote = async (req, res) => {
  try {
    const q = await Quote.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!q) return res.status(404).json({ error: 'Not found' });
    res.json(q);
  } catch (err) { res.status(500).json({ error: 'Failed to update' }); }
};

exports.deleteQuote = async (req, res) => {
  try {
    await Quote.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete' }); }
};

exports.getQuoteStats = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000);
    const [total, newCount, responded, daily, serviceBreakdown] = await Promise.all([
      Quote.countDocuments(),
      Quote.countDocuments({ status: 'new' }),
      Quote.countDocuments({ status: 'responded' }),
      Quote.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format:'%Y-%m-%d', date:'$createdAt' } }, count: { $sum:1 } } },
        { $sort: { _id: 1 } },
      ]),
      Quote.aggregate([
        { $unwind: '$selectedServices' },
        { $group: { _id: '$selectedServices', count: { $sum:1 } } },
        { $sort: { count: -1 } }, { $limit: 10 },
      ]),
    ]);
    res.json({ total, newCount, responded, daily, serviceBreakdown });
  } catch (err) { res.status(500).json({ error: 'Stats failed' }); }
};
