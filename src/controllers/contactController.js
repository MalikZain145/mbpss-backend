const { validationResult } = require('express-validator');
const Contact = require('../models/Contact');

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

exports.submitContact = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors.array()[0].msg });
  }
  try {
    const contact = await Contact.create(req.body);

    sendEmail(
      process.env.NOTIFY_EMAIL || 'info@mbpss.co.uk',
      `New Message — ${req.body.name}`,
      `<h2>New Contact Message</h2>
       <p><b>Name:</b> ${req.body.name}</p>
       <p><b>Email:</b> ${req.body.email}</p>
       <p><b>Phone:</b> ${req.body.phone || 'N/A'}</p>
       <p><b>Service:</b> ${req.body.service || 'N/A'}</p>
       <p><b>Message:</b> ${req.body.message}</p>`
    );
    sendEmail(
      req.body.email,
      'Thanks for contacting MBPSS',
      `<h2>Hi ${req.body.name},</h2>
       <p>Thanks for getting in touch. We'll respond within 2 hours.</p>
       <p>Call us: +44 7540 387542</p>`
    );

    return res.status(201).json({ success: true, id: contact._id });
  } catch (err) {
    console.error('Contact error:', err);
    return res.status(500).json({ error: 'Failed to send message. Please call us on +44 7540 387542.' });
  }
};

exports.getAllContacts = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};
    const [contacts, total] = await Promise.all([
      Contact.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit)),
      Contact.countDocuments(filter),
    ]);
    res.json({ contacts, total, page: Number(page), pages: Math.ceil(total/limit) });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch messages' }); }
};

exports.getContact = async (req, res) => {
  try {
    const c = await Contact.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    if (c.status === 'new') { c.status = 'read'; await c.save(); }
    res.json(c);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch message' }); }
};

exports.updateContact = async (req, res) => {
  try {
    const c = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json(c);
  } catch (err) { res.status(500).json({ error: 'Failed to update' }); }
};

exports.deleteContact = async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete' }); }
};
