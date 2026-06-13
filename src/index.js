require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const app = express();

// middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'https://www.mbpss.co.uk',
    'https://mbpss.co.uk',
    'http://localhost:3000'
  ],
  credentials: true
}));

app.use(express.json());

// MongoDB connect (IMPORTANT for serverless)
let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
  console.log("MongoDB connected");
}

// ROUTES wrapper (VERY IMPORTANT for Vercel)
app.get('/api/health', async (req, res) => {
  await connectDB();
  res.json({
    status: "OK",
    time: new Date().toISOString()
  });
});

// routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/quotes', require('./routes/quote'));
app.use('/api/contacts', require('./routes/contact'));
app.use('/api/reviews', require('./routes/review'));
app.use('/api/services', require('./routes/service'));
app.use('/api/dashboard', require('./routes/dashboard'));

// default
app.get('/', (req, res) => {
  res.send("MBPSS Backend Running");
});


module.exports = app;