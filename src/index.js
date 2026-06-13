require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const app = express();

app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'https://www.mbpss.co.uk',
    'https://mbpss.co.uk'
  ],
  credentials: true
}));

app.use(helmet());
app.use(express.json());

// DB connect (safe for serverless)
let cached = global.mongoose;

async function connectDB() {
  if (cached) return;
  await mongoose.connect(process.env.MONGODB_URI);
  cached = true;
}

// HEALTH
app.get('/api/health', async (req, res) => {
  await connectDB();
  res.json({ status: "OK", time: new Date() });
});

// ROUTES
app.use('/api/auth', require('./routes/auth'));
app.use('/api/quotes', require('./routes/quote'));
app.use('/api/contacts', require('./routes/contact'));
app.use('/api/reviews', require('./routes/review'));
app.use('/api/services', require('./routes/service'));

module.exports = app;