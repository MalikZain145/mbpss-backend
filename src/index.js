require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const mongoose  = require('mongoose');

const app = express();

// Force fresh responses — prevents 304 Not Modified
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Security & logging
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl) and localhost
    const allowed = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://www.mbpss.co.uk',
      'https://mbpss.co.uk',
    ];
    if (!origin || allowed.includes(origin)) return callback(null, true);
    callback(null, true); // Allow all in dev; restrict in prod
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));
app.options('*', cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Simple rate limiting without external package dependency issues
const requestCounts = new Map();
const rateLimiter = (req, res, next) => {
  const ip  = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 min
  const max = 100;
  const data = requestCounts.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > data.resetAt) { data.count = 0; data.resetAt = now + windowMs; }
  data.count++;
  requestCounts.set(ip, data);
  if (data.count > max) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  next();
};

// Routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/quotes',    rateLimiter, require('./routes/quote'));
app.use('/api/contacts',  rateLimiter, require('./routes/contact'));
app.use('/api/reviews',   rateLimiter, require('./routes/review'));
app.use('/api/services',  require('./routes/service'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// 404
app.use('/api/*', (req, res) => res.status(404).json({ error: 'API route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mbpss')
  .then(async () => {
    console.log('✅ MongoDB connected');
    await seedAdmin();
    app.listen(PORT, () => {
      console.log(`\n✅ MBPSS Backend running`);
      console.log(`   API:   http://localhost:${PORT}/api`);
      console.log(`   Admin: http://localhost:3000/admin\n`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('   Make sure MongoDB is running and MONGODB_URI is correct in .env');
    process.exit(1);
  });

async function seedAdmin() {
  const Admin = require('./models/Admin');
  const count = await Admin.countDocuments();
  if (count === 0) {
    await Admin.create({
      email:    process.env.ADMIN_EMAIL    || 'admin@mbpss.co.uk',
      password: process.env.ADMIN_PASSWORD || 'Admin@MBPSS2025',
      name:     'Maryum Amir',
    });
    console.log('✅ Admin account created');
    console.log(`   Email:    ${process.env.ADMIN_EMAIL    || 'admin@mbpss.co.uk'}`);
    console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'Admin@MBPSS2025'}`);
    console.log('   ⚠️  Change your password after first login!\n');
  }
}

module.exports = app;
