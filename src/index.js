const express = require('express');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 8080;

// Secrets injected by External Secrets Operator → AWS Secrets Manager
const DATABASE_URL = process.env.DATABASE_URL;
const API_SECRET_KEY = process.env.API_SECRET_KEY;

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Readiness check endpoint
app.get('/ready', (req, res) => {
  res.status(200).json({ status: 'ready' });
});

// Main endpoint — shows secret status (never exposes values)
app.get('/', (req, res) => {
  res.json({
    message: 'Hello from MyApp on EKS!',
    version: process.env.VERSION || '1.0.0',
    environment: process.env.ENVIRONMENT || 'unknown',
    secrets: {
      database: DATABASE_URL ? 'connected' : 'NOT CONFIGURED',
      apiKey: API_SECRET_KEY ? 'configured' : 'NOT CONFIGURED'
    }
  });
});

// Protected endpoint — requires API_SECRET_KEY from Secrets Manager
app.get('/api/data', (req, res) => {
  if (!API_SECRET_KEY) {
    return res.status(503).json({ error: 'API key not configured (External Secrets not synced)' });
  }

  const provided = req.headers['x-api-key'] || '';
  // Constant-time comparison prevents timing attacks
  const isValid = provided.length === API_SECRET_KEY.length &&
    crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(API_SECRET_KEY));

  if (!isValid) {
    return res.status(401).json({ error: 'Unauthorized - invalid API key' });
  }

  res.json({
    data: { users: 42, orders: 156 },
    source: 'secured-endpoint',
    authenticatedWith: 'External Secrets + AWS Secrets Manager'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Database: ${DATABASE_URL ? 'configured' : 'NOT SET'}`);
  console.log(`API Key: ${API_SECRET_KEY ? 'configured' : 'NOT SET'}`);
});
