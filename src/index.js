require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const mongoose = require('mongoose');

const app = express();

/* -------------------- MIDDLEWARE -------------------- */

// No cache (important for Vercel)
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Security
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS FIXED FOR PRODUCTION
app.use(cors({
  origin: [
    'https://www.mbpss.co.uk',
    'https://mbpss.co.uk',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.options('*', cors());

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* -------------------- RATE LIMIT -------------------- */

const requestCounts = new Map();

const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  const windowMs = 15 * 60 * 1000;
  const max = 100;

  const data = requestCounts.get(ip) || {
    count: 0,
    resetAt: now + windowMs
  };

  if (now > data.resetAt) {
    data.count = 0;
    data.resetAt = now + windowMs;
  }

  data.count++;
  requestCounts.set(ip, data);

  if (data.count > max) {
    return res.status(429).json({
      error: 'Too many requests. Please try again later.'
    });
  }

  next();
};

/* -------------------- ROUTES -------------------- */

app.get('/', (req, res) => {
  res.json({
    message: 'MBPSS Backend Running 🚀',
    status: 'OK'
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'API is working'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Your API routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/quotes',    rateLimiter, require('./routes/quote'));
app.use('/api/contacts',  rateLimiter, require('./routes/contact'));
app.use('/api/reviews',   rateLimiter, require('./routes/review'));
app.use('/api/services',  require('./routes/service'));
app.use('/api/dashboard', require('./routes/dashboard'));

/* -------------------- 404 HANDLER -------------------- */

app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API route not found'
  });
});

/* -------------------- ERROR HANDLER -------------------- */

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error'
  });
});

/* -------------------- DB CONNECTION (SAFE) -------------------- */

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mbpss')
  .then(() => {
    console.log('✅ MongoDB connected');
  })
  .catch(err => {
    console.log('⚠️ MongoDB not connected:', err.message);
  });

/* -------------------- IMPORTANT FOR VERCEL -------------------- */

// ❌ NO app.listen()

module.exports = app;