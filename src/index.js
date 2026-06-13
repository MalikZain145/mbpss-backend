const express = require('express');
const app = express();

app.use(express.json());

// routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/quotes', require('./routes/quote'));
app.use('/api/contacts', require('./routes/contact'));
app.use('/api/reviews', require('./routes/review'));
app.use('/api/services', require('./routes/service'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/api/health', (req, res) => {
  res.json({ status: "OK" });
});

module.exports = app;