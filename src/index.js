require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'https://www.mbpss.co.uk',
    'https://mbpss.co.uk',
    'http://localhost:3000'
  ]
}));

app.use(express.json());
app.use(morgan('dev'));

// MongoDB (safe for Vercel)
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  cached.promise = mongoose.connect(process.env.MONGODB_URI);
  cached.conn = await cached.promise;

  return cached.conn;
}

// Connect DB per request safely
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.log("DB Error:", err.message);
    res.status(500).json({ error: "DB connection failed" });
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/quotes', require('./routes/quote'));
app.use('/api/contacts', require('./routes/contact'));
app.use('/api/reviews', require('./routes/review'));
app.use('/api/services', require('./routes/service'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: "OK",
    message: "Backend running fine 🚀"
  });
});

// ❌ NO app.listen() HERE

module.exports = app;