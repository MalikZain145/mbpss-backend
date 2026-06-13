require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const app = express();

/* =========================
   SECURITY & MIDDLEWARE
========================= */
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use(helmet());

app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
    'https://mbpssfrontend.vercel.app',
    'https://www.mbpss.co.uk',
    'https://mbpss.co.uk'
  ],
  credentials: true
}));

app.options('*', cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* =========================
   RATE LIMIT (simple)
========================= */
const requestCounts = new Map();
const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const max = 100;
  let data = requestCounts.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > data.resetAt) {
    data.count = 0;
    data.resetAt = now + windowMs;
  }
  data.count++;
  requestCounts.set(ip, data);
  if (data.count > max) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
};

/* =========================
   DB CONNECTION (SAFE)
========================= */
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI).then(m => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

connectDB();

/* =========================
   ROUTES
========================= */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Backend is running',
    time: new Date().toISOString()
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/quotes', rateLimiter, require('./routes/quote'));
app.use('/api/contacts', rateLimiter, require('./routes/contact'));
app.use('/api/reviews', rateLimiter, require('./routes/review'));
app.use('/api/services', require('./routes/service'));
app.use('/api/dashboard', require('./routes/dashboard'));

/* =========================
   404 HANDLER
========================= */
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

/* =========================
   ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

/* =========================
   SERVER START (ONLY LOCAL)
========================= */
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log('✅ Backend running locally');
    console.log(`🚀 http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;