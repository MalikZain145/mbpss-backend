const app = require('./src/index');

// Vercel serverless wrapper
module.exports = (req, res) => {
  return app(req, res);
};